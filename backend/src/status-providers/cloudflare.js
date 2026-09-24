const statusMap = { none: 'OPERATIONAL', minor: 'DEGRADED', major: 'PARTIAL_OUTAGE', critical: 'MAJOR_OUTAGE' };

export async function checkCloudflare({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const response = await fetchImpl('https://www.cloudflarestatus.com/api/v2/summary.json', {
    signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'ServiceMonitor/1.0' }
  });
  if (!response.ok) throw new Error(`Cloudflare status API returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.status?.indicator) throw new Error('Invalid Cloudflare status response');
  const incident = data.incidents?.find((item) => item.status !== 'resolved');
  const maintenance = data.scheduled_maintenances?.find((item) => item.status === 'in_progress');
  return {
    provider: 'Cloudflare', status: maintenance && data.status?.indicator === 'none' ? 'MAINTENANCE' : statusMap[data.status?.indicator] ?? 'UNKNOWN',
    message: incident?.name ?? maintenance?.name ?? data.status?.description ?? 'Status unavailable',
    checkedAt: new Date().toISOString()
  };
}
