import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorHttp } from '../src/monitoring/httpMonitor.js';

const service = { address: 'http://example.test', timeout_ms: 1000 };
const response = (status) => async () => ({ status, body: { cancel: async () => {} } });

for (const status of [200, 301]) test(`HTTP ${status} is reachable`, async () => {
  const result = await monitorHttp(service, { fetchImpl: response(status) }); assert.equal(result.status, 'UP'); assert.equal(result.httpStatus, status);
});
for (const status of [404, 500]) test(`HTTP ${status} is failed`, async () => {
  const result = await monitorHttp(service, { fetchImpl: response(status) }); assert.equal(result.status, 'DOWN'); assert.equal(result.errorMessage, `HTTP ${status}`);
});
test('timeout is reported safely', async () => {
  const result = await monitorHttp(service, { fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); } });
  assert.equal(result.status, 'DOWN'); assert.equal(result.errorMessage, 'Request timeout');
});
test('connection refused is reported safely', async () => {
  const result = await monitorHttp(service, { fetchImpl: async () => { const error = new Error('fetch failed'); error.cause = { code: 'ECONNREFUSED' }; throw error; } });
  assert.equal(result.errorMessage, 'Connection refused');
});

