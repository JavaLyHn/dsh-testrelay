import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  assertCheckShape,
  assertRequestShape,
  containsRedaction,
  attemptStatusFromResult,
  executeHttp,
  sanitizeChecks,
  sanitizeRequest,
  sanitizeText,
} from './host/executor.js';
import { JsonStateStore, newId, nowIso } from './host/store.js';

const PACKAGE = '@local/dsh-api-testbench';
const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods';
const CREDENTIAL_REF_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const MAX_CASES = 20;
const MAX_CHECKS = 30;
const MAX_INPUT_BYTES = 512 * 1024;
const BASIS_SPEC = { type: 'string', enum: ['user', 'project', 'agent'], description: 'Where the expectation came from.' };

const rowSpec = (label) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true, description: `${label} name.` },
    value: { type: 'string', required: true, description: `${label} value; use {{VARIABLE}} for workspace variables.` },
    enabled: { type: 'boolean', description: 'Defaults to enabled.' },
  },
});

const requestSpec = {
  type: 'object',
  additionalProperties: false,
  description: 'An HTTP request template. Relative URLs use the selected workspace environment base URL.',
  properties: {
    method: { type: 'string', required: true, enum: HTTP_METHODS, description: 'HTTP method.' },
    url: { type: 'string', required: true, description: 'Absolute HTTP(S) URL or path relative to the environment base URL.' },
    query: { type: 'array', items: rowSpec('Query parameter'), description: 'Optional ordered query entries; duplicate names are preserved.' },
    headers: { type: 'array', items: rowSpec('Header'), description: 'Optional request headers. Authorization and cookie values are redacted from stored history.' },
    body: {
      oneOf: [
        { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'none', required: true } } },
        { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'json', required: true }, value: { type: 'json', required: true } } },
        { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'text', required: true }, value: { type: 'string', required: true } } },
      ],
      description: 'Optional body: {kind:"none"}, {kind:"json",value:...}, or {kind:"text",value:"..."}. GET and HEAD accept only none.',
    },
  },
};

const basisProperties = {
  basis: BASIS_SPEC,
  basisDetail: { type: 'string', description: 'Optional project file or user statement that supports this expectation.' },
};
const checkItemSpec = {
  oneOf: [
    { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'status_equals', required: true }, expected: { type: 'integer', required: true, description: 'Expected HTTP status code.' }, ...basisProperties } },
    { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'json_exists', required: true }, path: { type: 'string', required: true, description: 'Simple JSON path such as $.items[0].id.' }, ...basisProperties } },
    { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'json_equals', required: true }, path: { type: 'string', required: true, description: 'Simple JSON path such as $.discount.' }, expected: { type: 'json', required: true }, ...basisProperties } },
  ],
};
const caseShared = {
  name: { type: 'string', required: true, description: 'Short test purpose shown in progress and history.' },
  purpose: { type: 'string', description: 'Optional longer purpose; defaults to name.' },
  checks: { type: 'array', items: checkItemSpec, description: 'Optional typed expectations. HTTP success is separate from assertion success.' },
};
const caseSpec = {
  oneOf: [
    { type: 'object', additionalProperties: false, properties: { ...caseShared, request: { ...requestSpec, required: true } } },
    { type: 'object', additionalProperties: false, properties: { ...caseShared, savedCaseId: { type: 'string', required: true, description: 'Stable ID returned by api_test_list_cases.' } } },
  ],
};

const runOutput = {
  type: 'object',
  additionalProperties: true,
  description: 'Redacted result summary; response bodies and credential values stay in the Testbench UI.',
};

function outputText(args, value) {
  const cases = Array.isArray(value?.cases) ? value.cases : [];
  const failed = cases.filter((item) => ['failed', 'send_failed', 'timed_out', 'cancelled', 'indeterminate', 'not_sent', 'not_started', 'interrupted'].includes(item.status)).length;
  const passed = cases.filter((item) => item.status === 'passed').length;
  const received = cases.filter((item) => item.status === 'received').length;
  const headline = `API test ${value?.runId ?? ''}: ${passed} passed, ${failed} failed or unresolved, ${received} received without assertions.`;
  const details = cases.slice(0, MAX_CASES).map((item) => {
    const http = item.httpStatus ? ` HTTP ${item.httpStatus}.` : '';
    const checks = item.checks?.length ? ` ${item.checks.filter((check) => check.state === 'passed').length}/${item.checks.length} checks passed.` : '';
    const observations = (item.checks ?? []).map((check) => {
      const target = check.path ?? 'HTTP status';
      const expected = check.kind === 'json_exists' ? 'present' : formatObservation(check.expected);
      const actual = check.actualMissing ? 'missing' : Object.hasOwn(check, 'actual') ? formatObservation(check.actual) : 'unobserved';
      return `  ${target}: ${check.state ?? 'not evaluated'} (expected ${expected}, actual ${actual}, basis ${check.basis ?? 'agent'})${check.reason ? ' — ' + check.reason : ''}`;
    });
    return [`- ${item.name}: ${item.status}.${http}${checks}${item.error?.message ? ' ' + item.error.message : ''}`, ...observations].join('\n');
  });
  return [{ type: 'text', text: [headline, ...details, 'Open the TestRelay API Testbench run for sanitized request/response details.'].join('\n') }];
}

function formatObservation(value) {
  const text = JSON.stringify(value) ?? 'unspecified';
  return text.length <= 160 ? text : text.slice(0, 159) + '…';
}

function compileValueSchema(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return {};
  const output = {};
  for (const [key, value] of Object.entries(spec)) {
    if (key === 'required') continue;
    if (key === 'type' && value === 'json') continue;
    if (key === 'properties') {
      const required = Array.isArray(spec.required) ? [...spec.required] : [];
      output.properties = {};
      for (const [name, child] of Object.entries(value ?? {})) {
        if (child?.required === true) required.push(name);
        output.properties[name] = compileValueSchema(child);
      }
      if (required.length) output.required = [...new Set(required)];
    } else if (key === 'oneOf') output.oneOf = value.map(compileValueSchema);
    else if (key === 'items') output.items = compileValueSchema(value);
    else output[key] = value;
  }
  return output;
}

function exactObject(value, label, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unsupported ${label} field: ${key}`);
  for (const key of required) if (!Object.hasOwn(value, key)) throw new Error(`${label}.${key} is required`);
  return value;
}

function validateRows(rows, label) {
  if (rows === undefined) return;
  if (!Array.isArray(rows)) throw new Error(`${label} must be an array`);
  for (const row of rows) {
    exactObject(row, `${label} row`, ['name', 'value', 'enabled'], ['name', 'value']);
    if (typeof row.name !== 'string' || typeof row.value !== 'string') throw new Error(`${label} row name and value must be strings`);
    if (row.enabled !== undefined && typeof row.enabled !== 'boolean') throw new Error(`${label} row enabled must be boolean`);
  }
}

function validateRequestInput(input) {
  const request = exactObject(input, 'request', ['method', 'url', 'query', 'headers', 'body'], ['method', 'url']);
  validateRows(request.query, 'query');
  validateRows(request.headers, 'headers');
  if (request.body !== undefined) {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('request.body must be an object');
    if (body.kind === 'none') exactObject(body, 'none body', ['kind'], ['kind']);
    else if (body.kind === 'json') exactObject(body, 'JSON body', ['kind', 'value'], ['kind', 'value']);
    else if (body.kind === 'text') {
      exactObject(body, 'text body', ['kind', 'value'], ['kind', 'value']);
      if (typeof body.value !== 'string') throw new Error('text body value must be a string');
    } else throw new Error('request.body.kind must be none, json, or text');
  }
  return assertRequestShape(request);
}

function validateChecksInput(checks) {
  if (checks === undefined) return [];
  if (!Array.isArray(checks)) throw new Error('checks must be an array');
  if (checks.length > MAX_CHECKS) throw new Error(`A case can have at most ${MAX_CHECKS} checks`);
  return checks.map((check) => {
    if (!check || typeof check !== 'object' || Array.isArray(check)) throw new Error('Each check must be an object');
    const allowed = check.kind === 'status_equals'
      ? ['kind', 'expected', 'basis', 'basisDetail']
      : check.kind === 'json_exists'
        ? ['kind', 'path', 'basis', 'basisDetail']
        : ['kind', 'path', 'expected', 'basis', 'basisDetail'];
    exactObject(check, 'check', allowed, check.kind === 'status_equals' ? ['kind', 'expected'] : check.kind === 'json_exists' ? ['kind', 'path'] : ['kind', 'path', 'expected']);
    if (check.basisDetail !== undefined && typeof check.basisDetail !== 'string') throw new Error('check.basisDetail must be a string');
    return assertCheckShape(check);
  });
}

function validateRunArgs(args) {
  exactObject(args, 'api_test_run arguments', ['title', 'environmentId', 'cases'], ['title', 'cases']);
  if (typeof args.title !== 'string' || !args.title.trim() || args.title.length > 180) throw new Error('title must contain 1–180 characters');
  if (args.environmentId !== undefined && (typeof args.environmentId !== 'string' || !args.environmentId.trim())) throw new Error('environmentId must be a non-empty string');
  if (!Array.isArray(args.cases) || args.cases.length < 1 || args.cases.length > MAX_CASES) throw new Error(`cases must contain 1–${MAX_CASES} items`);
  for (const item of args.cases) {
    exactObject(item, 'case', ['name', 'purpose', 'checks', 'request', 'savedCaseId'], ['name']);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 180) throw new Error('case.name must contain 1–180 characters');
    if (item.purpose !== undefined && typeof item.purpose !== 'string') throw new Error('case.purpose must be a string');
    const hasRequest = Object.hasOwn(item, 'request');
    const hasSavedCaseId = Object.hasOwn(item, 'savedCaseId');
    if (hasRequest === hasSavedCaseId) throw new Error('Each case must contain exactly one of request or savedCaseId');
    if (hasRequest) validateRequestInput(item.request);
    if (hasSavedCaseId && (typeof item.savedCaseId !== 'string' || !item.savedCaseId)) throw new Error('savedCaseId must be a non-empty string');
    validateChecksInput(item.checks);
  }
  return args;
}

function validateListArgs(args) {
  exactObject(args, 'api_test_list_cases arguments', ['nameFilter', 'limit']);
  if (args.nameFilter !== undefined && typeof args.nameFilter !== 'string') throw new Error('nameFilter must be a string');
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50)) throw new Error('limit must be an integer from 1 to 50');
  return args;
}

function validateStringRecord(value, label, { credentialRefs = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object of strings`);
  const output = {};
  for (const [name, item] of Object.entries(value)) {
    if (!CREDENTIAL_REF_RE.test(name)) throw new Error(`${label} keys must be variable names`);
    if (typeof item !== 'string' || item.length > 4096) throw new Error(`${label}.${name} must be a string of at most 4096 characters`);
    if (credentialRefs && !CREDENTIAL_REF_RE.test(item)) throw new Error(`${label}.${name} must name a valid credential reference`);
    output[name] = item;
  }
  return output;
}

function validateEnvironmentInput(payload) {
  exactObject(payload, 'environment', ['id', 'name', 'baseUrl', 'variables', 'credentialRefs', 'sensitiveFields'], ['name', 'baseUrl']);
  if (payload.id !== undefined && (typeof payload.id !== 'string' || !payload.id.trim() || payload.id.length > 160)) throw new Error('environment.id must be 1–160 characters');
  if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 120) throw new Error('environment.name must contain 1–120 characters');
  if (typeof payload.baseUrl !== 'string' || payload.baseUrl.length > 2048) throw new Error('environment.baseUrl must be a string of at most 2048 characters');
  const baseUrl = payload.baseUrl.trim();
  if (baseUrl) {
    let parsed;
    try { parsed = new URL(baseUrl); } catch { throw new Error('environment.baseUrl must be an absolute HTTP(S) URL or empty'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('environment.baseUrl must use HTTP(S) and must not contain URL credentials');
  }
  const variables = validateStringRecord(payload.variables ?? {}, 'environment.variables');
  const credentialRefs = validateStringRecord(payload.credentialRefs ?? {}, 'environment.credentialRefs', { credentialRefs: true });
  for (const name of Object.keys(variables)) if (Object.hasOwn(credentialRefs, name)) throw new Error(`environment variable ${name} cannot be both a plain value and a credential reference`);
  const sensitiveFields = payload.sensitiveFields ?? [];
  if (!Array.isArray(sensitiveFields) || sensitiveFields.length > 50 || sensitiveFields.some((item) => typeof item !== 'string' || !item.trim() || item.length > 120)) {
    throw new Error('environment.sensitiveFields must be an array of at most 50 non-empty field names');
  }
  return {
    ...(payload.id ? { id: payload.id } : {}),
    name: payload.name.trim(),
    baseUrl,
    variables,
    credentialRefs,
    sensitiveFields: [...new Set(sensitiveFields.map((item) => item.trim()))],
  };
}

function validateManualRunInput(payload) {
  exactObject(payload, 'manual run', ['requestId', 'title', 'name', 'purpose', 'environmentId', 'savedCaseId', 'request', 'checks'], ['requestId', 'environmentId', 'name', 'request']);
  if (typeof payload.requestId !== 'string' || payload.requestId.length < 1 || payload.requestId.length > 200) throw new Error('manual run requestId must contain 1–200 characters');
  if (typeof payload.environmentId !== 'string' || !payload.environmentId.trim() || payload.environmentId.length > 160) throw new Error('manual run environmentId is required');
  if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 180) throw new Error('manual run name must contain 1–180 characters');
  if (payload.title !== undefined && (typeof payload.title !== 'string' || !payload.title.trim() || payload.title.length > 180)) throw new Error('manual run title must contain 1–180 characters');
  if (payload.purpose !== undefined && (typeof payload.purpose !== 'string' || payload.purpose.length > 500)) throw new Error('manual run purpose must be at most 500 characters');
  if (payload.savedCaseId !== undefined && (typeof payload.savedCaseId !== 'string' || !payload.savedCaseId.trim() || payload.savedCaseId.length > 200)) throw new Error('savedCaseId must be a non-empty string');
  const request = validateRequestInput(payload.request);
  const checks = validateChecksInput(payload.checks);
  if (JSON.stringify({ request, checks }).length > MAX_INPUT_BYTES) throw new Error('The request and checks exceed the 512 KiB safety limit.');
  if (containsRedaction(request)) throw new Error('Replace redacted secret values with a credential reference before sending.');
  return { ...payload, request, checks, title: payload.title?.trim() || payload.name.trim(), name: payload.name.trim(), purpose: payload.purpose?.trim() || payload.name.trim() };
}

function runToolDefinition(service) {
  return {
    name: 'api_test_run',
    description: 'Run HTTP requests with typed assertions; e.g., verify a coupon response’s discount. POSTs may change server data. The Testbench records progress before each response and returns redacted results.',
    parameters: compileValueSchema({
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', required: true, description: 'Short title for this run.' },
        environmentId: { type: 'string', description: 'Workspace environment ID; defaults to local, then to the saved case environment.' },
        cases: { type: 'array', required: true, items: caseSpec, description: `Ordered tests. Each needs a name and exactly one of request or savedCaseId; at most ${MAX_CASES}.` },
      },
    }),
    output: { schema: runOutput, render: outputText },
    async execute(args, exec) { return service.track(service.runAgent(validateRunArgs(args), exec)); },
  };
}

function listToolDefinition(service) {
  return {
    name: 'api_test_list_cases',
    description: 'List saved API cases in the calling session’s current workspace; returns IDs, request paths, and no credential values.',
    parameters: compileValueSchema({
      type: 'object',
      additionalProperties: false,
      properties: {
        nameFilter: { type: 'string', description: 'Optional case-name or path substring.' },
        limit: { type: 'integer', description: 'Maximum results, 1–50; defaults to 20.' },
      },
    }),
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        const cases = value?.cases ?? [];
        return [{ type: 'text', text: cases.length
          ? `Saved API cases in this workspace:\n${cases.map((item) => `- ${item.name} (${item.id}): ${item.method} ${item.path}`).join('\n')}`
          : 'No saved API cases matched in this workspace.' }];
      },
    },
    async execute(args, exec) { return service.listCasesForAgent(validateListArgs(args), exec); },
  };
}

function safeEnvironmentSnapshot(snapshot, additionalSensitiveFields = []) {
  if (!snapshot) return null;
  const sensitiveFields = [...new Set([
    ...(Array.isArray(snapshot.sensitiveFields) ? snapshot.sensitiveFields : []),
    ...(Array.isArray(additionalSensitiveFields) ? additionalSensitiveFields : []),
  ])].filter((item) => typeof item === 'string').sort();
  const baseUrl = typeof snapshot.baseUrl === 'string' ? snapshot.baseUrl : '';
  return {
    id: snapshot.id ?? '',
    name: snapshot.name ?? '',
    baseUrl: baseUrl ? sanitizeRequest({ method: 'GET', url: baseUrl, body: { kind: 'none' } }, { sensitiveFields }).url : '',
    variableNames: Array.isArray(snapshot.variableNames) ? [...snapshot.variableNames].filter((item) => typeof item === 'string').sort() : Object.keys(snapshot.variables ?? {}).sort(),
    credentialVariableNames: Array.isArray(snapshot.credentialVariableNames) ? [...snapshot.credentialVariableNames].filter((item) => typeof item === 'string').sort() : Object.keys(snapshot.credentialRefs ?? {}).sort(),
    sensitiveFields,
    updatedAt: snapshot.updatedAt ?? null,
    revision: Number.isSafeInteger(snapshot.revision) ? snapshot.revision : 0,
  };
}

function safeEnvironment(environment) {
  if (!environment) return null;
  return safeEnvironmentSnapshot({
    id: environment.id,
    name: environment.name,
    baseUrl: environment.baseUrl,
    variableNames: Object.keys(environment.variables ?? {}),
    credentialVariableNames: Object.keys(environment.credentialRefs ?? {}),
    sensitiveFields: environment.sensitiveFields ?? [],
    updatedAt: environment.updatedAt,
    revision: environment.revision,
  });
}

function environmentFingerprint(snapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot ?? null)).digest('hex');
}

function safeRunSummary(run, { initialAttempts = false } = {}) {
  if (!run) return null;
  return {
    id: run.id,
    title: run.title,
    origin: run.origin,
    status: run.status,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
    turn: run.turn ?? null,
    step: run.step ?? null,
    handoffs: (run.handoffs ?? []).map((handoff) => ({ requestId: handoff.requestId, status: handoff.status, createdAt: handoff.createdAt, updatedAt: handoff.updatedAt })),
    cases: (run.cases ?? []).map((testCase) => {
      const latest = initialAttempts ? testCase.attempts?.find((attempt) => !attempt.parentAttemptId) : testCase.attempts?.at(-1);
      return {
        caseId: testCase.id,
        name: testCase.name,
        purpose: testCase.purpose,
        environmentId: testCase.environmentId,
        status: latest?.status ?? testCase.status ?? 'pending',
        attemptId: latest?.id ?? null,
        transport: latest?.transport ?? null,
        httpStatus: latest?.response?.status ?? null,
        checks: latest?.checks ?? testCase.checks ?? [],
        error: latest?.error ?? null,
      };
    }),
  };
}

function defaultDataFile(config) {
  if (config && typeof config.dataFile === 'string' && config.dataFile.trim()) return config.dataFile;
  return join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'api-testbench', 'state.json');
}

function stableRunId(sessionId, callId) {
  const text = `${sessionId}\n${callId}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `run-${(hash >>> 0).toString(16)}-${text.length.toString(16)}`;
}

class ApiTestbenchService {
  constructor(ctx, config = {}) {
    this.ctx = ctx;
    this.name = 'apiTestbench';
    this.typertRemote = Object.freeze({ service: this, serviceKey: this.name, namespace: this.name });
    this.store = new JsonStateStore(defaultDataFile(config), { liveHost: true });
    this.ready = this.store.initialize();
    this.ready.catch(() => {});
    this.turnSteps = new Map();
    this.activeControllers = new Map();
    this.pendingOperations = new Set();
    this.disposed = false;
    this.credentialResolver = {
      resolve: async (name) => {
        if (typeof name !== 'string' || !CREDENTIAL_REF_RE.test(name)) return undefined;
        try { return await this.ctx.credentials.resolve(name); }
        catch { return undefined; }
      },
    };

    ctx.effect(() => {
      const disposers = [];
      disposers.push(ctx.tools.register(runToolDefinition(this)));
      disposers.push(ctx.tools.register(listToolDefinition(this)));
      disposers.push(ctx.systemPrompt.section({
        name: 'api-testbench',
        order: 68,
        text: 'Use API Testbench only for explicit API-testing requests. Target only the endpoint and scope the user named; do not widen to unrelated or production systems. Retrieve the current ID with api_test_list_cases before reusing a saved case. Base conclusions on recorded assertion values, not HTTP status alone.',
      }));
      disposers.push(ctx.on('agent/pre-step', (payload, next) => {
        if (payload?.agent?.id) this.turnSteps.set(payload.agent.id, { turn: payload.turn, step: payload.step });
        return next();
      }));
      return async () => {
        this.disposed = true;
        for (const controller of this.activeControllers.values()) controller.abort(new Error('API Testbench is unloading'));
        for (const dispose of disposers.reverse()) { try { await dispose?.(); } catch {} }
        await Promise.allSettled([...this.pendingOperations]);
        await this.ready.catch(() => {});
        await this.store.close();
      };
    });
  }

  track(task) {
    this.pendingOperations.add(task);
    const forget = () => this.pendingOperations.delete(task);
    task.then(forget, forget);
    return task;
  }

  workspaceForSession(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) throw new Error('A session identity is required');
    const workspace = this.ctx.workspaceRegistry.list().find((item) => item.sessionIds?.includes(sessionId));
    if (!workspace) throw new Error('This session is not attached to a workspace; API Testbench data is workspace-scoped.');
    return { id: workspace.id, title: workspace.title, path: workspace.path };
  }

  async ensureWorkspace(workspaceId) {
    const environments = await this.store.listEnvironments(workspaceId);
    if (!environments) await this.store.mutateWorkspace(workspaceId, (workspace) => ({ id: workspace.id }));
  }

  async sessionForAgent(sessionId) {
    const session = this.ctx.sessions.get(sessionId);
    if (!session) throw new Error('The calling Agent session is no longer active.');
    const workspace = this.workspaceForSession(sessionId);
    return { sessionId, workspace, cwd: session.header.cwd };
  }

  async listEnvironmentsForUI(workspaceId) {
    const environments = await this.store.listEnvironments(workspaceId);
    return { environments: (environments ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      baseUrl: item.baseUrl ?? '',
      variables: item.variables ?? {},
      credentialRefs: item.credentialRefs ?? {},
      sensitiveFields: item.sensitiveFields ?? [],
      updatedAt: item.updatedAt ?? null,
    })) };
  }

  async saveEnvironmentForUI(workspaceId, payload) {
    const input = validateEnvironmentInput(payload);
    const existing = input.id ? await this.store.getEnvironment(workspaceId, input.id) : undefined;
    const environment = {
      ...input,
      id: input.id ?? newId('environment'),
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      revision: (existing?.revision ?? 0) + 1,
    };
    const saved = await this.store.upsertEnvironment(workspaceId, environment);
    return { environment: saved };
  }

  async listCasesForUI(workspaceId, payload = {}) {
    exactObject(payload, 'case list request', ['nameFilter', 'limit']);
    if (payload.nameFilter !== undefined && typeof payload.nameFilter !== 'string') throw new Error('nameFilter must be a string');
    const limit = payload.limit === undefined ? 100 : payload.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error('case list limit must be an integer from 1 to 200');
    const cases = await this.store.listCases(workspaceId, payload.nameFilter ?? '');
    return { cases: cases.slice(0, limit), hasMore: cases.length > limit };
  }

  async saveCaseForUI(workspaceId, payload) {
    exactObject(payload, 'saved case', ['id', 'name', 'purpose', 'environmentId', 'request', 'checks'], ['name', 'environmentId', 'request']);
    if (payload.id !== undefined && (typeof payload.id !== 'string' || !payload.id.trim() || payload.id.length > 200)) throw new Error('saved case id must be a non-empty string');
    if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 180) throw new Error('saved case name must contain 1–180 characters');
    if (payload.purpose !== undefined && (typeof payload.purpose !== 'string' || payload.purpose.length > 500)) throw new Error('saved case purpose must be at most 500 characters');
    if (typeof payload.environmentId !== 'string' || !payload.environmentId.trim()) throw new Error('saved case environmentId is required');
    const request = validateRequestInput(payload.request);
    const checks = validateChecksInput(payload.checks);
    if (JSON.stringify({ request, checks }).length > MAX_INPUT_BYTES) throw new Error('The saved request and checks exceed the 512 KiB safety limit.');
    const existing = payload.id ? await this.store.getCase(workspaceId, payload.id) : undefined;
    const environment = await this.store.getEnvironment(workspaceId, payload.environmentId);
    if (!environment) throw new Error(`Workspace environment not found: ${payload.environmentId}`);
    const safeRequest = sanitizeRequest(request, { sensitiveFields: environment.sensitiveFields ?? [] });
    const safeChecks = sanitizeChecks(checks, [], environment.sensitiveFields ?? []);
    if (containsRedaction(safeRequest)) throw new Error('Replace redacted request values with credential references before saving this case.');
    if (containsRedaction(safeChecks)) throw new Error('This case has a sensitive assertion value that cannot be saved without changing its meaning. Remove that check or keep the request unsaved.');
    const now = nowIso();
    const testCase = {
      id: payload.id ?? newId('saved-case'),
      name: payload.name.trim(),
      purpose: payload.purpose?.trim() || payload.name.trim(),
      environmentId: environment.id,
      request: safeRequest,
      checks: safeChecks,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    return { case: await this.store.saveCase(workspaceId, testCase) };
  }

  async startManualRun(workspace, sessionId, payload) {
    const input = validateManualRunInput(payload);
    const environment = await this.store.getEnvironment(workspace.id, input.environmentId);
    if (!environment) throw new Error(`Workspace environment not found: ${input.environmentId}`);
    if (input.savedCaseId && !(await this.store.getCase(workspace.id, input.savedCaseId))) throw new Error(`Saved case not found in this workspace: ${input.savedCaseId}`);
    const sensitiveFields = environment.sensitiveFields ?? [];
    const safeRequest = sanitizeRequest(input.request, { sensitiveFields });
    const safeChecks = sanitizeChecks(input.checks, [], sensitiveFields);
    const requestFingerprint = createHash('sha256').update(JSON.stringify({
      title: input.title,
      name: input.name,
      purpose: input.purpose,
      environmentId: input.environmentId,
      savedCaseId: input.savedCaseId ?? null,
      request: safeRequest,
      checks: safeChecks,
    })).digest('hex');
    const session = this.ctx.sessions.get(sessionId);
    const run = {
      id: newId('run'),
      workspaceId: workspace.id,
      sessionId,
      workspaceTitle: workspace.title,
      origin: 'user',
      requestId: input.requestId,
      requestFingerprint,
      turn: null,
      step: null,
      title: input.title,
      status: 'running',
      createdAt: nowIso(),
      cwd: session?.header?.cwd ?? workspace.path,
      cases: [{
        id: newId('case'),
        name: input.name,
        purpose: input.purpose,
        environmentId: environment.id,
        savedCaseId: input.savedCaseId ?? null,
        request: safeRequest,
        checks: safeChecks,
        status: 'pending',
        attempts: [],
      }],
      handoffs: [],
    };
    const created = await this.store.createRun(workspace.id, run);
    const storedCase = created.run.cases[0];
    const existingAttempt = storedCase?.attempts?.at(-1);
    if (!created.created) return { runId: created.run.id, caseId: storedCase?.id ?? null, attemptId: existingAttempt?.id ?? null, duplicate: true };

    const attemptId = newId('attempt');
    const attempt = {
      id: attemptId,
      commandId: `manual-run:${input.requestId}`,
      parentAttemptId: null,
      origin: 'user',
      environmentId: environment.id,
      environmentSnapshot: safeEnvironment(environment),
      request: safeRequest,
      checks: safeChecks,
      startedAt: nowIso(),
      status: 'running',
      transport: 'pending',
      response: null,
      error: null,
    };
    const admitted = await this.store.addAttempt(workspace.id, run.id, storedCase.id, attempt, attempt.commandId, 'attempt.started');
    if (!admitted.created) return { runId: run.id, caseId: storedCase.id, attemptId: admitted.attempt.id, duplicate: true };

    const controller = new AbortController();
    this.activeControllers.set(attemptId, controller);
    const task = (async () => {
      try {
        const result = await executeHttp(input.request, environment, this.credentialResolver, {
          signal: controller.signal,
          checks: input.checks,
          sensitiveFields,
        });
        await this.settleAttempt(workspace.id, run.id, storedCase.id, attemptId, result);
        await this.store.finishRun(workspace.id, run.id, controller.signal.aborted || result.transport === 'cancelled' ? 'cancelled' : 'finished');
      } catch {
        await this.settleAttempt(workspace.id, run.id, storedCase.id, attemptId, { transport: 'send_failed', error: { message: 'The manual API request could not be completed.' } });
        await this.store.finishRun(workspace.id, run.id, controller.signal.aborted ? 'cancelled' : 'finished');
      } finally {
        this.activeControllers.delete(attemptId);
      }
    })();
    this.track(task);
    return { runId: run.id, caseId: storedCase.id, attemptId, duplicate: false };
  }

  async normalizeCases(args, workspaceId) {
    if (!Array.isArray(args.cases) || args.cases.length < 1 || args.cases.length > MAX_CASES) throw new Error(`cases must contain 1–${MAX_CASES} items`);
    const normalized = [];
    let total = 0;
    for (let index = 0; index < args.cases.length; index++) {
      const item = args.cases[index];
      const saved = item.savedCaseId ? await this.store.getCase(workspaceId, item.savedCaseId) : undefined;
      if (item.savedCaseId && !saved) throw new Error(`Saved case not found in the current workspace: ${item.savedCaseId}`);
      const request = assertRequestShape(item.request ?? saved?.request);
      if (saved) {
        const redacted = containsRedaction(saved.request);
        if (redacted) throw new Error(`Saved case “${saved.name}” contains a redacted secret; edit it and replace the secret with a credential reference before running.`);
        if (containsRedaction(saved.checks)) throw new Error(`Saved case “${saved.name}” contains a redacted assertion value; edit the check before running it.`);
      }
      const checks = (item.checks ?? saved?.checks ?? []).map(assertCheckShape);
      if (checks.length > MAX_CHECKS) throw new Error(`Case “${item.name}” has more than ${MAX_CHECKS} checks`);
      total += JSON.stringify({ request, checks }).length;
      normalized.push({
        id: newId('case'),
        savedCaseId: saved?.id,
        name: item.name,
        purpose: item.purpose || item.name,
        environmentId: args.environmentId || saved?.environmentId || 'local',
        request,
        checks,
        savedCase: saved,
        index,
      });
    }
    if (total > MAX_INPUT_BYTES) throw new Error('Combined request templates and checks exceed the 512 KiB safety limit.');
    return normalized;
  }

  async runAgent(args, exec) {
    await this.ready;
    if (!exec?.agent?.id) throw new Error('API tests must be run from an Agent conversation.');
    if (!exec.callId) throw new Error('This Agent call has no stable tool-call identity; no request was sent.');
    const caller = await this.sessionForAgent(exec.agent.id);
    await this.ensureWorkspace(caller.workspace.id);
    const previous = await this.store.findRunForCall(caller.workspace.id, caller.sessionId, exec.callId);
    if (previous) return this.toolSummary(previous);
    const normalized = await this.normalizeCases(args, caller.workspace.id);
    const redactionEnvironments = await Promise.all(normalized.map((item) => this.store.getEnvironment(caller.workspace.id, item.environmentId)));
    if (typeof args.title !== 'string' || args.title.trim() === '' || args.title.length > 180) throw new Error('title must contain 1–180 characters');
    const step = this.turnSteps.get(caller.sessionId) ?? {};
    const run = {
      id: newId('run'),
      workspaceId: caller.workspace.id,
      sessionId: caller.sessionId,
      workspaceTitle: caller.workspace.title,
      origin: 'agent',
      toolCallId: exec.callId,
      rootCallId: exec.rootCallId ?? exec.callId,
      turn: Number.isSafeInteger(step.turn) ? step.turn : null,
      step: Number.isSafeInteger(step.step) ? step.step : null,
      title: args.title.trim(),
      status: 'running',
      createdAt: nowIso(),
      cwd: caller.cwd,
      cases: normalized.map((item, index) => {
        const sensitiveFields = redactionEnvironments[index]?.sensitiveFields ?? [];
        return {
          id: item.id,
          name: item.name,
          purpose: item.purpose,
          environmentId: item.environmentId,
          savedCaseId: item.savedCaseId ?? null,
          request: sanitizeRequest(item.request, { sensitiveFields }),
          checks: sanitizeChecks(item.checks, [], sensitiveFields),
          status: 'pending',
          attempts: [],
        };
      }),
      handoffs: [],
    };
    const created = await this.store.createRun(caller.workspace.id, run);
    if (!created.created) return this.toolSummary(created.run);

    for (let index = 0; index < normalized.length; index++) {
      const spec = normalized[index];
      if (exec.signal?.aborted || this.disposed) {
        await this.store.mutateWorkspace(caller.workspace.id, (workspace, addEvent) => {
          const storedRun = workspace.runs.find((item) => item.id === run.id);
          const testCase = storedRun?.cases.find((item) => item.id === spec.id);
          if (testCase) testCase.status = 'not_started';
          addEvent('case.not_started', { sessionId: caller.sessionId, runId: run.id, caseId: spec.id, reason: 'cancelled' });
        });
        continue;
      }
      const environment = await this.store.getEnvironment(caller.workspace.id, spec.environmentId);
      const attempt = {
        id: newId('attempt'),
        commandId: `${exec.callId}:case:${index}`,
        parentAttemptId: null,
        origin: 'agent',
        environmentId: spec.environmentId,
        environmentSnapshot: safeEnvironment(environment),
        request: sanitizeRequest(spec.request, { sensitiveFields: environment?.sensitiveFields ?? [] }),
        checks: sanitizeChecks(spec.checks, [], environment?.sensitiveFields ?? []),
        startedAt: nowIso(),
        status: environment ? 'running' : 'not_sent',
        transport: environment ? 'pending' : 'not_sent',
        response: null,
        error: null,
      };
      const admitted = await this.store.addAttempt(caller.workspace.id, run.id, spec.id, attempt, attempt.commandId, environment ? 'attempt.started' : 'attempt.not_started');
      if (!admitted.created) continue;
      if (!environment) {
        const result = { transport: 'not_sent', error: { message: `Workspace environment “${spec.environmentId}” was not found.` } };
        await this.settleAttempt(caller.workspace.id, run.id, spec.id, attempt.id, result);
        continue;
      }
      const result = await executeHttp(spec.request, environment, this.credentialResolver, {
        signal: exec.signal,
        checks: spec.checks,
        sensitiveFields: environment.sensitiveFields ?? [],
      });
      await this.settleAttempt(caller.workspace.id, run.id, spec.id, attempt.id, result);
      if (exec.signal?.aborted || result.transport === 'cancelled') {
        for (let remaining = index + 1; remaining < normalized.length; remaining++) {
          const pendingCase = normalized[remaining];
          await this.store.mutateWorkspace(caller.workspace.id, (workspace, addEvent) => {
            const storedRun = workspace.runs.find((item) => item.id === run.id);
            const testCase = storedRun?.cases.find((item) => item.id === pendingCase.id);
            if (testCase) testCase.status = 'not_started';
            addEvent('case.not_started', { sessionId: caller.sessionId, runId: run.id, caseId: pendingCase.id, reason: 'cancelled' });
          });
        }
        break;
      }
    }
    await this.store.finishRun(caller.workspace.id, run.id, exec.signal?.aborted ? 'cancelled' : 'finished');
    return this.toolSummary(await this.store.getRun(caller.workspace.id, caller.sessionId, run.id));
  }

  async settleAttempt(workspaceId, runId, caseId, attemptId, result) {
    const status = attemptStatusFromResult(result);
    await this.store.updateAttempt(workspaceId, runId, caseId, attemptId, {
      status,
      transport: result.transport,
      finishedAt: nowIso(),
      durationMs: result.durationMs ?? null,
      ...(result.request ? { request: result.request } : {}),
      response: result.response ?? null,
      ...(result.checks ? { checks: result.checks } : {}),
      error: result.error ?? null,
    }, 'attempt.finished');
  }

  async toolSummary(run) {
    const safe = safeRunSummary(run, { initialAttempts: true });
    return {
      runId: safe.id,
      status: safe.status,
      cases: safe.cases.map((testCase) => ({
        caseId: testCase.caseId,
        name: testCase.name,
        attemptId: testCase.attemptId,
        status: testCase.status,
        transport: testCase.transport,
        httpStatus: testCase.httpStatus,
        checks: testCase.checks,
        error: testCase.error,
      })),
    };
  }

  async listCasesForAgent(args, exec) {
    await this.ready;
    if (!exec?.agent?.id) throw new Error('Saved cases are available only in an Agent conversation.');
    const caller = await this.sessionForAgent(exec.agent.id);
    await this.ensureWorkspace(caller.workspace.id);
    const limit = Number.isInteger(args.limit) ? Math.max(1, Math.min(50, args.limit)) : 20;
    const cases = await this.store.listCases(caller.workspace.id, args.nameFilter ?? '');
    return {
      workspace: caller.workspace.title,
      cases: cases.slice(0, limit).map((item) => ({
        id: item.id,
        name: item.name,
        method: item.request?.method ?? 'GET',
        path: item.request?.url ?? '',
        environmentId: item.environmentId,
        updatedAt: item.updatedAt,
      })),
      hasMore: cases.length > limit,
    };
  }

  perform(request, signal) {
    return this.track(this.performAction(request, signal));
  }

  async performAction(request, signal) {
    await this.ready;
    if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Invalid API Testbench request');
    signal?.throwIfAborted?.();
    const workspace = this.workspaceForSession(request.sessionId);
    await this.ensureWorkspace(workspace.id);
    const payload = request.payload ?? {};

    if (request.action === 'listEnvironments') return this.listEnvironmentsForUI(workspace.id);
    if (request.action === 'saveEnvironment') return this.saveEnvironmentForUI(workspace.id, payload);
    if (request.action === 'listCases') return this.listCasesForUI(workspace.id, payload);
    if (request.action === 'saveCase') return this.saveCaseForUI(workspace.id, payload);
    if (request.action === 'runManual') return this.startManualRun(workspace, request.sessionId, payload);

    if (request.action === 'changes') {
      const afterSeq = Number.isSafeInteger(payload.afterSeq) && payload.afterSeq >= 0 ? payload.afterSeq : 0;
      const page = await this.store.getEvents(workspace.id, request.sessionId, afterSeq, 1);
      return { changed: page.events.length > 0, cursor: page.cursor };
    }

    if (request.action === 'snapshot') {
      const afterSeq = Number.isSafeInteger(payload.afterSeq) && payload.afterSeq >= 0 ? payload.afterSeq : 0;
      const events = await this.store.getEvents(workspace.id, request.sessionId, afterSeq);
      let run = payload.runId
        ? await this.store.getRun(workspace.id, request.sessionId, payload.runId)
        : (await this.store.listRuns(workspace.id, request.sessionId, 1))[0];
      const history = await this.store.listRuns(workspace.id, request.sessionId, 30);
      if (!run && !payload.runId) run = history[0];
      return {
        run: run ?? null,
        history: history.map((item) => safeRunSummary(item)),
        events: events.events,
        cursor: events.cursor,
        minSeq: events.minSeq,
      };
    }

    if (request.action === 'runForCall') {
      if (typeof payload.callId !== 'string' || !payload.callId) return { run: null, matched: false };
      const run = await this.store.findRunForCall(workspace.id, request.sessionId, payload.callId);
      return { run: safeRunSummary(run, { initialAttempts: true }), matched: Boolean(run) };
    }

    if (request.action === 'sendToSession') return this.sendToSession(workspace.id, request.sessionId, payload, signal);
    if (request.action === 'retryAttempt') return this.retryAttempt(workspace, request.sessionId, payload, signal);

    if (request.action === 'cancelAttempt') {
      const attemptId = payload.attemptId;
      if (typeof attemptId !== 'string' || !attemptId) throw new Error('attemptId is required');
      const associatedRun = await this.store.findRunForAttempt(workspace.id, request.sessionId, attemptId);
      if (!associatedRun) return { cancelled: false, reason: 'not-found' };
      const controller = this.activeControllers.get(attemptId);
      if (!controller) return { cancelled: false, reason: 'not-running' };
      controller.abort(new Error('Cancelled by the user'));
      return { cancelled: true };
    }

    throw new Error(`Unknown API Testbench action: ${String(request.action)}`);
  }

  async retryAttempt(workspace, sessionId, payload, signal) {
    const { runId, caseId, requestId } = payload;
    if (typeof runId !== 'string' || !runId || typeof caseId !== 'string' || !caseId || typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 200) {
      throw new Error('runId, caseId, and a 1–200 character requestId are required.');
    }
    if (payload.parentAttemptId !== undefined && (typeof payload.parentAttemptId !== 'string' || !payload.parentAttemptId || payload.parentAttemptId.length > 200)) {
      throw new Error('parentAttemptId must identify an attempt in the selected case.');
    }
    if (payload.confirmEnvironmentChange !== undefined && typeof payload.confirmEnvironmentChange !== 'boolean') throw new Error('confirmEnvironmentChange must be a boolean');
    if (payload.confirmedEnvironmentStamp !== undefined && (typeof payload.confirmedEnvironmentStamp !== 'string' || payload.confirmedEnvironmentStamp.length !== 64)) throw new Error('confirmedEnvironmentStamp must be a current environment fingerprint');
    if (!Object.hasOwn(payload, 'request')) throw new Error('An edited request is required for a manual retry.');
    const request = validateRequestInput(payload.request);
    if (JSON.stringify(request).length > MAX_INPUT_BYTES) throw new Error('The edited request exceeds the 512 KiB safety limit.');
    if (containsRedaction(request)) {
      throw new Error('Replace redacted secret values with a credential reference before retrying.');
    }
    const run = await this.store.getRun(workspace.id, sessionId, runId);
    if (!run) throw new Error('The selected run does not belong to this session.');
    const testCase = run.cases.find((item) => item.id === caseId);
    if (!testCase) throw new Error('The selected test case does not belong to this run.');
    const attempts = testCase.attempts ?? [];
    const commandId = `manual:${requestId}`;
    const existingRetry = attempts.find((item) => item.commandId === commandId);
    const replaySourceId = payload.parentAttemptId ?? existingRetry?.parentAttemptId ?? attempts.at(-1)?.id;
    const replaySource = attempts.find((item) => item.id === replaySourceId);
    if (!replaySource) throw new Error('The selected replay source does not belong to this case.');
    // Older records discarded checks on transport failure. Every replay in the
    // case inherits its declarations, never the previous attempt's observations.
    const priorChecks = replaySource.checks?.length ? replaySource.checks : testCase.checks ?? [];
    const checks = priorChecks.map((prior) => {
      const definition = {};
      for (const field of ['kind', 'path', 'expected', 'basis', 'basisDetail']) {
        if (Object.hasOwn(prior, field)) definition[field] = prior[field];
      }
      return assertCheckShape(definition);
    });
    if (checks.length > MAX_CHECKS) throw new Error('The stored case has more than the supported number of checks.');
    const environmentId = replaySource.environmentId ?? testCase.environmentId;
    const environment = await this.store.getEnvironment(workspace.id, environmentId);
    const sensitiveFields = environment?.sensitiveFields ?? [];
    const currentEnvironmentSnapshot = safeEnvironment(environment);
    const previousEnvironmentSnapshot = safeEnvironmentSnapshot(replaySource.environmentSnapshot, sensitiveFields);
    const environmentChanged = JSON.stringify(previousEnvironmentSnapshot) !== JSON.stringify(currentEnvironmentSnapshot);
    const credentialReferencesPresent = Boolean(
      previousEnvironmentSnapshot?.credentialVariableNames?.length || currentEnvironmentSnapshot?.credentialVariableNames?.length,
    );
    const currentEnvironmentStamp = environmentFingerprint(currentEnvironmentSnapshot);
    if (environment && (environmentChanged || credentialReferencesPresent)
      && (payload.confirmEnvironmentChange !== true || payload.confirmedEnvironmentStamp !== currentEnvironmentStamp)) {
      return {
        confirmationRequired: true,
        environmentStamp: currentEnvironmentStamp,
        environmentChanged,
        credentialReferencesPresent,
        previousEnvironment: previousEnvironmentSnapshot,
        currentEnvironment: currentEnvironmentSnapshot,
        sourceAttemptId: replaySource.id,
        message: 'The selected attempt used an earlier environment snapshot. Review the current base URL and confirm before sending; credential references are re-resolved at send time.',
      };
    }
    const requestSnapshot = sanitizeRequest(request, { sensitiveFields });
    const attemptId = newId('attempt');
    const attempt = {
      id: attemptId,
      commandId,
      parentAttemptId: replaySource.id,
      origin: 'user',
      environmentId,
      environmentSnapshot: safeEnvironment(environment),
      request: requestSnapshot,
      checks: sanitizeChecks(checks, [], sensitiveFields),
      startedAt: nowIso(),
      status: environment ? 'running' : 'not_sent',
      transport: environment ? 'pending' : 'not_sent',
      response: null,
      error: null,
    };
    const begun = await this.store.beginRetry(
      workspace.id,
      runId,
      caseId,
      attempt,
      commandId,
      requestSnapshot,
      replaySource.id,
      environment ? 'attempt.started' : 'attempt.not_started',
    );
    if (!begun.created) {
      return { run: safeRunSummary(await this.store.getRun(workspace.id, sessionId, runId)), attemptId: begun.attempt.id, duplicate: true };
    }

    if (!environment) {
      await this.settleAttempt(workspace.id, runId, caseId, attemptId, {
        transport: 'not_sent',
        error: { message: `Workspace environment “${environmentId}” was not found.` },
      });
      const completed = await this.store.getRun(workspace.id, sessionId, runId);
      return { run: safeRunSummary(completed), attemptId, duplicate: false };
    }

    const controller = new AbortController();
    const abortFromCall = () => controller.abort(signal?.reason ?? new Error('Retry request cancelled'));
    if (signal?.aborted) abortFromCall();
    else signal?.addEventListener('abort', abortFromCall, { once: true });
    this.activeControllers.set(attemptId, controller);
    let result;
    try {
      result = await executeHttp(request, environment, this.credentialResolver, {
        signal: controller.signal,
        checks,
        replay: true,
        sensitiveFields: environment.sensitiveFields ?? [],
      });
    } catch {
      result = { transport: 'send_failed', error: { message: 'The edited API request could not be executed.' } };
    } finally {
      signal?.removeEventListener('abort', abortFromCall);
      this.activeControllers.delete(attemptId);
    }
    await this.settleAttempt(workspace.id, runId, caseId, attemptId, result);
    const completed = await this.store.getRun(workspace.id, sessionId, runId);
    return { run: safeRunSummary(completed), attemptId, duplicate: false };
  }

  async sendToSession(workspaceId, sessionId, payload, signal) {
    const { runId } = payload;
    let requestId = payload.requestId;
    if (typeof runId !== 'string' || !runId || typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 200) throw new Error('runId and requestId are required');
    const run = await this.store.getRun(workspaceId, sessionId, runId);
    if (!run) throw new Error('The selected run does not belong to this session.');
    if (typeof payload.text !== 'string') throw new Error('The comparison text must be a string.');
    const text = sanitizeText(payload.text).trim();
    if (!text || text.length > 20_000) throw new Error('The comparison text must contain 1–20,000 characters.');
    const textFingerprint = createHash('sha256').update(text).digest('hex');
    signal?.throwIfAborted?.();

    const reservation = await this.store.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      const storedRun = workspace.runs.find((item) => item.id === runId && item.sessionId === sessionId);
      if (!storedRun) throw new Error('The selected run no longer belongs to this session.');
      storedRun.handoffs ??= [];
      const identicalAccepted = storedRun.handoffs.find((item) => item.status === 'accepted' && item.textFingerprint === textFingerprint);
      if (identicalAccepted) return { accepted: true, duplicate: true, requestId: identicalAccepted.requestId };
      const byId = storedRun.handoffs.find((item) => item.requestId === requestId);
      if (byId && byId.textFingerprint !== textFingerprint) throw new Error('This handoff requestId was already used with different summary text. Edit the summary to start a new send action.');
      const existing = storedRun.handoffs.find((item) => item.textFingerprint === textFingerprint && ['pending', 'unknown'].includes(item.status)) ?? byId;
      if (existing) {
        if (existing.status === 'accepted') return { accepted: true, duplicate: true };
        if (existing.status === 'pending') return { accepted: false, pending: true, requestId: existing.requestId };
        if (existing.status === 'unknown' && payload.confirmUnknown !== true) return { accepted: false, uncertain: true, requestId: existing.requestId };
        requestId = existing.requestId;
        existing.status = 'pending';
        existing.attempts = (existing.attempts ?? 1) + 1;
        existing.updatedAt = nowIso();
        delete existing.error;
      } else {
        const now = nowIso();
        storedRun.handoffs.push({ requestId, textFingerprint, status: 'pending', attempts: 1, createdAt: now, updatedAt: now });
      }
      addEvent('handoff.started', { sessionId, runId, requestId });
      return { accepted: false, reserved: true };
    });
    if (reservation.duplicate) return { accepted: true, duplicate: true, requestId: reservation.requestId ?? requestId };
    if (reservation.pending) return { ...reservation, error: 'This comparison send is already in progress.' };
    if (reservation.uncertain) return { ...reservation, error: 'Delivery is unknown. Check the originating conversation before retrying with the original request ID.' };

    const finalize = async (status, eventType, error) => this.store.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      const storedRun = workspace.runs.find((item) => item.id === runId && item.sessionId === sessionId);
      const handoff = storedRun?.handoffs?.find((item) => item.requestId === requestId);
      if (handoff) {
        handoff.status = status;
        handoff.updatedAt = nowIso();
        if (error) handoff.error = error;
        else delete handoff.error;
      }
      addEvent(eventType, { sessionId, runId, requestId, accepted: status === 'accepted' });
    });

    let result;
    try {
      result = await this.ctx.sessionController.prompt({
        requestId,
        sessionId: run.sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      }, signal ?? new AbortController().signal);
    } catch (error) {
      // The packed Session controller reports admission rejections as typed
      // RemoteErrors; a missing reply has a different delivery guarantee.
      const rejections = ['gateway/bad-request', 'remote-access/denied', 'session/agent-busy', 'session/not-found', 'session/writer-held', 'session/model-unavailable', 'session/attachment-invalid'];
      if (error?.isDSHRemoteError === true && rejections.includes(error.code)) {
        const message = `The originating session rejected the comparison (${error.code}).`;
        await finalize('rejected', 'handoff.rejected', message);
        return { accepted: false, requestId, error: message };
      }
      const message = 'Delivery is unknown. Check the originating conversation before retrying with the original request ID.';
      await finalize('unknown', 'handoff.unknown', message);
      return { accepted: false, uncertain: true, requestId, error: message };
    }
    if (result?.accepted !== true) {
      await finalize('rejected', 'handoff.rejected', 'The originating session rejected the comparison.');
      return { accepted: false, requestId, error: 'The originating session did not accept the comparison. You can copy the preview or retry the same send action.' };
    }
    await finalize('accepted', 'handoff.sent');
    return { accepted: true, requestId };
  }
}

// Typert protocol v1 SRC marker: the installed Host Gateway reads this on a provided Service.
Object.defineProperty(ApiTestbenchService.prototype, REMOTE_METHOD_DESCRIPTOR, {
  configurable: true,
  value: Object.freeze({
    version: 1,
    methods: Object.freeze([Object.freeze({
      method: 'perform',
      invocation: Object.freeze({ kind: 'direct' }),
      resources: Object.freeze({ session: (request) => request.sessionId }),
    })]),
  }),
});

export function apply(ctx, config = {}) {
  const service = new ApiTestbenchService(ctx, config);
  ctx.provide('apiTestbench', service);
}

export { PACKAGE as packageName };
