import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';

const VERSION = 1;
const DEFAULT_ENVS = () => [
  { id: 'local', name: 'Local development', baseUrl: 'http://127.0.0.1:43127', variables: {}, credentialRefs: {}, sensitiveFields: [], updatedAt: new Date().toISOString(), revision: 0 },
  { id: 'direct', name: 'Direct input', baseUrl: '', variables: {}, credentialRefs: {}, sensitiveFields: [], updatedAt: new Date().toISOString(), revision: 0 },
];

function freshState() {
  return { version: VERSION, workspaces: Object.create(null) };
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assertWorkspaceId(id) {
  if (typeof id !== 'string' || id.length < 1 || id.length > 240) throw new Error('A valid workspace id is required');
}

function workspaceFor(state, workspaceId) {
  assertWorkspaceId(workspaceId);
  if (!state.workspaces[workspaceId]) {
    state.workspaces[workspaceId] = { id: workspaceId, environments: DEFAULT_ENVS(), cases: [], runs: [], events: [], nextSeq: 0 };
  }
  return state.workspaces[workspaceId];
}

function emit(workspace, type, fields = {}) {
  const event = { seq: ++workspace.nextSeq, type, time: new Date().toISOString(), ...fields };
  workspace.events.push(event);
  return event;
}

function assertLoadedState(value) {
  if (!value || typeof value !== 'object' || value.version !== VERSION || !value.workspaces || typeof value.workspaces !== 'object') {
    throw new Error('API Testbench state file has an unsupported or corrupt format; it was left unchanged. Back up the file before repair.');
  }
  for (const [id, workspace] of Object.entries(value.workspaces)) {
    if (!workspace || workspace.id !== id || !Array.isArray(workspace.runs) || !Array.isArray(workspace.cases) || !Array.isArray(workspace.events) || !Array.isArray(workspace.environments)) {
      throw new Error(`API Testbench data for workspace ${id} is invalid; the original file was left unchanged.`);
    }
  }
  value.workspaces = Object.assign(Object.create(null), value.workspaces);
  return value;
}

// The OS releases a SQLite write reservation on process exit. No stale-file
// timeout can revoke a live writer. The data itself stays in the existing JSON file.
function reserve(database) {
  try {
    database.exec('BEGIN IMMEDIATE');
    return true;
  } catch (error) {
    if (error.errcode === 5) return false; // SQLITE_BUSY
    throw error;
  }
}

// Older releases treated a replay as a second completion of the same run.
// Recover the original outcome from its immutable attempt and journal entry.
function restoreLegacyReplays(run, events) {
  let repaired = false;
  for (const testCase of run.cases ?? []) {
    const replays = (testCase.attempts ?? []).filter((attempt) => attempt.parentAttemptId && !attempt.replayVersion);
    if (!replays.length) continue;
    const initial = testCase.attempts.find((attempt) => !attempt.parentAttemptId);
    if (initial) {
      testCase.request = initial.request ?? testCase.request;
      testCase.status = initial.status;
    }
    for (const attempt of replays) attempt.replayVersion = 2;
    repaired = true;
  }
  if (repaired) {
    const firstEnd = events.find((event) => event.runId === run.id && (event.type === 'run.finished' || event.type === 'run.interrupted'));
    if (firstEnd) {
      run.finishedAt = firstEnd.time;
      run.status = firstEnd.status ?? (firstEnd.type === 'run.interrupted' ? 'interrupted' : 'finished');
    }
  }
  return repaired;
}

export class JsonStateStore {
  constructor(filePath, { liveHost = false } = {}) {
    if (typeof filePath !== 'string' || filePath.trim() === '') throw new Error('Configure dataFile with the DSH home data path');
    this.filePath = resolve(filePath);
    this.ownerId = liveHost ? randomUUID() : null;
    this.ownerDirectory = this.filePath + '.owners';
    this.queue = Promise.resolve();
  }

  async load() {
    return assertLoadedState(JSON.parse(await readFile(this.filePath, 'utf8')));
  }

  async initialize() {
    await mkdir(dirname(this.filePath), { recursive: true });
    if (this.ownerId) {
      await mkdir(this.ownerDirectory, { recursive: true });
      this.ownerPath = join(this.ownerDirectory, this.ownerId);
      this.ownerLease = new DatabaseSync(this.ownerPath);
      if (!reserve(this.ownerLease)) throw new Error('Unable to establish the API Testbench host lease.');
    }
    try {
      await this.enqueue(async () => {
        let state;
        try { state = await this.load(); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          await this.writeAtomic(freshState());
          return;
        }
        if (await this.recoverInterrupted(state)) await this.writeAtomic(state);
      });
    } catch (error) {
      await this.close();
      throw error;
    }
    return this;
  }

  async close() {
    await this.queue;
    if (this.ownerLease) {
      this.ownerLease.close();
      this.ownerLease = null;
      await unlink(this.ownerPath).catch((error) => { if (error.code !== 'ENOENT' && error.code !== 'EBUSY') throw error; });
    }
  }

  async ownerAlive(id) {
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return false;
    if (id === this.ownerId && this.ownerLease) return true;
    const file = join(this.ownerDirectory, id);
    if (!existsSync(file)) return false;
    const lease = new DatabaseSync(file);
    let alive;
    try { alive = !reserve(lease); }
    finally { lease.close(); }
    if (!alive) await unlink(file).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    return alive;
  }

  async writeAtomic(state) {
    const tmp = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const text = JSON.stringify(state, null, 2);
    await writeFile(tmp, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    try { await rename(tmp, this.filePath); }
    finally { await unlink(tmp).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
  }

  enqueue(task) {
    const next = this.queue.then(async () => {
      const lock = new DatabaseSync(this.filePath + '.lock');
      try {
        const deadline = Date.now() + 30_000;
        while (!reserve(lock)) {
          if (Date.now() >= deadline) throw new Error('API Testbench storage is busy in another host; retry the operation.');
          await delay(15);
        }
        return await task();
      } finally { lock.close(); }
    });
    this.queue = next.catch(() => {});
    return next;
  }

  async readWorkspace(workspaceId, selector = (workspace) => workspace) {
    await this.queue;
    const workspace = (await this.load()).workspaces[workspaceId];
    return clone(workspace ? selector(workspace) : undefined);
  }

  async readAcrossWorkspaces(selector) {
    await this.queue;
    return clone(selector(await this.load()));
  }

  async mutateWorkspace(workspaceId, mutate) {
    return this.enqueue(async () => {
      const draft = await this.load();
      const workspace = workspaceFor(draft, workspaceId);
      const result = mutate(workspace, (type, fields) => {
        if (type === 'handoff.started' && this.ownerId) {
          const run = workspace.runs.find((item) => item.id === fields.runId);
          const handoff = run?.handoffs?.find((item) => item.requestId === fields.requestId);
          if (handoff) handoff.ownerId = this.ownerId;
        }
        return emit(workspace, type, fields);
      });
      await this.writeAtomic(draft);
      return clone(result);
    });
  }

  async recoverInterrupted(draft) {
    let changed = false;
    const owners = new Map();
    const live = async (id) => {
      if (!owners.has(id)) owners.set(id, await this.ownerAlive(id));
      return owners.get(id);
    };
    for (const workspace of Object.values(draft.workspaces)) {
      for (const run of workspace.runs) {
        if (restoreLegacyReplays(run, workspace.events)) changed = true;
        const orphanRun = run.status === 'running' && !await live(run.ownerId);
        for (const testCase of run.cases ?? []) {
          for (const attempt of testCase.attempts ?? []) {
            if (attempt.status === 'running' && !await live(attempt.ownerId)) {
              attempt.status = 'interrupted';
              attempt.transport = 'interrupted';
              if (!attempt.parentAttemptId) testCase.status = 'interrupted';
              attempt.finishedAt = new Date().toISOString();
              attempt.error = { message: 'Host restarted while this request was in progress; it was not resent.' };
              emit(workspace, 'attempt.interrupted', { sessionId: run.sessionId, runId: run.id, caseId: testCase.id, attemptId: attempt.id });
              changed = true;
            }
          }
          if (orphanRun && !testCase.attempts?.length && testCase.status === 'pending') testCase.status = 'not_sent';
        }
        for (const handoff of run.handoffs ?? []) {
          if (handoff.status !== 'pending' || await live(handoff.ownerId)) continue;
          handoff.status = 'unknown';
          handoff.updatedAt = nowIso();
          handoff.error = 'The previous host stopped before delivery was confirmed. Check the original conversation before sending again.';
          emit(workspace, 'handoff.unknown', { sessionId: run.sessionId, runId: run.id, requestId: handoff.requestId });
          changed = true;
        }
        if (orphanRun) {
          run.status = 'interrupted';
          run.finishedAt = new Date().toISOString();
          emit(workspace, 'run.interrupted', { sessionId: run.sessionId, runId: run.id });
          changed = true;
        }
      }
    }
    return changed;
  }

  async createRun(workspaceId, run) {
    return this.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      if (run.toolCallId) {
        const duplicate = workspace.runs.find((item) => item.sessionId === run.sessionId && item.toolCallId === run.toolCallId);
        if (duplicate) return { run: duplicate, created: false };
      }
      if (run.requestId) {
        const duplicate = workspace.runs.find((item) => item.sessionId === run.sessionId && item.origin === 'user' && item.requestId === run.requestId);
        if (duplicate) {
          if (duplicate.requestFingerprint !== run.requestFingerprint) throw new Error('This manual run requestId was already used with a different request. Start a new manual run.');
          return { run: duplicate, created: false };
        }
      }
      workspace.runs.unshift({ ...run, ...(this.ownerId && { ownerId: this.ownerId }) });
      addEvent('run.created', { sessionId: run.sessionId, runId: run.id, origin: run.origin, title: run.title });
      return { run, created: true };
    });
  }

  async getRun(workspaceId, sessionId, runId) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.runs.find((run) => run.id === runId && run.sessionId === sessionId));
  }

  async listRuns(workspaceId, sessionId, limit = 50) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.runs.filter((run) => run.sessionId === sessionId).slice(0, Math.max(1, Math.min(limit, 100))));
  }

  async findRunForCall(workspaceId, sessionId, toolCallId) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.runs.find((run) => run.sessionId === sessionId && run.toolCallId === toolCallId));
  }

  async findRunForAttempt(workspaceId, sessionId, attemptId) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.runs.find((run) => run.sessionId === sessionId && run.cases?.some((testCase) => testCase.attempts?.some((attempt) => attempt.id === attemptId))));
  }

  async getEvents(workspaceId, sessionId, afterSeq = 0, limit = 200) {
    return this.readWorkspace(workspaceId, (workspace) => {
      const size = Math.max(1, Math.min(limit, 1000));
      const events = workspace.events.filter((event) => event.sessionId === sessionId && event.seq > afterSeq).slice(0, size);
      return { cursor: events.length === size ? events.at(-1).seq : workspace.nextSeq, minSeq: workspace.events[0]?.seq ?? workspace.nextSeq + 1, events };
    });
  }

  async addCase(workspaceId, testCase) {
    return this.mutateWorkspace(workspaceId, (workspace) => {
      workspace.cases.unshift(testCase);
      return testCase;
    });
  }

  async listCases(workspaceId, filter = '') {
    const needle = filter.trim().toLocaleLowerCase();
    return this.readWorkspace(workspaceId, (workspace) => workspace.cases.filter((testCase) => !needle || testCase.name.toLocaleLowerCase().includes(needle) || testCase.request?.url?.toLocaleLowerCase().includes(needle)));
  }

  async getCase(workspaceId, caseId) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.cases.find((testCase) => testCase.id === caseId));
  }

  async upsertEnvironment(workspaceId, environment) {
    return this.mutateWorkspace(workspaceId, (workspace) => {
      const index = workspace.environments.findIndex((item) => item.id === environment.id);
      if (index < 0) workspace.environments.unshift(environment);
      else workspace.environments[index] = environment;
      return environment;
    });
  }

  async getEnvironment(workspaceId, environmentId) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.environments.find((environment) => environment.id === environmentId));
  }

  async listEnvironments(workspaceId) {
    return this.readWorkspace(workspaceId, (workspace) => workspace.environments);
  }

  async addAttempt(workspaceId, runId, caseId, attempt, commandId, eventType = 'attempt.started') {
    return this.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      const run = workspace.runs.find((item) => item.id === runId);
      const testCase = run?.cases?.find((item) => item.id === caseId);
      if (!run || !testCase) throw new Error('The run or case no longer exists');
      if (commandId) {
        const duplicate = testCase.attempts.find((item) => item.commandId === commandId);
        if (duplicate) return { attempt: duplicate, created: false };
      }
      testCase.attempts.push({ ...attempt, ...(this.ownerId && { ownerId: this.ownerId }) });
      addEvent(eventType, { sessionId: run.sessionId, runId, caseId, attemptId: attempt.id, status: attempt.status });
      return { attempt, created: true };
    });
  }

  async beginRetry(workspaceId, runId, caseId, attempt, commandId, requestSnapshot, parentAttemptId, eventType = 'attempt.started') {
    return this.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      const run = workspace.runs.find((item) => item.id === runId);
      const testCase = run?.cases?.find((item) => item.id === caseId);
      if (!run || !testCase) throw new Error('The run or case no longer exists');
      testCase.attempts ??= [];
      const duplicate = testCase.attempts.find((item) => item.commandId === commandId);
      if (duplicate) {
        if (JSON.stringify(duplicate.request) !== JSON.stringify(requestSnapshot) || duplicate.parentAttemptId !== parentAttemptId) {
          throw new Error('This retry request ID was already used with a different request or replay source. Edit the draft and start a new retry.');
        }
        return { attempt: duplicate, created: false };
      }
      if (run.status === 'running' || run.cases.some((item) => item.attempts?.some((entry) => entry.status === 'running'))) {
        throw new Error('Wait for the current API request to finish before retrying.');
      }
      const parent = testCase.attempts.find((item) => item.id === parentAttemptId);
      if (!parent) throw new Error('The selected replay source no longer exists in this case.');
      attempt.parentAttemptId = parent.id;
      attempt.replayVersion = 2;
      testCase.attempts.push({ ...attempt, ...(this.ownerId && { ownerId: this.ownerId }) });
      addEvent(eventType, { sessionId: run.sessionId, runId, caseId, attemptId: attempt.id, status: attempt.status });
      return { attempt, created: true };
    });
  }

  async updateAttempt(workspaceId, runId, caseId, attemptId, update, eventType = 'attempt.updated') {
    return this.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      const run = workspace.runs.find((item) => item.id === runId);
      const testCase = run?.cases?.find((item) => item.id === caseId);
      const attempt = testCase?.attempts?.find((item) => item.id === attemptId);
      if (!run || !testCase || !attempt) throw new Error('The attempt no longer exists');
      Object.assign(attempt, update);
      if (!attempt.parentAttemptId && update.status) testCase.status = update.status;
      addEvent(eventType, { sessionId: run.sessionId, runId, caseId, attemptId, status: attempt.status });
      return attempt;
    });
  }

  async finishRun(workspaceId, runId, status = 'finished') {
    return this.mutateWorkspace(workspaceId, (workspace, addEvent) => {
      const run = workspace.runs.find((item) => item.id === runId);
      if (!run) throw new Error('The run no longer exists');
      if (run.status !== 'running') return run;
      run.status = status;
      run.finishedAt = new Date().toISOString();
      addEvent('run.finished', { sessionId: run.sessionId, runId, status });
      return run;
    });
  }

  async saveCase(workspaceId, testCase) {
    return this.mutateWorkspace(workspaceId, (workspace) => {
      const index = workspace.cases.findIndex((item) => item.id === testCase.id);
      if (index < 0) workspace.cases.unshift(testCase);
      else workspace.cases[index] = testCase;
      return testCase;
    });
  }
}

export function newId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}
