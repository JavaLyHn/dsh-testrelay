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
  vm.runInNewContext(clientSource, { window: { __ModuleLoader__: loader }, console, URL, AbortController, ...timers });
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

test('manual editor dispatches the edited JSON body and numeric expectation only after Send', async () => {
  const { views, ctx, react } = await loadClient({ setTimeout: () => 1, clearTimeout: () => {} });
  const sends = [];
  ctx.remote.apiTestbench = { perform: async ({ sessionId, action, payload }) => {
    if (action === 'runManual') {
      sends.push({ sessionId, payload });
      return { ok: true, value: { runId: 'manual-run' } };
    }
    if (action === 'listEnvironments') return { ok: true, value: { environments: [{ id: 'direct', name: 'Direct input' }] } };
    return { ok: true, value: { cases: [], history: [], run: null, cursor: 0 } };
  } };
  const shell = views.get('sidebar.right.pane.tab')({ sessionId: 'builder-session' });
  const pane = mountView(react, () => {
    const panel = flatten(shell.type(shell.props));
    const header = panel.find(node => node.type?.name === 'WorkbenchHeader');
    const manual = panel.find(node => node.type?.name === 'ManualWorkbench');
    if (!manual) return header.type(header.props);
    const editor = manual.type(manual.props);
    const body = flatten(editor).find(node => ['BodyEditor', 'AssertionsEditor'].includes(node.type?.name));
    return [editor, body && body.type(body.props)];
  });
  try {
    let nodes = flatten(await pane.flush());
    const get = predicate => {
      const found = nodes.find(predicate);
      assert.ok(found, 'expected editor control');
      return found.props;
    };
    const byLabel = label => get(node => node.props?.['aria-label'] === label);
    const named = (type, name) => get(node => node.type === type && node.children.includes(name));
    const change = async (control, value) => { control.onChange({ target: { value } }); nodes = flatten(await pane.flush()); };
    const click = async (control) => { assert.ok(!control.disabled); await control.onClick(); nodes = flatten(await pane.flush()); };
    await click(named('button', 'New request'));
    await change(byLabel('Method'), 'POST');
    await change(byLabel('URL or path'), 'http://fixture.test/quote');
    await click(named('button', 'Body'));
    await change(get(node => node.type === 'select' && node.children.some(child => child.props?.value === 'json')), 'json');
    await change(byLabel('JSON body'), '{');
    assert.equal(byLabel('Send').disabled, true);
    await change(byLabel('JSON body'), '{ "coupon": "EXPIRED_A" }');
    await click(named('button', 'Assertions'));
    await click(byLabel('Add assertion'));
    await change(byLabel('1 · Assertion type'), 'json_equals');
    const field = name => flatten(nodes.find(node => node.type === 'label' && flatten(node).includes(name))).find(node => node.type === 'input').props;
    await change(field('JSON path'), '$.discount');
    await change(field('Expected JSON value'), '0');
    assert.equal(sends.length, 0);
    await click(byLabel('Send'));
    assert.equal(sends.length, 1);
    const { sessionId, payload } = sends[0];
    assert.equal(sessionId, 'builder-session');
    assert.equal(payload.request.method, 'POST');
    assert.equal(payload.request.url, 'http://fixture.test/quote');
    assert.equal(payload.request.body.kind, 'json');
    assert.equal(payload.request.body.value.coupon, 'EXPIRED_A');
    assert.equal(payload.checks[0].kind, 'json_equals');
    assert.equal(payload.checks[0].path, '$.discount');
    assert.equal(payload.checks[0].expected, 0);
  } finally { pane.dispose(); }
});

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

test('result browser opens the failed request and keeps old attempts accessible without showing the retry editor', async () => {
  const scheduled = new Set();
  const { ctx, views, react } = await loadClient({ setTimeout: fn => (scheduled.add(fn), fn), clearTimeout: id => scheduled.delete(id) });
  function sample(id, status, actual) {
    const request = { method: 'POST', url: '/quote', body: { kind: 'json', value: { coupon: id } } };
    const checks = [{ kind: 'json_equals', path: '$.discount', expected: 0, actual, state: status, basis: 'user' }];
    return { id, name: id, status, request, checks, attempts: [{ id: id + '-1', origin: 'agent', request, checks, status, response: { status: 200, bodyPreview: JSON.stringify({ discount: actual }) } }] };
  }
  const first = sample('valid', 'passed', 0);
  const failed = sample('expired', 'failed', 10);
  failed.attempts[0].checks.unshift({ kind: 'status_equals', expected: 200, actual: 200, state: 'passed' });
  failed.attempts.push({ ...sample('other-coupon', 'failed', 12).attempts[0], parentAttemptId: 'expired-1', origin: 'user' });
  failed.attempts.push({ ...sample('corrected', 'passed', 0).attempts[0], parentAttemptId: 'expired-1', origin: 'user' });
  let run = { id: 'result', title: 'Coupons', status: 'finished', origin: 'agent', cases: [first, failed], handoffs: [] };
  ctx.remote.apiTestbench = { perform: async ({ action }) => ({ ok: true, value: action === 'snapshot' ? { run, history: [run], cursor: 1 } : {} }) };
  const shell = views.get('sidebar.right.pane.tab')({ sessionId: 's' });
  const pane = mountView(react, shell.type, shell.props);
  try {
    let tree = await pane.flush();
    const nodes = () => flatten(tree);
    const row = id => nodes().find(n => n?.props?.['data-case-id'] === id);
    const tab = name => nodes().find(n => n?.props?.role === 'tab' && n.props['data-tab'] === name);
    assert.equal(row('expired').props['aria-selected'], true);
    assert.equal(tab('checks').props['aria-selected'], true);
    const evidence = nodes().find(n => n.type?.name === 'AttemptView');
    const checksElement = evidence.type(evidence.props);
    const checksTree = checksElement.type(checksElement.props);
    assert.equal(flatten(checksTree).find(n => n?.props?.className === 'tr-check-row').props['data-status'], 'failed');
    const passedDetails = flatten(checksTree).find(n => n.type === 'details');
    assert.notEqual(passedDetails.props.open, true);
    assert.ok(flatten(passedDetails).includes('200'));
    assert.ok(!nodes().some(n => n.type === 'textarea' && n.props['aria-label'] === 'Request JSON'));
    const edit = nodes().find(n => n.type === 'button' && n.children.includes('Edit and retry'));
    edit.props.onClick();
    tree = await pane.flush();
    const editor = nodes().find(n => n.type === 'textarea' && n.props['aria-label'] === 'Request JSON');
    assert.equal(JSON.parse(editor.props.value).body.value.coupon, 'expired');
    assert.ok(nodes().filter(n => n.type === 'details').every(n => n.props.open !== true), 'history, delivery and metadata start collapsed');
    tab('attempts').props.onClick();
    tree = await pane.flush();
    assert.ok(nodes().some(n => n?.props?.['data-attempt-id'] === 'expired-1'));
    assert.ok(nodes().some(n => n?.props?.['data-attempt-id'] === 'corrected-1'));
    nodes().find(n => n?.props?.['data-attempt-id'] === 'corrected-1').props.onClick();
    tree = await pane.flush();
    assert.equal(tab('checks').props['aria-selected'], true);
    const selectedEvidence = nodes().find(n => n.type?.name === 'AttemptView');
    assert.equal(selectedEvidence.props.attempt.id, 'corrected-1');
    assert.ok(nodes().some(n => n.type === 'del' && n.children.includes('"expired"')));
    assert.ok(nodes().some(n => n.type === 'ins' && n.children.includes('"corrected"')));
    const checkView = selectedEvidence.type(selectedEvidence.props);
    const checkRows = flatten(checkView.type(checkView.props));
    assert.ok(checkRows.some(n => n?.props?.['data-status'] === 'passed'));
    assert.ok(checkRows.includes('0'));
    row('valid').props.onClick();
    tree = await pane.flush();
    assert.equal(row('valid').props['aria-selected'], true);
    assert.equal(tab('checks').props['aria-selected'], true);
    const live = sample('running', 'running', null);
    run = { ...run, status: 'running', cases: [...run.cases, live] };
    const [update] = scheduled; scheduled.delete(update); await update();
    tree = await pane.flush();
    assert.equal(row('valid').props['aria-selected'], true, 'later live events preserve an explicit case selection');
    const fresh = mountView(react, shell.type, shell.props);
    try {
      const liveTree = await fresh.flush();
      assert.equal(flatten(liveTree).find(node => node?.props?.['data-case-id'] === 'running').props['aria-selected'], true);
    } finally { fresh.dispose(); }
  } finally { pane.dispose(); }
});
