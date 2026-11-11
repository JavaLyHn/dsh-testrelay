import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { JsonStateStore } from '../host/store.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-store-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'state.json');
  return { file, store: await new JsonStateStore(file).initialize() };
}

test('independent Node hosts commit against fresh state and existing readers see every write', async (t) => {
  const { file, store } = await fixture(t);
  const worker = `
    import { JsonStateStore } from ${JSON.stringify(new URL('../host/store.js', import.meta.url).href)};
    const [file, id] = process.argv.slice(1);
    const store = await new JsonStateStore(file).initialize();
    process.stdout.write('ready\\n');
    for await (const _ of process.stdin) break;
    for (let i = 0; i < 8; i++) await store.addCase('w', {id:id+i, name:id+i});
  `;
  const children = Array.from({ length: 3 }, (_, i) => spawn(process.execPath, ['--input-type=module', '-e', worker, file, String(i)]));
  const finished = children.map((child) => new Promise((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr || 'worker exited ' + code)));
  }));
  t.after(() => children.forEach((child) => child.kill()));
  await Promise.all(children.map((child, i) => Promise.race([
    new Promise((resolve) => child.stdout.once('data', resolve)), finished[i],
  ])));
  for (const child of children) child.stdin.end('start\n');
  await Promise.all(finished);
  assert.equal((await store.listCases('w'))?.length, 24);
  assert.equal((await new JsonStateStore(file).initialize().then((other) => other.listCases('w'))).length, 24);
});

test('event cursors advance only through delivered pages across interleaved sessions', async (t) => {
  const { store } = await fixture(t);
  await store.mutateWorkspace('w', (_workspace, event) => {
    for (const sessionId of ['a', 'b', 'a', 'a', 'b']) event('run.created', { sessionId });
  });
  let cursor = 0;
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const page = await store.getEvents('w', 'a', cursor, 1);
    seen.push(...page.events.map((item) => item.seq));
    cursor = page.cursor;
  }
  assert.deepEqual(seen, [1, 3, 4]);
  assert.equal(cursor, 5);
});

function finishedRun() {
  const request = { method: 'POST', url: '/a' };
  return {
    id: 'r', sessionId: 's', status: 'finished', finishedAt: 'original-finish',
    cases: ['one', 'two'].map((id) => ({ id, request, status: 'failed', attempts: [{ id: id + '-initial', status: 'failed', request }] })),
  };
}

test('manual retries retain original outcome, definition and finish time and serialize in a run', async (t) => {
  const { store } = await fixture(t);
  const original = finishedRun();
  await store.createRun('w', original);
  const request = { method: 'POST', url: '/b' };
  const retry = (id, target) => store.beginRetry('w', 'r', target, { id, commandId: id, request, status: 'running' }, id, request, target + '-initial');
  await retry('again', 'one');
  assert.equal((await retry('again', 'one')).created, false);
  await assert.rejects(retry('different', 'two'), /finish|active|progress/i);
  await store.updateAttempt('w', 'r', 'one', 'again', { status: 'passed' });
  const run = await store.finishRun('w', 'r');
  assert.equal(run.finishedAt, original.finishedAt);
  assert.equal(run.status, 'finished');
  assert.deepEqual(run.cases[0].request, original.cases[0].request);
  assert.equal(run.cases[0].status, 'failed');
  assert.deepEqual(run.cases[0].attempts.map((attempt) => attempt.status), ['failed', 'passed']);
});

test('live hosts survive an overlapping initialization; abandoned handoffs recover as uncertain without replay', async (t) => {
  const { file } = await fixture(t);
  const live = await new JsonStateStore(file, { liveHost: true }).initialize();
  const run = finishedRun();
  run.status = 'running';
  delete run.finishedAt;
  await live.createRun('w', run);
  await live.mutateWorkspace('w', (workspace, event) => {
    workspace.runs[0].handoffs = [{ requestId: 'h', status: 'pending' }];
    event('handoff.started', { sessionId: 's', runId: 'r', requestId: 'h' });
  });
  const other = await new JsonStateStore(file).initialize();
  const concurrent = await other.getRun('w', 's', 'r');
  assert.equal(concurrent.status, 'running');
  assert.equal(concurrent.handoffs[0].status, 'pending');
  await live.close();
  const reopened = await new JsonStateStore(file).initialize();
  const recovered = await reopened.getRun('w', 's', 'r');
  assert.equal(recovered.status, 'interrupted');
  assert.equal(recovered.handoffs[0].status, 'unknown');
  const events = await reopened.getEvents('w', 's');
  assert.equal(events.events.filter((event) => event.type === 'handoff.unknown').length, 1);
  assert.equal(events.events.filter((event) => event.type === 'handoff.started').length, 1);
});

test('v0.1.1 retry history reopens with the recorded original case and first run completion', async (t) => {
  const { file, store } = await fixture(t);
  const original = finishedRun();
  await store.createRun('w', original);
  await store.mutateWorkspace('w', (workspace, event) => {
    const run = workspace.runs[0];
    event('run.finished', { runId: run.id, sessionId: 's', status: 'finished' });
    const request = { method: 'POST', url: '/b' };
    run.finishedAt = 'overwritten-finish';
    run.cases[0].request = request;
    run.cases[0].status = 'passed';
    run.cases[0].attempts.push({ id: 'replay', parentAttemptId: 'one-initial', request, status: 'passed' });
    event('run.finished', { runId: run.id, sessionId: 's', status: 'finished' });
  });
  const originalFinish = (await store.getEvents('w', 's')).events.find((event) => event.type === 'run.finished').time;
  const reopened = await new JsonStateStore(file).initialize();
  const run = await reopened.getRun('w', 's', 'r');
  assert.equal(run.finishedAt, originalFinish);
  assert.equal(run.cases[0].status, 'failed');
  assert.deepEqual(run.cases[0].request, original.cases[0].request);
  assert.equal(run.cases[0].attempts[1].status, 'passed');
});

test('the operating system releases the live-owner lease on a forced process exit', async (t) => {
  const { file } = await fixture(t);
  const worker = `
    import { JsonStateStore } from ${JSON.stringify(new URL('../host/store.js', import.meta.url).href)};
    const store = await new JsonStateStore(process.argv[1], {liveHost:true}).initialize();
    await store.createRun('w', { id:'crashed', sessionId:'s', status:'running', cases:[] });
    process.stdout.write('ready\\n');
    setInterval(() => {}, 60_000);
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', worker, file]);
  t.after(() => child.kill());
  const stopped = once(child, 'exit');
  const ready = await Promise.race([once(child.stdout, 'data').then(() => true), stopped.then(() => false)]);
  assert.ok(ready);
  const observer = await new JsonStateStore(file).initialize();
  assert.equal((await observer.getRun('w', 's', 'crashed')).status, 'running');
  child.kill('SIGKILL');
  await stopped;
  const recovered = await new JsonStateStore(file).initialize();
  assert.equal((await recovered.getRun('w', 's', 'crashed')).status, 'interrupted');
  const journal = await recovered.getEvents('w', 's');
  assert.deepEqual(journal.events.map((event) => event.type), ['run.created', 'run.interrupted']);
});
