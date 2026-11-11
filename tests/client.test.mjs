import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const clientSource = await readFile(new URL('../client.js', import.meta.url), 'utf8');

// The rc.1 Web loader exposes React and Zod. The remote-info Node subpath is
// private to the compiled client bundles and cannot be required by a plugin.
async function loadClient(timers = { setTimeout, clearTimeout }) {
  let registration;
  let contribution;
  let guide;
  const views = new Map();
  const effects = [];
  const dictionaries = {};
  const schema = { min() { return this; }, nonoptional() { return this; } };
  const z = { string: () => schema, json: () => schema, record: () => schema, strictObject: () => schema };
  const react = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const loader = { load: (entry) => { registration = entry; } };
  vm.runInNewContext(clientSource, { window: { __ModuleLoader__: loader }, console, AbortController, ...timers });
  const plugin = registration.factory((name) => {
    if (name === 'react') return react;
    if (name === 'zod') return { z };
    throw new Error(`Not in module table: ${name}`);
  });
  const ctx = {
    effect: (callback) => { const value = Promise.resolve(callback()); effects.push(value); return value; },
    inject: (names, callback) => {
      assert.deepEqual(Array.from(names), ['remote.apiTestbench']);
      const value = Promise.resolve(callback(ctx));
      value.dispose = async () => {};
      return value;
    },
    locale: { bind: () => key => dictionaries.en?.[key] ?? key, register: (_, lang, dict) => { dictionaries[lang] = dict; } },
    remote: { $mount: async (info) => { await Promise.resolve(); contribution = info; return () => {}; } },
    sidebarRightTabs: { register: (tab) => { guide = tab.guide; return () => {}; } },
    slots: { inject: (_, callback) => callback(), register: (slot, view) => { views.set(slot.name, view); return () => {}; } },
  };
  await plugin.apply(ctx);
  await Promise.all(effects);
  return { contribution, views, react, ctx, guide };
}

test('rc.1 web plugin mounts its typed session-scoped RPC and both views', async () => {
  const { contribution, views, guide } = await loadClient();
  const method = contribution?.methods?.['apiTestbench/perform'];
  assert.equal(method?.namespace, 'apiTestbench');
  assert.equal(method?.method, 'perform');
  assert.equal(method.parameters[0].wire, 'request');
  assert.equal(typeof method.input({ strict: true }).create, 'function');
  assert.ok(views.has('sidebar.right.pane.tab'));
  assert.ok(views.has('tool.call.toolview'));
  assert.equal(guide[0].title(), 'TestRelay API Testbench');
  assert.match(guide[0].description(), /manual API checks/);
});

// Exercise the registered slot component and its real callbacks without a
// desktop profile. State/effect slots use React's dependency and cleanup rules.
function mountView(react, component, props) {
  const slots = [];
  let cursor = 0;
  let pending = [];
  let dirty = true;
  let tree;
  react.useState = (init) => {
    const idx = cursor++;
    if (!(idx in slots)) slots[idx] = typeof init === 'function' ? init() : init;
    return [slots[idx], (update) => {
      const next = typeof update === 'function' ? update(slots[idx]) : update;
      if (!Object.is(next, slots[idx])) { slots[idx] = next; dirty = true; }
    }];
  };
  react.useRef = (initial) => { const idx = cursor++; return slots[idx] ??= { current: initial }; };
  react.useEffect = (cb, deps) => {
    const idx = cursor++;
    const old = slots[idx];
    if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
      pending.push(() => { old?.dispose?.(); slots[idx] = { deps, dispose: cb() }; });
    }
  };
  async function flush() {
    for (let i = 0; i < 25; i++) {
      if (dirty) {
        dirty = false; cursor = 0; pending = [];
        tree = component(props);
        for (const effect of pending) effect();
      }
      await new Promise((done) => setImmediate(done));
      if (!dirty) return tree;
    }
    throw new Error('Hook rendering did not settle');
  }
  return { flush, dispose: () => { for (const slot of slots) slot?.dispose?.(); } };
}

function flatten(tree) {
  if (tree == null || tree === false) return [];
  if (Array.isArray(tree)) return tree.flatMap(flatten);
  return [tree, ...(tree.children ?? []).flatMap(flatten)];
}

test('idle right pane discovers new runs and preserves edited handoff only for its source session', async () => {
  const scheduled = new Set();
  const timers = { setTimeout: (callback) => { scheduled.add(callback); return callback; }, clearTimeout: (id) => scheduled.delete(id) };
  const { views, react, ctx } = await loadClient(timers);
  let latest = null;
  ctx.remote.apiTestbench = { perform: async ({ action }) => ({ ok: true, value: action === 'snapshot' ? { run: latest, history: latest ? [latest] : [], events: [], cursor: latest ? 1 : 0 } : {} }) };
  const open = sessionId => {
    const shell = views.get('sidebar.right.pane.tab')({ sessionId });
    return mountView(react, shell.type, shell.props);
  };
  const run = { id: 'r1', title: 'Coupon', origin: 'agent', status: 'finished', cases: [], handoffs: [] };
  let pane = open('A');
  await pane.flush();
  assert.equal(scheduled.size, 1, 'empty panel keeps its discovery timer');
  latest = run;
  const [tick] = scheduled;
  scheduled.delete(tick);
  await tick();
  let tree = await pane.flush();
  const textarea = () => flatten(tree).find(node => node?.props?.id === 'atb-summary');
  assert.match(textarea().props.value, /Coupon/);
  textarea().props.onChange({ target: { value: 'reviewed for A only' } });
  await pane.flush();
  pane.dispose();
  pane = open('B');
  tree = await pane.flush();
  assert.doesNotMatch(textarea().props.value, /A only/);
  pane.dispose();
  pane = open('A');
  tree = await pane.flush();
  assert.equal(textarea().props.value, 'reviewed for A only');
  pane.dispose();
  assert.equal(scheduled.size, 0);
});

test('uncertain delivery requires explicit retry with the returned ID and original summary', async () => {
  const { ctx, views, react } = await loadClient();
  const sends = [];
  const run = { id: 'r2', title: 'Sample', origin: 'user', status: 'finished', cases: [], handoffs: [] };
  ctx.remote.apiTestbench = { perform: async ({ action, payload }) => {
    if (action === 'snapshot') return { ok: true, value: { run, history: [run], cursor: 2 } };
    if (action === 'sendToSession') {
      sends.push(payload);
      return { ok: true, value: payload.confirmUnknown ? { accepted: true } : { accepted: false, uncertain: true, requestId: 'original-send' } };
    }
    return { ok: true, value: {} };
  } };
  const shell = views.get('sidebar.right.pane.tab')({ sessionId: 'original' });
  const pane = mountView(react, shell.type, shell.props);
  try {
    let tree = await pane.flush();
    const button = label => flatten(tree).find(node => node.type === 'button' && node.children.includes(label));
    await button('Send summary to this chat').props.onClick();
    tree = await pane.flush();
    assert.equal(sends.length, 1);
    await button('Retry with original send ID').props.onClick();
    tree = await pane.flush();
    assert.equal(sends[1].requestId, 'original-send');
    assert.equal(sends[1].confirmUnknown, true);
    assert.equal(sends[1].text, sends[0].text);
    assert.ok(button('Send summary to this chat').props.disabled);
  } finally { pane.dispose(); }
});

test('rc.1 in-place update falls back only for an explicitly unsupported changes command', async () => {
  for (const [message, shouldFallback] of [['Unknown API Testbench action: changes', true], ['Access denied', false]]) {
    const timers = new Set();
    const { ctx, views, react } = await loadClient({ setTimeout: fn => (timers.add(fn), fn), clearTimeout: id => timers.delete(id) });
    const snapshots = [];
    let changes = 0;
    ctx.remote.apiTestbench = { perform: async ({ action, payload }) => {
      if (action === 'snapshot') { snapshots.push(payload); return { ok: true, value: { run: null, history: [], cursor: 4 } }; }
      if (action === 'changes') { changes++; return { ok: false, error: new Error(message) }; }
      return { ok: true, value: {} };
    } };
    const entry = views.get('sidebar.right.pane.tab')({ sessionId: 's' });
    const pane = mountView(react, entry.type, entry.props);
    await pane.flush();
    for (let i = 0; i < 2; i++) {
      const [tick] = timers; timers.delete(tick); await tick(); await pane.flush();
    }
    assert.equal(changes, shouldFallback ? 1 : 2);
    assert.deepEqual(snapshots.map(item => item.afterSeq), shouldFallback ? [0, 4, 4] : [0]);
    pane.dispose();
  }
});
