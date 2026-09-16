import { getDb } from '../database/index.js';
import { logger } from '../utils/logger.js';

const unavailableStatuses = new Set(['DOWN', 'MAJOR_OUTAGE']);

export function evaluateIncident(service, result, database = getDb()) {
  const ongoing = database.prepare("SELECT * FROM incidents WHERE service_id=? AND status='ONGOING'").get(service.id);
  const failed = unavailableStatuses.has(result.status);
  if (result.status === 'UNKNOWN' || result.status === 'DISABLED') return 'UNCHANGED';
  if (failed && !ongoing) {
    database.prepare(`INSERT INTO incidents(service_id, started_at, status, created_at)
      VALUES (?, ?, 'ONGOING', ?)`).run(service.id, result.checkedAt, result.checkedAt);
    logger.warn('Incident started', { serviceId: service.id, name: service.name, startedAt: result.checkedAt });
    return 'STARTED';
  }
  if (!failed && ongoing) {
    const duration = Math.max(0, Math.round((Date.parse(result.checkedAt) - Date.parse(ongoing.started_at)) / 1000));
    database.prepare(`UPDATE incidents SET ended_at=?, duration_seconds=?, status='RESOLVED' WHERE id=?`)
      .run(result.checkedAt, duration, ongoing.id);
    logger.info('Incident resolved', { serviceId: service.id, incidentId: ongoing.id, durationSeconds: duration });
    return 'RESOLVED';
  }
  return 'UNCHANGED';
}

export function listIncidents({ since, serviceId, limit = 200 } = {}) {
  const conditions = [];
  const parameters = [];
  if (since) { conditions.push('(i.started_at >= ? OR i.ended_at IS NULL OR i.ended_at >= ?)'); parameters.push(since, since); }
  if (serviceId) { conditions.push('i.service_id = ?'); parameters.push(serviceId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  parameters.push(Math.min(Number(limit) || 200, 500));
  return getDb().prepare(`SELECT i.*, s.name AS service_name, s.category, s.logo_path
    FROM incidents i JOIN services s ON s.id=i.service_id ${where}
    ORDER BY i.started_at DESC LIMIT ?`).all(...parameters);
}
