import { XMLParser } from 'fast-xml-parser';

const feedUrl = 'https://status.aws.amazon.com/rss/all.rss';
const openWords = /investigating|degraded|disruption|increased error|service unavailable|elevated/i;
const resolvedWords = /resolved|operating normally|informational message/i;

export async function checkAws({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const response = await fetchImpl(feedUrl, {
    signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'ServiceMonitor/1.0', Accept: 'application/rss+xml, application/xml' }
  });
  if (!response.ok) throw new Error(`AWS health feed returned HTTP ${response.status}`);
  const xml = await response.text();
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const rawItems = parsed?.rss?.channel?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const active = items.find((item) => {
    const text = `${item.title ?? ''} ${item.description ?? ''}`;
    const published = Date.parse(item.pubDate ?? 0);
    return published >= recentCutoff && openWords.test(text) && !resolvedWords.test(text);
  });
  if (!active) return { provider: 'AWS', status: 'OPERATIONAL', message: 'No current public service events', checkedAt: new Date().toISOString() };
  const text = String(active.title ?? active.description ?? 'AWS public service event').replace(/<[^>]*>/g, '').slice(0, 300);
  return { provider: 'AWS', status: /outage|unavailable/i.test(text) ? 'MAJOR_OUTAGE' : 'DEGRADED', message: text, checkedAt: new Date().toISOString() };
}

