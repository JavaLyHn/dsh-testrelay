import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { createQuoteFixture } from '../fixtures/quote-server/server.mjs';
import { apply as applyTestbench } from '../index.js';
import { evaluateChecks, executeHttp, sanitizeRequest, sanitizeResponseBody } from '../host/executor.js';
import { JsonStateStore, newId, nowIso } from '../host/store.js';

const delay = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
async function until(read, ready, label) {
  const deadline = Date.now() + 10000;
  do {
    const value = await read();
    if (ready(value)) return value;
    await delay(25);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for ${label}`);
}
const checks = (expectedDiscount) => [
  { kind: 'status_equals', expected: 200, basis: 'user' },
  { kind: 'json_equals', path: '$.discount', expected: expectedDiscount, basis: 'user' },
];
const quoteRequest = (baseUrl, coupon, extra = {}) => ({
  method: 'POST',
  url: `${baseUrl}/quote`,
  headers: [{ name: 'Content-Type', value: 'application/json' }],
  body: { kind: 'json', value: { coupon, ...extra } },
});

function createHostContext({ workspaceId, sessionId, root, additionalSessionIds = [], credentialValues = {} }) {
  const capture = { service: null, cleanup: null, prompts: [], promptResults: [], tools: [] };
  const ctx = {
    credentials: { resolve: async (ref) => Object.hasOwn(credentialValues, ref) ? { value: credentialValues[ref], source: 'test-provider' } : undefined },
    tools: { register: (tool) => { capture.tools.push(tool); return () => {}; } },
    systemPrompt: { section: () => () => {} },
    on: () => () => {},
    effect(callback) { capture.cleanup = callback(); return () => capture.cleanup?.(); },
    workspaceRegistry: { list: () => [{ id: workspaceId, title: 'Local fixture', path: root, sessionIds: [sessionId, ...additionalSessionIds] }] },
    sessions: { get: (id) => id === sessionId ? { header: { cwd: root } } : undefined },
    sessionController: { prompt: async (request) => { capture.prompts.push(request); return capture.promptResults.shift() ?? { accepted: true }; } },
    provide(name, service) { if (name === 'apiTestbench') capture.service = service; return () => {}; },
  };
  applyTestbench(ctx, { dataFile: join(root, 'state.json') });
  return capture;
}

test('local quote fixture: durable waiting state, real HTTP, assertions, and redaction', async (t) => {
  const fixture = await createQuoteFixture({ port: 0, log: () => {} });
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-api-testbench-')));
  let host;
  let initialController;
  let retryController;
  let initialTask;
  let retryTask;
  t.after(async () => {
    initialController?.abort();
    retryController?.abort();
    await Promise.allSettled([initialTask, retryTask].filter(Boolean));
    await host?.cleanup?.();
    await fixture.close();
    const safeTempRoot = resolve(tmpdir());
    if (!root.startsWith(safeTempRoot + '\\') && root !== safeTempRoot) throw new Error(`Refusing to remove unexpected test path: ${root}`);
    await rm(root, { recursive: true, force: true });
  });

  const workspaceId = 'workspace-testbench-local';
  const sessionId = 'session-integration';
  const callId = 'tool-call-integration';
  host = createHostContext({ workspaceId, sessionId, root, additionalSessionIds: ['session-neighbor'], credentialValues: { FIXTURE_API_TOKEN: 'fixture-secret-manual' } });
  const service = host.service;
  assert.ok(service, 'the Host plugin provides the API Testbench service');
  await service.ready;
  assert.deepEqual(host.tools.map((tool) => tool.name).sort(), ['api_test_list_cases', 'api_test_run']);
  assert.equal(host.tools.some((tool) => JSON.stringify(tool).includes('retryAttempt') || JSON.stringify(tool).includes('sendToSession')), false, 'user-only retry and handoff actions are not exposed as Agent tools');
  await service.ensureWorkspace(workspaceId);
  await service.store.upsertEnvironment(workspaceId, {
    id: 'local', name: 'Local fixture', baseUrl: fixture.url, variables: {}, credentialRefs: {}, sensitiveFields: ['internalNote'],
  });

  initialController = new AbortController();
  const runTool = host.tools.find((tool) => tool.name === 'api_test_run');
  assert.ok(runTool, 'the registered Agent Tool is available to this test');
  const runArgs = {
    title: 'Coupon assertions', environmentId: 'local',
    cases: [
      { name: 'Expired coupon should not discount', purpose: 'EXPIRED_A should be zero', request: quoteRequest(fixture.url, 'EXPIRED_A', { internalNote: 'fixture-secret-a' }), checks: checks(0) },
      { name: 'VALID10 should discount 10', request: quoteRequest(fixture.url, 'VALID10'), checks: checks(10) },
    ],
  };
  initialTask = runTool.execute(runArgs, { agent: { id: sessionId }, callId, rootCallId: callId, signal: initialController.signal }).then((value) => ({ value }), (error) => ({ error }));
  await until(() => fixture.requests(), (items) => items.length === 1, 'the first HTTP request to arrive');
  const pending = await service.store.findRunForCall(workspaceId, sessionId, callId);
  assert.ok(pending, 'the run is persisted before the delayed response');
  assert.equal(pending.status, 'running');
  assert.equal(pending.cases[0].attempts[0].status, 'running');
  assert.equal(pending.cases[0].request.body.value.internalNote, '[REDACTED]', 'custom-sensitive request fields are redacted before the run is persisted');
  assert.equal(pending.cases[0].attempts[0].request.body.value.internalNote, '[REDACTED]');
  assert.equal(fixture.requests().length, 1, 'the fixture records the request before its delayed response');
  const eventPage = await service.store.getEvents(workspaceId, sessionId, 0);
  assert.deepEqual(eventPage.events.map((item) => item.type).slice(0, 2), ['run.created', 'attempt.started']);

  const initialOutcome = await initialTask;
  if (initialOutcome.error) throw initialOutcome.error;
  assert.equal(initialOutcome.value.runId, pending.id);
  const afterA = await service.store.getRun(workspaceId, sessionId, pending.id);
  assert.equal(afterA.cases[0].attempts[0].response.status, 200);
  assert.equal(afterA.cases[0].attempts[0].checks[0].state, 'passed');
  assert.equal(afterA.cases[0].attempts[0].checks[1].state, 'failed');
  assert.equal(afterA.cases[0].attempts[0].checks[1].actual, 10);
  assert.equal(afterA.cases.length, 2);
  assert.equal(afterA.cases[1].attempts[0].request.body.value.coupon, 'VALID10');
  assert.equal(afterA.cases[1].attempts[0].checks[1].state, 'passed');
  assert.equal(afterA.cases[1].attempts[0].checks[1].actual, 10);
  assert.equal(afterA.status, 'finished');

  const requestB = quoteRequest(fixture.url, 'EXPIRED_B', { internalNote: 'fixture-secret-b' });
  retryController = new AbortController();
  retryTask = service.perform({ sessionId, action: 'retryAttempt', payload: { runId: pending.id, caseId: afterA.cases[0].id, requestId: 'coupon-retry-1', request: requestB } }, retryController.signal).then((value) => ({ value }), (error) => ({ error }));
  const afterRetryDispatch = await until(() => service.store.getRun(workspaceId, sessionId, pending.id), (run) => run?.cases[0]?.attempts.length === 2, 'the manual retry to be recorded');
  assert.equal(afterRetryDispatch.cases[0].attempts.length, 2, 'a retry appends a second attempt rather than replacing the first');
  assert.equal(afterRetryDispatch.cases[0].attempts[1].parentAttemptId, afterRetryDispatch.cases[0].attempts[0].id);
  assert.equal(afterRetryDispatch.cases[0].attempts[1].request.body.value.coupon, 'EXPIRED_B');
  assert.equal(afterRetryDispatch.cases[0].attempts[1].request.body.value.internalNote, '[REDACTED]');

  const retryOutcome = await retryTask;
  if (retryOutcome.error) throw retryOutcome.error;
  assert.equal(retryOutcome.value.duplicate, false);
  assert.equal(retryOutcome.value.run.status, 'finished');
  const duplicate = await service.perform({ sessionId, action: 'retryAttempt', payload: { runId: pending.id, caseId: afterA.cases[0].id, requestId: 'coupon-retry-1', request: requestB } });
  assert.equal(duplicate.duplicate, true, 'repeating the same UI action ID does not resend the HTTP request');
  await assert.rejects(service.perform({ sessionId, action: 'retryAttempt', payload: { runId: pending.id, caseId: afterA.cases[0].id, requestId: 'coupon-retry-1', request: quoteRequest(fixture.url, 'EXPIRED_A') } }), /different request/);
  const redactedRequest = { ...requestB, headers: [...requestB.headers, { name: 'Authorization', value: '[REDACTED]' }] };
  await assert.rejects(service.perform({ sessionId, action: 'retryAttempt', payload: { runId: pending.id, caseId: afterA.cases[0].id, requestId: 'redacted-retry-1', request: redactedRequest } }), /Replace redacted secret values/);

  const replayFromA = await service.perform({
    sessionId,
    action: 'retryAttempt',
    payload: {
      runId: pending.id,
      caseId: afterA.cases[0].id,
      parentAttemptId: afterA.cases[0].attempts[0].id,
      requestId: 'coupon-replay-from-first-a',
      request: quoteRequest(fixture.url, 'EXPIRED_A', { internalNote: 'fixture-secret-replay' }),
    },
  });
  assert.equal(replayFromA.duplicate, false);
  const counts = await fetch(`${fixture.url}/__counts`).then((response) => response.json());
  assert.deepEqual(counts.counts, { EXPIRED_A: 2, VALID10: 1, EXPIRED_B: 1 });
  assert.equal(counts.total, 4);
  const finalRun = await service.store.getRun(workspaceId, sessionId, pending.id);
  assert.equal(finalRun.cases[0].attempts.length, 3);
  assert.equal(finalRun.cases[0].attempts[2].parentAttemptId, finalRun.cases[0].attempts[0].id, 'the third attempt can replay from the original A even after B exists');
  assert.equal(finalRun.cases[0].attempts[2].checks[1].actual, 10);
  assert.equal(finalRun.cases[0].attempts[0].response.status, 200);
  assert.equal(finalRun.cases[0].attempts[0].checks[1].state, 'failed');
  assert.equal(finalRun.cases[0].attempts[1].parentAttemptId, finalRun.cases[0].attempts[0].id);
  assert.equal(finalRun.cases[0].attempts[1].request.body.value.coupon, 'EXPIRED_B');
  assert.equal(finalRun.cases[0].request.body.value.internalNote, '[REDACTED]');
  assert.equal(finalRun.cases[0].attempts[0].request.body.value.internalNote, '[REDACTED]');
  assert.equal(finalRun.cases[0].attempts[1].request.body.value.internalNote, '[REDACTED]');
  assert.equal(finalRun.cases[0].attempts[1].origin, 'user');
  assert.equal(finalRun.cases[0].attempts[1].checks[1].state, 'passed');
  assert.equal(finalRun.cases[0].attempts[1].checks[1].actual, 0);
  assert.equal(finalRun.cases[1].attempts[0].request.body.value.coupon, 'VALID10');
  assert.equal(finalRun.cases[1].attempts[0].checks[1].state, 'passed');
  assert.equal(finalRun.cases[1].attempts[0].checks[1].actual, 10);
  assert.equal(finalRun.status, 'finished');
  assert.equal(finalRun.finishedAt, afterA.finishedAt, 'manual attempts preserve the original run completion time');
  assert.equal(finalRun.cases[0].request.body.value.coupon, 'EXPIRED_A');
  assert.equal(finalRun.cases[0].status, 'failed');
  const finalEvents = await service.store.getEvents(workspaceId, sessionId, 0);
  assert.deepEqual(finalEvents.events.map((item) => item.type), [
    'run.created', 'attempt.started', 'attempt.finished', 'attempt.started', 'attempt.finished', 'run.finished', 'attempt.started', 'attempt.finished', 'attempt.started', 'attempt.finished',
  ]);

  const environmentResult = await service.perform({
    sessionId,
    action: 'saveEnvironment',
    payload: { id: 'manual-env-idempotent', name: 'Manual fixture', baseUrl: `${fixture.url}/?tenant=fixture-secret-tenant`, variables: { COUPON: 'EXPIRED_A' }, credentialRefs: { API_TOKEN: 'FIXTURE_API_TOKEN' }, sensitiveFields: ['tenant', 'internalNote'] },
  });
  const manualEnvironment = environmentResult.environment;
  assert.ok(manualEnvironment.id);
  assert.equal(manualEnvironment.variables.COUPON, 'EXPIRED_A');
  const repeatedEnvironmentSave = await service.perform({
    sessionId, action: 'saveEnvironment',
    payload: { id: 'manual-env-idempotent', name: 'Manual fixture', baseUrl: `${fixture.url}/?tenant=fixture-secret-tenant`, variables: { COUPON: 'EXPIRED_A' }, credentialRefs: { API_TOKEN: 'FIXTURE_API_TOKEN' }, sensitiveFields: ['tenant', 'internalNote'] },
  });
  assert.equal(repeatedEnvironmentSave.environment.id, manualEnvironment.id);
  const listedEnvironments = await service.perform({ sessionId, action: 'listEnvironments', payload: {} });
  assert.ok(listedEnvironments.environments.some((item) => item.id === manualEnvironment.id));
  const manualRequest = {
    method: 'POST', url: '/quote',
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Authorization', value: 'Bearer {{API_TOKEN}}' },
    ],
    body: { kind: 'json', value: { coupon: '{{COUPON}}' } },
  };
  const savedCaseResult = await service.perform({
    sessionId,
    action: 'saveCase',
    payload: { id: 'manual-case-idempotent', name: 'Manual expired coupon', purpose: 'Check EXPIRED_A discount', environmentId: manualEnvironment.id, request: manualRequest, checks: checks(0) },
  });
  const savedManualCase = savedCaseResult.case;
  assert.ok(savedManualCase.id);
  assert.equal(savedManualCase.request.headers[1].value, 'Bearer {{API_TOKEN}}', 'credential-reference templates remain replayable in a saved case');
  const repeatedCaseSave = await service.perform({
    sessionId, action: 'saveCase',
    payload: { id: 'manual-case-idempotent', name: 'Manual expired coupon', purpose: 'Check EXPIRED_A discount', environmentId: manualEnvironment.id, request: manualRequest, checks: checks(0) },
  });
  assert.equal(repeatedCaseSave.case.id, savedManualCase.id);
  await assert.rejects(service.perform({
    sessionId,
    action: 'saveCase',
    payload: { name: 'Sensitive assertion must not corrupt', environmentId: manualEnvironment.id, request: manualRequest, checks: [{ kind: 'json_equals', path: '$.internalNote', expected: 'private', basis: 'user' }] },
  }), /cannot be saved without changing its meaning/);
  const listedCases = await service.perform({ sessionId, action: 'listCases', payload: { limit: 200 } });
  assert.ok(listedCases.cases.some((item) => item.id === savedManualCase.id));
  const listCasesTool = host.tools.find((tool) => tool.name === 'api_test_list_cases');
  const agentSavedCases = await listCasesTool.execute({}, { agent: { id: sessionId } });
  assert.ok(agentSavedCases.cases.some((item) => item.id === savedManualCase.id), 'manually saved cases are also available to the Agent list tool');
  assert.doesNotMatch(JSON.stringify(agentSavedCases), /fixture-secret-manual|fixture-secret-tenant/);
  const manualInput = {
    requestId: 'manual-coupon-run-1', title: 'Manual coupon scenario', name: savedManualCase.name, purpose: savedManualCase.purpose,
    environmentId: manualEnvironment.id, savedCaseId: savedManualCase.id, request: manualRequest, checks: checks(0),
  };
  const manualStart = await service.perform({ sessionId, action: 'runManual', payload: manualInput });
  assert.equal(manualStart.duplicate, false);
  assert.ok(manualStart.runId && manualStart.caseId && manualStart.attemptId);
  const manualPending = await service.store.getRun(workspaceId, sessionId, manualStart.runId);
  assert.equal(manualPending.origin, 'user');
  assert.equal(manualPending.status, 'running', 'manual runs return after the initial attempt is persisted while HTTP is pending');
  assert.equal(manualPending.cases[0].attempts[0].status, 'running');
  assert.equal(manualPending.cases[0].attempts[0].request.url, '/quote');
  assert.deepEqual(manualPending.cases[0].attempts[0].environmentSnapshot.variableNames, ['COUPON']);
  assert.deepEqual(manualPending.cases[0].attempts[0].environmentSnapshot.credentialVariableNames, ['API_TOKEN']);
  assert.equal(Object.hasOwn(manualPending.cases[0].attempts[0].environmentSnapshot, 'variables'), false);
  assert.equal(Object.hasOwn(manualPending.cases[0].attempts[0].environmentSnapshot, 'credentialRefs'), false);
  assert.match(manualPending.cases[0].attempts[0].environmentSnapshot.baseUrl, /tenant=%5BREDACTED%5D/);
  assert.equal(manualPending.cases[0].attempts[0].request.headers[1].value, 'Bearer {{API_TOKEN}}');
  assert.doesNotMatch(JSON.stringify(manualPending), /fixture-secret-manual|fixture-secret-tenant/);
  let manualCompleted;
  for (let attempt = 0; attempt < 120; attempt++) {
    manualCompleted = await service.store.getRun(workspaceId, sessionId, manualStart.runId);
    if (manualCompleted.status !== 'running') break;
    await delay(50);
  }
  assert.equal(manualCompleted.status, 'finished');
  assert.equal(manualCompleted.cases[0].attempts[0].response.status, 200);
  assert.equal(manualCompleted.cases[0].attempts[0].checks[1].state, 'failed');
  assert.equal(manualCompleted.cases[0].attempts[0].checks[1].actual, 10);
  const manualDuplicate = await service.perform({ sessionId, action: 'runManual', payload: manualInput });
  assert.equal(manualDuplicate.duplicate, true);
  assert.equal(manualDuplicate.runId, manualStart.runId);
  await assert.rejects(service.perform({ sessionId, action: 'runManual', payload: { ...manualInput, title: 'changed request' } }), /different request/);
  const countBeforeEnvironmentConfirmation = fixture.requests().length;
  await service.perform({
    sessionId,
    action: 'saveEnvironment',
    payload: { id: manualEnvironment.id, name: 'Manual fixture', baseUrl: fixture.url, variables: { COUPON: 'EXPIRED_B' }, credentialRefs: { API_TOKEN: 'FIXTURE_API_TOKEN' }, sensitiveFields: ['internalNote'] },
  });
  const environmentConfirmation = await service.perform({
    sessionId,
    action: 'retryAttempt',
    payload: { runId: manualStart.runId, caseId: manualStart.caseId, parentAttemptId: manualStart.attemptId, requestId: 'manual-replay-confirm-1', request: manualRequest },
  });
  assert.equal(environmentConfirmation.confirmationRequired, true);
  assert.equal(environmentConfirmation.environmentChanged, true);
  assert.doesNotMatch(JSON.stringify(environmentConfirmation), /fixture-secret-tenant/);
  assert.equal(fixture.requests().length, countBeforeEnvironmentConfirmation, 'a changed environment is never used until the user confirms');
  await service.perform({
    sessionId,
    action: 'saveEnvironment',
    payload: { id: manualEnvironment.id, name: 'Manual fixture updated again', baseUrl: fixture.url, variables: { COUPON: 'EXPIRED_B' }, credentialRefs: { API_TOKEN: 'FIXTURE_API_TOKEN' }, sensitiveFields: ['internalNote'] },
  });
  const staleConfirmation = await service.perform({
    sessionId,
    action: 'retryAttempt',
    payload: {
      runId: manualStart.runId, caseId: manualStart.caseId, parentAttemptId: manualStart.attemptId,
      requestId: 'manual-replay-confirm-1', request: manualRequest, confirmEnvironmentChange: true,
      confirmedEnvironmentStamp: environmentConfirmation.environmentStamp,
    },
  });
  assert.equal(staleConfirmation.confirmationRequired, true, 'confirmation is invalidated if the environment changes after the prompt');
  assert.equal(fixture.requests().length, countBeforeEnvironmentConfirmation);
  const confirmedReplay = await service.perform({
    sessionId,
    action: 'retryAttempt',
    payload: {
      runId: manualStart.runId, caseId: manualStart.caseId, parentAttemptId: manualStart.attemptId,
      requestId: 'manual-replay-confirm-1', request: manualRequest, confirmEnvironmentChange: true,
      confirmedEnvironmentStamp: staleConfirmation.environmentStamp,
    },
  });
  assert.ok(confirmedReplay.attemptId);
  const manualAfterReplay = await service.store.getRun(workspaceId, sessionId, manualStart.runId);
  const confirmedAttempt = manualAfterReplay.cases[0].attempts.at(-1);
  assert.equal(confirmedAttempt.parentAttemptId, manualStart.attemptId);
  assert.equal(confirmedAttempt.checks[1].state, 'passed');
  assert.equal(confirmedAttempt.response.status, 200);
  const renamedManualCase = await service.perform({
    sessionId,
    action: 'saveCase',
    payload: { id: savedManualCase.id, name: 'Renamed manual case', purpose: savedManualCase.purpose, environmentId: manualEnvironment.id, request: manualRequest, checks: checks(0) },
  });
  assert.equal(renamedManualCase.case.id, savedManualCase.id);
  assert.equal(renamedManualCase.case.name, 'Renamed manual case');

  const handoffText = [
    'Coupon retry comparison',
    '- EXPIRED_A failed: HTTP 200, expected discount 0, actual 10.',
    '- Request change: coupon EXPIRED_A → EXPIRED_B.',
    '- EXPIRED_B passed: HTTP 200, expected discount 0, actual 0.',
  ].join('\n');
  const handoffRequestId = 'handoff-ui-1';
  const handoff = await service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: handoffRequestId, text: handoffText } });
  assert.equal(handoff.accepted, true);
  assert.equal(handoff.requestId, handoffRequestId);
  assert.equal(host.prompts.length, 1, 'the comparison is sent to the originating session');
  assert.deepEqual(host.prompts[0], {
    requestId: handoffRequestId,
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text: handoffText }],
  });
  const duplicateHandoff = await service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: handoffRequestId, text: handoffText } });
  assert.equal(duplicateHandoff.accepted, true);
  assert.equal(duplicateHandoff.duplicate, true, 'repeating a sent handoff does not enqueue a duplicate prompt');
  const duplicateAfterRemount = await service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: 'handoff-after-remount', text: handoffText } });
  assert.equal(duplicateAfterRemount.duplicate, true, 'the same accepted summary is deduplicated even after the Client creates a fresh action ID');
  assert.equal(host.prompts.length, 1);

  const rejectedRequestId = 'handoff-retryable-1';
  const retryableHandoffText = `${handoffText}\nRetryable handoff`;
  host.promptResults.push({ accepted: false });
  const rejected = await service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: rejectedRequestId, text: retryableHandoffText } });
  assert.equal(rejected.accepted, false, 'a prompt controller rejection is not recorded as accepted');
  const afterRejectedHandoff = await service.store.getRun(workspaceId, sessionId, finalRun.id);
  assert.equal(afterRejectedHandoff.handoffs.find((item) => item.requestId === rejectedRequestId)?.status, 'rejected');
  host.promptResults.push({ accepted: true });
  const retriedHandoff = await service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: rejectedRequestId, text: retryableHandoffText } });
  assert.equal(retriedHandoff.accepted, true, 'the same rejected request ID can be retried');
  const duplicateRetriedHandoff = await service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: rejectedRequestId, text: retryableHandoffText } });
  assert.equal(duplicateRetriedHandoff.duplicate, true);
  await assert.rejects(service.perform({ sessionId, action: 'sendToSession', payload: { runId: finalRun.id, requestId: rejectedRequestId, text: `${handoffText}\nEdited after send` } }), /different summary text/);
  assert.equal(host.prompts.length, 3, 'only the rejection and successful retry add prompt calls');
  const afterHandoff = await service.store.getRun(workspaceId, sessionId, finalRun.id);
  assert.equal(afterHandoff.handoffs.length, 2);
  assert.deepEqual(afterHandoff.handoffs.map((item) => item.requestId).sort(), [handoffRequestId, rejectedRequestId].sort());
  assert.ok(afterHandoff.handoffs.every((item) => item.status === 'accepted'));
  const visibleHandoffSnapshot = await service.perform({ sessionId, action: 'snapshot', payload: { runId: finalRun.id, afterSeq: 0 } });
  assert.ok(visibleHandoffSnapshot.run.handoffs.every((item) => item.status === 'accepted'), 'handoff status survives a Client remount via the run snapshot');

  const typedValues = [];
  for (const variant of ['number', 'string', 'null', 'missing']) {
    const result = await executeHttp({ method: 'GET', url: `${fixture.url}/value/${variant}`, body: { kind: 'none' } }, { id: 'local', name: 'Local', baseUrl: fixture.url, variables: {}, credentialRefs: {} }, { resolve: async () => undefined }, { checks: [{ kind: 'json_equals', path: '$.value', expected: 0, basis: 'user' }] });
    typedValues.push(result.checks[0]);
  }
  assert.equal(typedValues[0].state, 'passed');
  assert.equal(typedValues[1].state, 'failed');
  assert.equal(typedValues[2].state, 'failed');
  assert.equal(typedValues[2].actual, null);
  assert.equal(typedValues[3].state, 'failed');
  assert.equal(typedValues[3].actualMissing, true);
  const invalidJsonBody = sanitizeResponseBody('<html>not JSON</html>', 'text/html');
  assert.equal(invalidJsonBody.jsonError, 'Response body is not valid JSON.');
  const nonJsonCheck = evaluateChecks(checks(0), { status: 200, json: invalidJsonBody.json, jsonError: invalidJsonBody.jsonError });
  assert.equal(nonJsonCheck[0].state, 'passed');
  assert.equal(nonJsonCheck[1].state, 'indeterminate', 'JSON assertions over a non-JSON body cannot be treated as missing fields');
  assert.match(nonJsonCheck[1].reason, /not valid JSON/);

  const safeRequest = sanitizeRequest({ method: 'GET', url: '/health?api_key=fixture-secret&ok=1', headers: [{ name: 'Authorization', value: 'Bearer fixture-secret' }], body: { kind: 'none' } });
  assert.match(safeRequest.url, /api_key=%5BREDACTED%5D/);
  assert.equal(safeRequest.headers[0].value, '[REDACTED]');
  const referenceRequest = {
    method: 'POST', url: '/private?api_key={{API_TOKEN}}',
    headers: [{ name: 'Authorization', value: 'Bearer {{API_TOKEN}}' }],
    body: { kind: 'json', value: { token: '{{API_TOKEN}}' } },
  };
  const safeReferenceRequest = sanitizeRequest(referenceRequest);
  assert.equal(safeReferenceRequest.url, '/private?api_key={{API_TOKEN}}');
  assert.equal(safeReferenceRequest.headers[0].value, 'Bearer {{API_TOKEN}}');
  assert.equal(safeReferenceRequest.body.value.token, '{{API_TOKEN}}');
  let resolvedUrl = '';
  let resolvedHeader = '';
  const resolvedReference = await executeHttp(referenceRequest, { id: 'ref-test', name: 'Reference test', baseUrl: 'https://api.example.test', variables: {}, credentialRefs: { API_TOKEN: 'FIXTURE_API_TOKEN' } }, { resolve: async () => ({ value: 'fixture-secret-token', source: 'test-provider' }) }, {
    fetchImpl: async (url, init) => {
      resolvedUrl = url;
      resolvedHeader = init.headers.get('authorization');
      return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
    },
    checks: [{ kind: 'json_equals', path: '$.ok', expected: true, basis: 'user' }],
  });
  assert.match(resolvedUrl, /api_key=fixture-secret-token/);
  assert.equal(resolvedHeader, 'Bearer fixture-secret-token');
  assert.doesNotMatch(JSON.stringify(resolvedReference), /fixture-secret-token/);
  const safeBody = sanitizeResponseBody('{"apiKey":"fixture-secret","discount":0}', 'application/json');
  assert.match(safeBody.bodyPreview, /\[REDACTED\]/);
  assert.match(safeBody.bodyPreview, /"discount": 0/);

  const cancelRunId = newId('run');
  const cancelCaseId = newId('case');
  const cancelAttemptId = newId('attempt');
  await service.store.createRun(workspaceId, {
    id: cancelRunId, workspaceId, sessionId, origin: 'user', title: 'Cancellation ownership', status: 'running', createdAt: nowIso(),
    cases: [{ id: cancelCaseId, name: 'active', status: 'running', attempts: [] }],
  });
  await service.store.addAttempt(workspaceId, cancelRunId, cancelCaseId, { id: cancelAttemptId, status: 'running', startedAt: nowIso() }, 'cancel-test');
  const cancelController = new AbortController();
  service.activeControllers.set(cancelAttemptId, cancelController);
  const neighborCancel = await service.perform({ sessionId: 'session-neighbor', action: 'cancelAttempt', payload: { attemptId: cancelAttemptId } });
  assert.equal(neighborCancel.cancelled, false, 'a different session in the same workspace cannot cancel this attempt');
  assert.equal(neighborCancel.reason, 'not-found');
  assert.equal(cancelController.signal.aborted, false);
  const ownerCancel = await service.perform({ sessionId, action: 'cancelAttempt', payload: { attemptId: cancelAttemptId } });
  assert.equal(ownerCancel.cancelled, true);
  assert.equal(cancelController.signal.aborted, true);
  service.activeControllers.delete(cancelAttemptId);
});

test('executor handles credentials, missing inputs, no assertions, timeouts, cancellation, and body limits', async () => {
  const environment = { id: 'test', name: 'Test', baseUrl: 'https://api.example.test', variables: {}, credentialRefs: {} };
  const noAssertions = await executeHttp(
    { method: 'GET', url: '/health' }, environment, { resolve: async () => undefined },
    { fetchImpl: async () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }) },
  );
  assert.equal(noAssertions.result, 'received');
  assert.deepEqual(noAssertions.checks, []);

  let sent = false;
  const missingVariable = await executeHttp(
    { method: 'GET', url: '/health?token={{UNSET}}' }, environment, { resolve: async () => undefined },
    { fetchImpl: async () => { sent = true; throw new Error('must not send'); } },
  );
  assert.equal(missingVariable.transport, 'not_sent');
  assert.match(missingVariable.error.message, /Missing environment variable/);
  assert.equal(sent, false);
  const missingCredential = await executeHttp(
    { method: 'GET', url: '/health', headers: [{ name: 'Authorization', value: 'Bearer {{API_TOKEN}}' }] },
    { ...environment, credentialRefs: { API_TOKEN: 'UNCONFIGURED_API_TOKEN' } },
    { resolve: async () => undefined },
    { fetchImpl: async () => { sent = true; throw new Error('must not send'); } },
  );
  assert.equal(missingCredential.transport, 'not_sent');
  assert.equal(sent, false);

  let observedAuthorization = '';
  const credentialResult = await executeHttp(
    { method: 'GET', url: '/private', headers: [{ name: 'Authorization', value: 'Bearer {{API_TOKEN}}' }] },
    { ...environment, credentialRefs: { API_TOKEN: 'FIXTURE_API_TOKEN' } },
    { resolve: async (ref) => ref === 'FIXTURE_API_TOKEN' ? { value: 'fixture-secret-token', source: 'test-provider' } : undefined },
    {
      checks: [{ kind: 'json_equals', path: '$.ok', expected: true, basis: 'user' }],
      fetchImpl: async (_url, init) => {
        observedAuthorization = init.headers.get('authorization');
        return new Response('{"apiToken":"fixture-secret-token","ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    },
  );
  assert.equal(observedAuthorization, 'Bearer fixture-secret-token', 'credential refs are resolved for the outgoing request');
  assert.equal(credentialResult.checks[0].state, 'passed');
  assert.equal(credentialResult.request.headers[0].value, 'Bearer {{API_TOKEN}}', 'stored requests retain only the credential reference, never the resolved secret');
  assert.doesNotMatch(JSON.stringify(credentialResult), /fixture-secret-token/);

  const slowFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error('aborted'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
  const timedOut = await executeHttp({ method: 'GET', url: '/slow' }, environment, undefined, { timeoutMs: 20, fetchImpl: slowFetch });
  assert.equal(timedOut.transport, 'timed_out');
  const abortController = new AbortController();
  const cancelledTask = executeHttp({ method: 'GET', url: '/slow' }, environment, undefined, { signal: abortController.signal, timeoutMs: 1000, fetchImpl: slowFetch });
  setTimeout(() => abortController.abort(new Error('test cancellation')), 20);
  const cancelled = await cancelledTask;
  assert.equal(cancelled.transport, 'cancelled');

  const oversized = await executeHttp(
    { method: 'GET', url: '/oversized' }, environment, undefined,
    {
      checks: [{ kind: 'json_exists', path: '$.value', basis: 'user' }],
      fetchImpl: async () => new Response(`{"value":"${'x'.repeat(2 * 1024 * 1024)}"}`, { status: 200, headers: { 'content-type': 'application/json' } }),
    },
  );
  assert.equal(oversized.response.bodyTruncated, true);
  assert.equal(oversized.checks[0].state, 'indeterminate');
});

test('state store reopens durably and marks an in-flight attempt interrupted without replay', async (t) => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-api-testbench-state-')));
  t.after(async () => {
    const safeTempRoot = resolve(tmpdir());
    if (!root.startsWith(safeTempRoot + '\\') && root !== safeTempRoot) throw new Error(`Refusing to remove unexpected test path: ${root}`);
    await rm(root, { recursive: true, force: true });
  });
  const filePath = join(root, 'state.json');
  const first = await new JsonStateStore(filePath).initialize();
  const workspaceId = 'workspace-recovery';
  const sessionId = 'session-recovery';
  const runId = newId('run');
  const caseId = newId('case');
  const attemptId = newId('attempt');
  const run = {
    id: runId, workspaceId, sessionId, origin: 'user', title: 'Pending recovery test', status: 'running', createdAt: nowIso(),
    cases: [{ id: caseId, name: 'in-flight', status: 'running', request: { method: 'GET', url: '/never-sent-again' }, checks: [], attempts: [] }],
  };
  await first.createRun(workspaceId, run);
  await first.addAttempt(workspaceId, runId, caseId, { id: attemptId, status: 'running', startedAt: nowIso(), request: { method: 'GET', url: '/never-sent-again' } }, 'recovery-command');
  const reopened = await new JsonStateStore(filePath).initialize();
  const recovered = await reopened.getRun(workspaceId, sessionId, runId);
  assert.equal(recovered.status, 'interrupted');
  assert.equal(recovered.cases[0].attempts[0].status, 'interrupted');
  assert.match(recovered.cases[0].attempts[0].error.message, /not resent/);
  const events = await reopened.getEvents(workspaceId, sessionId, 0);
  assert.deepEqual(events.events.map((item) => item.type), ['run.created', 'attempt.started', 'attempt.interrupted', 'run.interrupted']);
  const lastEvent = await reopened.getEvents(workspaceId, sessionId, events.cursor - 1);
  assert.deepEqual(lastEvent.events.map((item) => item.seq), [events.cursor]);
  assert.deepEqual((await reopened.getEvents(workspaceId, sessionId, events.cursor)).events, []);
});
