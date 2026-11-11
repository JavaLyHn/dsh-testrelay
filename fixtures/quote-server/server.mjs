import http from 'node:http';
import { pathToFileURL } from 'node:url';

const A_DELAY_MS = 3500;
const MAX_REQUEST_BYTES = 128 * 1024;

export async function createQuoteFixture({ host = '127.0.0.1', port = 0, delayMs = A_DELAY_MS, log = () => {} } = {}) {
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 25000) throw new Error('Fixture delay must be an integer from 0 to 25000 ms');
  let requests = [];
  const server = http.createServer(async (req, res) => {
    const startedAt = new Date().toISOString();
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BYTES) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'request body too large' }));
        return;
      }
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');

    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true, service: 'dsh-api-testbench-quote-fixture' });
    }
    if (req.method === 'GET' && req.url === '/__counts') {
      const counts = {};
      for (const item of requests) counts[item.coupon ?? '(missing)'] = (counts[item.coupon ?? '(missing)'] ?? 0) + 1;
      return json(res, 200, { total: requests.length, counts, requests });
    }
    if (req.method === 'POST' && req.url === '/__reset') {
      requests = [];
      return json(res, 200, { reset: true });
    }
    if (req.method === 'GET' && req.url?.startsWith('/value/')) {
      const variant = req.url.slice('/value/'.length).split('?')[0];
      const values = {
        number: { value: 0 },
        string: { value: '0' },
        null: { value: null },
        missing: { other: 'no value field' },
      };
      return json(res, values[variant] ? 200 : 404, values[variant] ?? { error: 'unknown value variant' });
    }
    if (req.method !== 'POST' || req.url !== '/quote') return json(res, 404, { error: 'not found' });

    let body;
    try { body = text ? JSON.parse(text) : {}; }
    catch { return json(res, 400, { error: 'body must be JSON' }); }
    const coupon = typeof body.coupon === 'string' ? body.coupon : undefined;
    const index = requests.length + 1;
    const requestDelay = coupon === 'EXPIRED_A' ? delayMs : 0;
    const requestRecord = { index, method: req.method, coupon: coupon ?? null, startedAt, delayMs: requestDelay };
    requests.push(requestRecord);
    log(JSON.stringify({ event: 'received', ...requestRecord }));

    if (requestDelay > 0) await new Promise((resolve) => setTimeout(resolve, requestDelay));
    const discount = coupon === 'VALID10' || coupon === 'EXPIRED_A' ? 10 : coupon === 'EXPIRED_B' ? 0 : null;
    const status = coupon === 'VALID10' || coupon === 'EXPIRED_A' || coupon === 'EXPIRED_B' ? 200 : 400;
    requestRecord.completedAt = new Date().toISOString();
    requestRecord.status = status;
    requestRecord.discount = discount;
    log(JSON.stringify({ event: 'responded', ...requestRecord }));
    return json(res, status, { coupon: coupon ?? null, discount });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    server,
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    requests: () => requests.map((item) => ({ ...item })),
  };
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2] ?? process.env.API_TESTBENCH_PORT ?? '0';
  const port = Number(arg);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 through 65535');
  const delayMs = Number(process.argv[3] ?? A_DELAY_MS);
  const fixture = await createQuoteFixture({ port, delayMs, log: (line) => process.stdout.write(`${line}\n`) });
  process.stdout.write(`QUOTE_FIXTURE_LISTENING ${fixture.url}\n`);
  const shutdown = async () => { await fixture.close(); process.exit(0); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
