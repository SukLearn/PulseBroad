import { getDb } from '../database/index.js';
import { AppError } from '../utils/errors.js';

const rangeSeconds = { '1h': 3600, '24h': 86400, '7d': 604800 };

export function getResults(serviceId, range = '24h') {
  if (!rangeSeconds[range]) throw new AppError(400, 'Range must be 1h, 24h, or 7d');
  const since = new Date(Date.now() - rangeSeconds[range] * 1000).toISOString();
  const bucketSeconds = range === '1h' ? 60 : range === '24h' ? 300 : 1800;
  return getDb().prepare(`SELECT
      datetime((CAST(strftime('%s', checked_at) AS INTEGER) / ?) * ?, 'unixepoch') AS checked_at,
      ROUND(AVG(COALESCE(response_time, average_latency)), 2) AS value,
      ROUND(AVG(packet_loss), 2) AS packet_loss,
      CASE WHEN SUM(CASE WHEN status IN ('UP','OPERATIONAL') THEN 1 ELSE 0 END) * 2 >= COUNT(*) THEN 'UP' ELSE 'DOWN' END AS status
    FROM monitoring_results WHERE service_id=? AND checked_at>=?
    GROUP BY CAST(strftime('%s', checked_at) AS INTEGER) / ? ORDER BY checked_at`).all(
      bucketSeconds, bucketSeconds, serviceId, since, bucketSeconds
    );
}

export function getStats(serviceId) {
  const db = getDb();
  const windows = [['uptime_1h', 3600], ['uptime_24h', 86400], ['uptime_7d', 604800]];
  const stats = {};
  for (const [key, seconds] of windows) {
    const since = new Date(Date.now() - seconds * 1000).toISOString();
    const row = db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN status IN ('UP','OPERATIONAL','DEGRADED','PARTIAL_OUTAGE','MAINTENANCE') THEN 1 ELSE 0 END) AS successful
      FROM monitoring_results WHERE service_id=? AND checked_at>=? AND status <> 'UNKNOWN'`).get(serviceId, since);
    stats[key] = row.total ? Number(((row.successful / row.total) * 100).toFixed(2)) : null;
  }
  const since = new Date(Date.now() - 604800000).toISOString();
  const aggregates = db.prepare(`SELECT ROUND(AVG(COALESCE(average_latency, response_time)),2) AS average_response,
    ROUND(MIN(COALESCE(minimum_latency, response_time)),2) AS minimum_response,
    ROUND(MAX(COALESCE(maximum_latency, response_time)),2) AS maximum_response,
    ROUND(AVG(packet_loss),2) AS average_packet_loss,
    COUNT(*) AS samples FROM monitoring_results WHERE service_id=? AND checked_at>=?`).get(serviceId, since);
  return { ...stats, ...aggregates };
}

export function getDashboard() {
  const db = getDb();
  const summary = db.prepare(`SELECT COUNT(*) AS total_services,
    SUM(CASE WHEN current_status IN ('UP','OPERATIONAL') THEN 1 ELSE 0 END) AS online,
    SUM(CASE WHEN current_status IN ('DOWN','MAJOR_OUTAGE') THEN 1 ELSE 0 END) AS offline,
    SUM(CASE WHEN current_status IN ('DEGRADED','PARTIAL_OUTAGE') THEN 1 ELSE 0 END) AS degraded
    FROM services WHERE enabled=1`).get();
  summary.ongoing_incidents = db.prepare("SELECT COUNT(*) AS count FROM incidents WHERE status='ONGOING'").get().count;
  summary.average_response_time = db.prepare(`SELECT ROUND(AVG(COALESCE(response_time, average_latency)),2) AS value
    FROM monitoring_results WHERE checked_at>=? AND status IN ('UP','OPERATIONAL')`).get(new Date(Date.now() - 86400000).toISOString()).value;
  return summary;
}
