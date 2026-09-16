import { performance } from 'node:perf_hooks';

export function describeFetchError(error) {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'Request timeout';
  const code = error.cause?.code ?? error.code;
  const messages = {
    ECONNREFUSED: 'Connection refused', ENOTFOUND: 'DNS resolution failed', EAI_AGAIN: 'DNS resolution failed',
    EHOSTUNREACH: 'Host unreachable', ENETUNREACH: 'Network unreachable', ECONNRESET: 'Connection reset'
  };
  return messages[code] ?? 'Request failed';
}

export async function monitorHttp(service, { fetchImpl = fetch, defaultTimeoutMs = 10000 } = {}) {
  const checkedAt = new Date().toISOString();
  const started = performance.now();
  try {
    const response = await fetchImpl(service.address, {
      method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(service.timeout_ms ?? defaultTimeoutMs),
      headers: { 'User-Agent': 'ServiceMonitor/1.0' }
    });
    const duration = Number((performance.now() - started).toFixed(2));
    const success = response.status >= 200 && response.status <= 399;
    await response.body?.cancel?.();
    return { checkedAt, status: success ? 'UP' : 'DOWN', responseTime: duration, httpStatus: response.status,
      errorMessage: success ? null : `HTTP ${response.status}` };
  } catch (error) {
    return { checkedAt, status: 'DOWN', responseTime: Number((performance.now() - started).toFixed(2)),
      httpStatus: null, errorMessage: describeFetchError(error) };
  }
}

