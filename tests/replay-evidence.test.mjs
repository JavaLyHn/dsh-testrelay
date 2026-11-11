import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { apply } from '../index.js';
import { sanitizeRequest, sanitizeResponseBody } from '../host/executor.js';

async function host(t) {
  const root = await mkdtemp(join(tmpdir(), 'testbench-replay-'));
  const tools = [];
  let service, cleanup;
  apply({
    tools: { register(tool) { tools.push(tool); return () => {}; } },
    systemPrompt: { section: () => () => {} }, on: () => () => {},
    effect: (fn) => { cleanup = fn(); }, provide: (_key, instance) => { service = instance; },
    sessions: { get: () => ({ header: { cwd: root } }) },
    workspaceRegistry: { list: () => [{ id: 'w', sessionIds: ['s'] }] },
    credentials: { resolve: () => undefined },
  }, { dataFile: join(root, 'state.json') });
  await service.ready;
  t.after(async () => { await cleanup(); await rm(root, { recursive: true, force: true }); });
  return { service, tool: tools.find((item) => item.name === 'api_test_run') };
}

const request = { method: 'GET', url: 'items' };
const execution = { agent: { id: 's' }, callId: 'call', signal: new AbortController().signal };
const args = (check) => ({ title: 'Fixture test', cases: [{ name: 'item', request, checks: [check] }] });

test('snapshots preserve relative references, duplicate query values, and exact variable placeholders', () => {
  for (const url of ['items', '../items?q=x+y', '?page=2', '#view', '//other.example/a', '{{BASE}}/items?key={{ID}}']) {
    assert.equal(sanitizeRequest({ ...request, url }).url, url);
  }
  const url = 'items?api_key={{TOKEN}}&api_key=fixture&ok=x%20y';
  assert.equal(sanitizeRequest({ ...request, url }).url, 'items?api_key={{TOKEN}}&api_key=%5BREDACTED%5D&ok=x%20y');
});

test('malformed and truncated responses cannot display a configured sensitive field', () => {
  const sample = '{"privateNote":"SAMPLE-VALUE';
  for (const bodyTruncated of [false, true]) {
    const preview = sanitizeResponseBody(sample, 'application/json', { sensitiveFields: ['privateNote'], bodyTruncated });
    assert.doesNotMatch(preview.bodyPreview, /SAMPLE-VALUE/);
  }
});

test('a transport failure keeps definitions for replay, and leaves the Agent tool card immutable', async (t) => {
  const { service, tool } = await host(t);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('fixture offline'); });
  const check = { kind: 'status_equals', expected: 201, basis: 'user' };
  const result = await tool.execute(args(check), execution);
  const [entry] = result.cases;
  assert.equal(entry.status, 'send_failed');
  assert.deepEqual(entry.checks, [check]);
  globalThis.fetch.mock.mockImplementation(async () => new Response('{}', { status: 200 }));
  const command = (action, payload) => service.perform({ action, sessionId: 's', payload });
  const retry = await command('retryAttempt', { runId: result.runId, caseId: entry.caseId, requestId: 'retry', parentAttemptId: entry.attemptId, request });
  const stored = (await service.store.getRun('w', 's', result.runId)).cases[0];
  assert.equal(stored.attempts[1].id, retry.attemptId);
  assert.equal(stored.attempts[1].checks[0].state, 'failed');
  assert.equal(stored.attempts[1].checks[0].actual, 200);
  assert.equal((await command('runForCall', { callId: execution.callId })).run.cases[0].attemptId, entry.attemptId);
  assert.equal((await tool.execute(args(check), execution)).cases[0].status, 'send_failed');
  const rendered = tool.output.render({}, { runId: result.runId, cases: [{ ...entry, ...stored.attempts[1] }] })[0].text;
  for (const field of ['201', '200', 'user', 'failed']) assert.ok(rendered.includes(field), field);
});

test('replay drops prior observed values and an unavailable sensitive expectation stays indeterminate', async (t) => {
  const { service, tool } = await host(t);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ token: 'fixture-only' }));
  const check = { kind: 'json_equals', path: '$.token', expected: 'fixture-only', basis: 'project' };
  const first = await tool.execute(args(check), execution);
  const entry = first.cases[0];
  assert.equal(entry.checks[0].state, 'passed');
  assert.equal(entry.checks[0].expected, '[REDACTED]');
  await service.perform({ action: 'retryAttempt', sessionId: 's', payload: { runId: first.runId, caseId: entry.caseId, requestId: 'retry', request } });
  const actual = (await service.store.getRun('w', 's', first.runId)).cases[0].attempts.at(-1).checks[0];
  assert.equal(actual.state, 'indeterminate');
  assert.ok(!Object.hasOwn(actual, 'actual'));
  assert.ok(!tool.output.render({}, first)[0].text.includes('fixture-only'));
});

test('unsent requests retain editable templates, and replay never reuses a prior observation', async (t) => {
  const { service, tool } = await host(t);
  const check = { kind: 'json_exists', path: '$.count', basis: 'user' };
  const input = args(check);
  input.cases[0].request = { ...request, url: 'items/{{ITEM}}' };
  const first = await tool.execute(input, execution);
  const entry = first.cases[0];
  const read = async () => (await service.store.getRun('w', 's', first.runId)).cases[0].attempts;
  assert.equal(entry.status, 'not_sent');
  assert.equal((await read())[0].request.url, 'items/{{ITEM}}');
  t.mock.method(globalThis, 'fetch', async () => Response.json({ count: 3 }));
  const replay = (parent, requestId) => service.perform({ action: 'retryAttempt', sessionId: 's',
    payload: { runId: first.runId, caseId: entry.caseId, parentAttemptId: parent, requestId, request } });
  const successful = await replay(entry.attemptId, 'one');
  assert.equal((await read())[1].checks[0].actual, 3);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({}));
  await replay(successful.attemptId, 'two');
  const checked = (await read())[2].checks[0];
  assert.equal(checked.state, 'failed');
  assert.equal(checked.actualMissing, true);
  assert.ok(!Object.hasOwn(checked, 'actual'));
});

test('uncertain handoff waits for confirmation and keeps its original delivery ID across remounts', async (t) => {
  const { service, tool } = await host(t);
  t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  const result = await tool.execute(args({ kind: 'status_equals', expected: 200 }), execution);
  const submitted = [];
  service.ctx.sessionController = { prompt: async (envelope) => {
    submitted.push(envelope.requestId);
    if (submitted.length === 1) throw new Error('response channel closed');
    return { accepted: true };
  } };
  const send = (requestId, confirmUnknown = false) => service.perform({ action: 'sendToSession', sessionId: 's',
    payload: { runId: result.runId, text: 'Compare the two attempts.', requestId, confirmUnknown } });
  assert.equal((await send('original')).uncertain, true);
  assert.equal((await send('fresh-ui')).requestId, 'original');
  assert.deepEqual(submitted, ['original']);
  assert.equal((await send('fresh-ui', true)).accepted, true);
  assert.deepEqual(submitted, ['original', 'original']);
});

test('packed Session prompt admission rejections remain retryable with the original queue envelope', async (t) => {
  const { service, tool } = await host(t);
  t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  const run = await tool.execute(args({ kind: 'status_equals', expected: 200 }), execution);
  let accepted = false;
  service.ctx.sessionController = { async prompt(envelope, signal) {
    signal.throwIfAborted();
    assert.deepEqual(envelope, { requestId: 'send', sessionId: 's', mode: 'queue', content: [{ type: 'text', text: 'Compare the runs.' }] });
    if (!accepted) throw Object.assign(new Error('fixture recipient missing'), { isDSHRemoteError: true, code: 'session/not-found' });
    return { accepted: true };
  } };
  const send = () => service.perform({ action: 'sendToSession', sessionId: 's', payload: { runId: run.runId, requestId: 'send', text: 'Compare the runs.' } });
  const rejected = await send();
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.uncertain, undefined);
  assert.match(rejected.error, /session\/not-found/);
  accepted = true;
  assert.equal((await send()).accepted, true);
});
