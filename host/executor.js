const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_PREVIEW_CHARS = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const TEMPLATE_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;
const SENSITIVE_NAME_RE = /(?:authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|token|secret|password|credential)/i;

export function assertRequestShape(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('request must be an object');
  const allowed = new Set(['method', 'url', 'query', 'headers', 'body']);
  for (const key of Object.keys(request)) if (!allowed.has(key)) throw new Error(`Unsupported request field: ${key}`);
  if (typeof request.method !== 'string') throw new Error('request.method is required');
  const method = request.method.toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) throw new Error(`Unsupported HTTP method: ${method}`);
  if (typeof request.url !== 'string' || request.url.trim() === '') throw new Error('request.url is required');
  if (request.query !== undefined && !Array.isArray(request.query)) throw new Error('request.query must be an array');
  if (request.headers !== undefined && !Array.isArray(request.headers)) throw new Error('request.headers must be an array');
  for (const [kind, rows] of [['query', request.query ?? []], ['headers', request.headers ?? []]]) {
    for (const row of rows) {
      if (!row || typeof row !== 'object' || typeof row.name !== 'string' || typeof row.value !== 'string') throw new Error(`Each ${kind} row needs string name and value`);
      if (row.enabled !== undefined && typeof row.enabled !== 'boolean') throw new Error(`${kind}.enabled must be boolean`);
    }
  }
  if (request.body !== undefined) {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !['none', 'json', 'text'].includes(body.kind)) throw new Error('request.body.kind must be none, json, or text');
    if (body.kind === 'text' && typeof body.value !== 'string') throw new Error('text body value must be a string');
    if (body.kind === 'none' && Object.hasOwn(body, 'value')) throw new Error('none body cannot have a value');
    if ((method === 'GET' || method === 'HEAD') && body.kind !== 'none') throw new Error(`${method} requests cannot include a body`);
  }
  return { ...request, method, query: request.query ?? [], headers: request.headers ?? [], body: request.body ?? { kind: 'none' } };
}

export function assertCheckShape(check) {
  if (!check || typeof check !== 'object' || Array.isArray(check)) throw new Error('Each check must be an object');
  if (!['status_equals', 'json_exists', 'json_equals'].includes(check.kind)) throw new Error(`Unsupported check kind: ${String(check.kind)}`);
  if (!['user', 'project', 'agent'].includes(check.basis ?? 'agent')) throw new Error('check.basis must be user, project, or agent');
  if (check.kind === 'status_equals' && (!Number.isInteger(check.expected) || check.expected < 100 || check.expected > 599)) throw new Error('status_equals.expected must be an HTTP status code');
  if (check.kind !== 'status_equals' && typeof check.path !== 'string') throw new Error(`${check.kind}.path is required`);
  if (check.kind === 'json_equals' && !Object.hasOwn(check, 'expected')) throw new Error('json_equals.expected is required');
  if (check.kind !== 'status_equals') parseJsonPath(check.path);
  return { ...check, basis: check.basis ?? 'agent' };
}

export function parseJsonPath(path) {
  if (typeof path !== 'string' || !path.startsWith('$')) throw new Error('JSON path must start with $');
  const tokens = [];
  const re = /(?:\.([A-Za-z_$][A-Za-z0-9_$-]*)|\[(0|[1-9][0-9]*)\])/gy;
  let at = 1;
  while (at < path.length) {
    re.lastIndex = at;
    const match = re.exec(path);
    if (!match) throw new Error(`Unsupported JSON path: ${path}`);
    const key = match[1] ?? match[2];
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') throw new Error('Unsafe JSON path segment');
    tokens.push(match[1] !== undefined ? key : Number(key));
    at = re.lastIndex;
  }
  return tokens;
}

function pathValue(root, path) {
  const tokens = parseJsonPath(path);
  let current = root;
  for (const token of tokens) {
    if (typeof token === 'number') {
      if (!Array.isArray(current) || token >= current.length) return { exists: false };
      current = current[token];
    } else {
      if (current === null || typeof current !== 'object' || !Object.hasOwn(current, token)) return { exists: false };
      current = current[token];
    }
  }
  return { exists: true, value: current };
}

function jsonEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((value, index) => jsonEqual(value, b[index]));
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  return aKeys.length === bKeys.length && aKeys.every((key, index) => key === bKeys[index] && jsonEqual(a[key], b[key]));
}

export function evaluateChecks(checks = [], { status, json, jsonError, bodyTruncated, replay = false }) {
  return checks.map((input) => {
    const check = assertCheckShape(input);
    if (replay && Object.hasOwn(check, 'expected') && containsRedaction(check.expected)) {
      return { ...check, state: 'indeterminate', reason: 'The original expectation was redacted and cannot be compared.' };
    }
    if (check.kind === 'status_equals') {
      const pass = status === check.expected;
      return { ...check, state: pass ? 'passed' : 'failed', actual: status };
    }
    if (bodyTruncated) return { ...check, state: 'indeterminate', reason: 'Response body exceeded the read limit.' };
    if (jsonError) return { ...check, state: 'indeterminate', reason: jsonError };
    const actual = pathValue(json, check.path);
    if (check.kind === 'json_exists') return actual.exists
      ? { ...check, state: 'passed', actual: actual.value }
      : { ...check, state: 'failed', actualMissing: true };
    if (!actual.exists) return { ...check, state: 'failed', actualMissing: true };
    return { ...check, state: jsonEqual(actual.value, check.expected) ? 'passed' : 'failed', actual: actual.value };
  });
}

export function sanitizeChecks(checks = [], secretValues = [], sensitiveFields = []) {
  return checks.map((check) => {
    const field = typeof check.path === 'string' ? check.path.slice(check.path.lastIndexOf('.') + 1).replace(/\[.*$/, '') : '';
    const sensitive = Boolean(field && (SENSITIVE_NAME_RE.test(field) || sensitiveFields.some((name) => name.toLowerCase() === field.toLowerCase())));
    const copy = { ...check };
    for (const key of ['expected', 'actual', 'basisDetail']) {
      if (!Object.hasOwn(copy, key)) continue;
      copy[key] = sensitive ? '[REDACTED]' : redactValue(copy[key], secretValues, sensitiveFields);
    }
    return copy;
  });
}

export function summarizeChecks(checks = []) {
  if (!checks.length) return 'received';
  if (checks.some((check) => check.state === 'failed')) return 'failed';
  if (checks.some((check) => check.state === 'indeterminate')) return 'indeterminate';
  return 'passed';
}

function isSafeTemplateValue(value) {
  return typeof value === 'string' && /^(?:(?:bearer|basic|token|apikey)\s+)?\{\{[A-Za-z_][A-Za-z0-9_]*\}\}$/i.test(value.trim());
}

function replaceSecretText(value, secretValues = []) {
  let result = String(value);
  const secrets = [...new Set(secretValues.filter((item) => typeof item === 'string' && item.length > 0))].sort((a, b) => b.length - a.length);
  for (const secret of secrets) result = result.split(secret).join('[REDACTED]');
  result = result.replace(/(\bBearer\s+)(\{\{[A-Za-z_][A-Za-z0-9_]*\}\}|[^\s,;"']+)/gi, (match, prefix, secret) => isSafeTemplateValue(secret) ? match : `${prefix}[REDACTED]`);
  return result.replace(/(["']?(?:authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|token|secret|password|credential)["']?\s*[:=]\s*["']?)(?:(?:Bearer|Basic|Token|ApiKey)\s+)?(\{\{[A-Za-z_][A-Za-z0-9_]*\}\}|[^\s,"';}&]+)/gi, (match, prefix, secret) => isSafeTemplateValue(secret) ? match : `${prefix}[REDACTED]`);
}

export function sanitizeText(value, { secretValues = [] } = {}) {
  return replaceSecretText(value, secretValues);
}

function redactValue(value, secretValues = [], sensitiveFields = []) {
  if (typeof value === 'string') return replaceSecretText(value, secretValues);
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, secretValues, sensitiveFields));
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_NAME_RE.test(key) || sensitiveFields.some((name) => name.toLowerCase() === key.toLowerCase())) output[key] = isSafeTemplateValue(entry) ? entry : '[REDACTED]';
      else output[key] = redactValue(entry, secretValues, sensitiveFields);
    }
    return output;
  }
  return value;
}

function sanitizeUrl(value, secretValues, sensitiveFields) {
  // A stored URL is a request template. Resolving it here changes the base path
  // used on replay and can reorder or collapse repeated query parameters.
  const [, resource, query, fragment = ''] = /^([^?#]*)(?:\?([^#]*))?(#.*)?$/s.exec(String(value ?? ''));
  const withoutCredentials = resource.replace(/^((?:[a-z][a-z0-9+.-]*:)?\/\/)[^/]*@/i, '$1%5BREDACTED%5D@');
  const path = replaceSecretText(withoutCredentials, secretValues);
  const hash = replaceSecretText(fragment, secretValues);
  if (query === undefined) return path + hash;
  const pairs = query.split('&').map((pair) => {
    const separator = pair.indexOf('=');
    if (separator < 0) return replaceSecretText(pair, secretValues);
    const rawName = pair.slice(0, separator);
    const rawValue = pair.slice(separator + 1);
    const decode = (part) => new URLSearchParams('v=' + part).get('v');
    const name = decode(rawName);
    const decodedValue = decode(rawValue);
    let safe = rawValue;
    if ((SENSITIVE_NAME_RE.test(name) || sensitiveFields.some((field) => field.toLowerCase() === name.toLowerCase()))
      && !isSafeTemplateValue(decodedValue)) safe = '%5BREDACTED%5D';
    else if (replaceSecretText(decodedValue, secretValues) !== decodedValue) safe = encodeURIComponent(replaceSecretText(decodedValue, secretValues));
    return replaceSecretText(rawName, secretValues) + '=' + safe;
  });
  return path + '?' + pairs.join('&') + hash;
}

export function sanitizeRequest(request, { secretValues = [], sensitiveFields = [] } = {}) {
  if (!request) return request;
  return {
    method: request.method,
    url: sanitizeUrl(request.url ?? '', secretValues, sensitiveFields),
    query: (request.query ?? []).map((row) => ({
      name: row.name,
      value: SENSITIVE_NAME_RE.test(row.name) || sensitiveFields.some((name) => name.toLowerCase() === row.name.toLowerCase())
        ? (isSafeTemplateValue(row.value) ? row.value : '[REDACTED]')
        : replaceSecretText(row.value, secretValues),
      ...(row.enabled === false ? { enabled: false } : {}),
    })),
    headers: (request.headers ?? []).map((row) => ({
      name: row.name,
      value: SENSITIVE_NAME_RE.test(row.name) || sensitiveFields.some((name) => name.toLowerCase() === row.name.toLowerCase())
        ? (isSafeTemplateValue(row.value) ? row.value : '[REDACTED]')
        : replaceSecretText(row.value, secretValues),
      ...(row.enabled === false ? { enabled: false } : {}),
    })),
    body: request.body?.kind === 'json'
      ? { kind: 'json', value: redactValue(request.body.value, secretValues, sensitiveFields) }
      : request.body?.kind === 'text'
        ? { kind: 'text', value: replaceSecretText(request.body.value, secretValues) }
        : { kind: 'none' },
  };
}

export function sanitizeResponseBody(text, contentType, { secretValues = [], sensitiveFields = [], bodyTruncated = false } = {}) {
  let safe = text;
  let parsed;
  let jsonError;
  try {
    parsed = JSON.parse(text);
    safe = JSON.stringify(redactValue(parsed, secretValues, sensitiveFields), null, 2);
  } catch {
    jsonError = 'Response body is not valid JSON.';
    safe = sensitiveFields.length || (bodyTruncated && /json/i.test(contentType))
      ? '[Preview withheld: incomplete or unstructured content could not be safely redacted.]'
      : replaceSecretText(text, secretValues);
  }
  return {
    bodyPreview: safe.slice(0, MAX_PREVIEW_CHARS),
    previewTruncated: safe.length > MAX_PREVIEW_CHARS,
    json: parsed,
    jsonError: parsed === undefined ? jsonError : undefined,
  };
}

async function resolveText(text, environment, credentials, secretValues, missing) {
  const input = String(text);
  const matches = [...input.matchAll(TEMPLATE_RE)];
  let output = input;
  for (const match of matches) {
    const variable = match[1];
    let value;
    if (Object.hasOwn(environment.variables ?? {}, variable)) value = String(environment.variables[variable]);
    else if (Object.hasOwn(environment.credentialRefs ?? {}, variable)) {
      const ref = environment.credentialRefs[variable];
      const hit = await credentials?.resolve?.(ref);
      if (hit?.value) { value = hit.value; secretValues.push(hit.value); }
    }
    if (value === undefined) { missing.add(variable); continue; }
    output = output.split(match[0]).join(value);
  }
  return output;
}

async function resolveJson(value, environment, credentials, secretValues, missing) {
  if (typeof value === 'string') return resolveText(value, environment, credentials, secretValues, missing);
  if (Array.isArray(value)) return Promise.all(value.map((item) => resolveJson(item, environment, credentials, secretValues, missing)));
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = await resolveJson(item, environment, credentials, secretValues, missing);
    return output;
  }
  return value;
}

export async function buildRequest(input, environment, credentials, { sensitiveFields = [] } = {}) {
  const request = assertRequestShape(input);
  if (!environment || typeof environment !== 'object') throw new Error(`Environment "${environment?.id ?? 'unknown'}" is unavailable`);
  const secretValues = [];
  const missing = new Set();
  const rawUrl = await resolveText(request.url, environment, credentials, secretValues, missing);
  let url;
  try {
    url = new URL(rawUrl, environment.baseUrl || undefined);
  } catch {
    throw new Error('Invalid URL or missing base URL for this environment.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP and HTTPS URLs are allowed');
  if (url.username || url.password) throw new Error('Credentials in the URL are not allowed; use a credential reference in a header');
  for (const row of request.query) {
    if (row.enabled === false) continue;
    const name = await resolveText(row.name, environment, credentials, secretValues, missing);
    const value = await resolveText(row.value, environment, credentials, secretValues, missing);
    url.searchParams.append(name, value);
  }
  const headers = new Headers();
  for (const row of request.headers) {
    if (row.enabled === false) continue;
    const name = await resolveText(row.name, environment, credentials, secretValues, missing);
    const value = await resolveText(row.value, environment, credentials, secretValues, missing);
    headers.append(name, value);
  }
  let body;
  if (request.body.kind === 'json') {
    const jsonValue = await resolveJson(request.body.value, environment, credentials, secretValues, missing);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    body = JSON.stringify(jsonValue);
  } else if (request.body.kind === 'text') body = await resolveText(request.body.value, environment, credentials, secretValues, missing);
  if (missing.size) throw new Error(`Missing environment variable(s): ${[...missing].join(', ')}`);
  const safeRequest = sanitizeRequest(request, { secretValues, sensitiveFields });
  return {
    url: url.toString(),
    init: { method: request.method, headers, ...(body === undefined ? {} : { body }) },
    safeRequest,
    secretValues,
    sensitiveFields,
  };
}

async function readBody(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) return { text: '', truncated: false };
  const chunks = [];
  let total = 0;
  let truncated = false;
  try {
    while (true) {
      signal?.throwIfAborted?.();
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_RESPONSE_BYTES - total;
      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, Math.max(0, remaining)));
        total = MAX_RESPONSE_BYTES;
        truncated = true;
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return { text: new TextDecoder().decode(joined), truncated };
}

function safeResponseHeaders(headers, secretValues = [], sensitiveFields = []) {
  const output = [];
  headers.forEach((value, name) => {
    output.push({ name, value: SENSITIVE_NAME_RE.test(name) || sensitiveFields.some((field) => field.toLowerCase() === name.toLowerCase()) ? '[REDACTED]' : replaceSecretText(value, secretValues) });
  });
  return output;
}

export async function executeHttp(input, environment, credentials, { signal, timeoutMs = DEFAULT_TIMEOUT_MS, sensitiveFields = [], checks = [], replay = false, fetchImpl = globalThis.fetch } = {}) {
  let built;
  try {
    built = await buildRequest(input, environment, credentials, { sensitiveFields });
  } catch (error) {
    return { transport: 'not_sent', error: { message: error instanceof Error ? error.message : 'Request could not be prepared.' } };
  }
  const controller = new AbortController();
  let timedOut = false;
  const relayAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) relayAbort();
  else signal?.addEventListener('abort', relayAbort, { once: true });
  const timeout = setTimeout(() => { timedOut = true; controller.abort(new Error('timeout')); }, timeoutMs);
  const startedAt = Date.now();
  try {
    if (typeof fetchImpl !== 'function') throw new Error('HTTP transport is unavailable.');
    const response = await fetchImpl(built.url, { ...built.init, signal: controller.signal, redirect: 'manual' });
    const body = await readBody(response, controller.signal);
    const contentType = response.headers.get('content-type') ?? '';
    const sanitized = sanitizeResponseBody(body.text, contentType, { secretValues: built.secretValues, sensitiveFields, bodyTruncated: body.truncated });
    const rawChecks = evaluateChecks(checks, { status: response.status, json: sanitized.json, jsonError: sanitized.jsonError, bodyTruncated: body.truncated, replay });
    const checkResults = sanitizeChecks(rawChecks, built.secretValues, sensitiveFields);
    return {
      transport: 'response',
      durationMs: Math.max(0, Date.now() - startedAt),
      request: built.safeRequest,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: safeResponseHeaders(response.headers, built.secretValues, sensitiveFields),
        bodyPreview: sanitized.bodyPreview,
        previewTruncated: sanitized.previewTruncated,
        bodyTruncated: body.truncated,
        contentType,
      },
      checks: checkResults,
      result: summarizeChecks(checkResults),
    };
  } catch (error) {
    const transport = timedOut ? 'timed_out' : signal?.aborted ? 'cancelled' : 'send_failed';
    return {
      transport,
      durationMs: Math.max(0, Date.now() - startedAt),
      request: built.safeRequest,
      error: { message: timedOut ? `Request timed out after ${timeoutMs} ms.` : signal?.aborted ? 'Request was cancelled.' : 'The request could not be sent or the connection was interrupted.' },
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', relayAbort);
  }
}

export function attemptStatusFromResult(result) {
  if (result.transport === 'response') return result.result;
  return result.transport;
}

export function diffRequests(left, right) {
  const diffs = [];
  const walk = (a, b, path) => {
    if (jsonEqual(a, b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const key of keys) walk(a[key], b[key], path ? `${path}.${key}` : key);
      return;
    }
    diffs.push({ field: path || '$', before: a === undefined ? { missing: true } : a, after: b === undefined ? { missing: true } : b });
  };
  walk(left, right, '');
  return diffs;
}

export function containsRedaction(value) {
  if (typeof value === 'string') return /\[REDACTED\]|%5BREDACTED%5D/i.test(value);
  if (value && typeof value === 'object') return Object.values(value).some(containsRedaction);
  return false;
}

export function assertSafeForReplay(request) {
  if (containsRedaction(request)) throw new Error('The saved request contains a redacted secret. Add a credential reference or enter the value in the edited copy before sending.');
}

export const limits = Object.freeze({ maxResponseBytes: MAX_RESPONSE_BYTES, maxPreviewChars: MAX_PREVIEW_CHARS, defaultTimeoutMs: DEFAULT_TIMEOUT_MS });
