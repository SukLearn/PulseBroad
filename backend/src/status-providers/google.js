const clean = (text) => String(text ?? '').replace(/[*#_`]/g, '').replace(/\s+/g, ' ').trim();

export async function checkGoogle({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const response = await fetchImpl('https://www.google.com/appsstatus/dashboard/incidents.json', {
    signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'ServiceMonitor/1.0' }
  });
  if (!response.ok) throw new Error(`Google status feed returned HTTP ${response.status}`);
  const incidents = await response.json();
  const active = Array.isArray(incidents) ? incidents.filter((incident) => !incident.end) : [];
  if (!active.length) return { provider: 'Google Workspace', status: 'OPERATIONAL', message: 'All services available', checkedAt: new Date().toISOString() };
  const rank = { high: 3, medium: 2, low: 1 };
  active.sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0));
  const primary = active[0];
  const impact = primary.status_impact ?? primary.most_recent_update?.status;
  const status = impact === 'SERVICE_OUTAGE' || primary.severity === 'high' ? 'MAJOR_OUTAGE'
    : impact === 'SERVICE_DISRUPTION' ? 'PARTIAL_OUTAGE' : 'DEGRADED';
  const summary = clean(primary.external_desc ?? primary.most_recent_update?.text).slice(0, 300);
  return { provider: 'Google Workspace', status, message: `${primary.service_name ?? 'Workspace'}: ${summary}`, checkedAt: new Date().toISOString() };
}

