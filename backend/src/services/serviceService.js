import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { z } from 'zod';
import { getDb } from '../database/index.js';
import { AppError } from '../utils/errors.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const hostnamePattern = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const serviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(''),
  address: z.string().trim().min(1).max(2048),
  monitor_type: z.enum(['PING', 'HTTP']),
  category: z.enum(['HOME', 'PING']).optional(),
  enabled: z.union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')]).optional(),
  timeout_ms: z.coerce.number().int().min(100).max(120000).nullish()
}).superRefine((value, ctx) => {
  if (value.monitor_type === 'HTTP') {
    try {
      const url = new URL(value.address);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Enter a valid HTTP or HTTPS URL without credentials' });
    }
  } else if (!net.isIP(value.address) && (!hostnamePattern.test(value.address) || /^\d+(?:\.\d+){3}$/.test(value.address))) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: 'Enter a valid IP address or hostname' });
  }
});

const normalizeEnabled = (value) => value === undefined ? 1 : ['true', '1', true].includes(value) ? 1 : 0;

export function validateService(input) {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) throw new AppError(400, 'Invalid service configuration', parsed.error.flatten());
  return {
    ...parsed.data,
    enabled: normalizeEnabled(parsed.data.enabled),
    category: parsed.data.category ?? (parsed.data.monitor_type === 'PING' ? 'PING' : 'HOME')
  };
}

export function listServices({ category } = {}) {
  const db = getDb();
  const where = category ? 'WHERE s.category = ?' : '';
  const query = `SELECT s.*,
    (SELECT i.started_at FROM incidents i WHERE i.service_id=s.id AND i.status='ONGOING' LIMIT 1) AS down_since,
    (SELECT mr.response_time FROM monitoring_results mr WHERE mr.service_id=s.id ORDER BY mr.checked_at DESC LIMIT 1) AS response_time,
    (SELECT mr.average_latency FROM monitoring_results mr WHERE mr.service_id=s.id ORDER BY mr.checked_at DESC LIMIT 1) AS average_latency,
    (SELECT mr.minimum_latency FROM monitoring_results mr WHERE mr.service_id=s.id ORDER BY mr.checked_at DESC LIMIT 1) AS minimum_latency,
    (SELECT mr.maximum_latency FROM monitoring_results mr WHERE mr.service_id=s.id ORDER BY mr.checked_at DESC LIMIT 1) AS maximum_latency,
    (SELECT mr.packet_loss FROM monitoring_results mr WHERE mr.service_id=s.id ORDER BY mr.checked_at DESC LIMIT 1) AS packet_loss,
    (SELECT ROUND(100.0 * SUM(CASE WHEN mr.status IN ('UP','OPERATIONAL','DEGRADED','PARTIAL_OUTAGE','MAINTENANCE') THEN 1 ELSE 0 END) / COUNT(*), 2)
      FROM monitoring_results mr WHERE mr.service_id=s.id AND datetime(mr.checked_at) >= datetime('now','-24 hours')) AS uptime_24h,
    (SELECT ROUND(100.0 * SUM(CASE WHEN mr.status IN ('UP','OPERATIONAL','DEGRADED','PARTIAL_OUTAGE','MAINTENANCE') THEN 1 ELSE 0 END) / COUNT(*), 2)
      FROM monitoring_results mr WHERE mr.service_id=s.id AND datetime(mr.checked_at) >= datetime('now','-7 days')) AS uptime_7d
    FROM services s ${where}
    ORDER BY CASE s.current_status WHEN 'DOWN' THEN 0 WHEN 'MAJOR_OUTAGE' THEN 0 WHEN 'DEGRADED' THEN 1 WHEN 'PARTIAL_OUTAGE' THEN 1 ELSE 2 END, s.name`;
  return category ? db.prepare(query).all(category) : db.prepare(query).all();
}

export function getService(id) {
  const service = getDb().prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!service) throw new AppError(404, 'Service not found');
  return service;
}

export function createService(input, logoPath = null) {
  const data = validateService(input);
  const now = new Date().toISOString();
  const result = getDb().prepare(`INSERT INTO services
    (name, description, address, logo_path, monitor_type, category, enabled, timeout_ms, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      data.name, data.description, data.address, logoPath, data.monitor_type, data.category,
      data.enabled, data.timeout_ms ?? null, now, now
    );
  logger.info('Service added', { serviceId: result.lastInsertRowid, name: data.name });
  return getService(result.lastInsertRowid);
}

export function updateService(id, input, logoPath) {
  const previous = getService(id);
  if (previous.monitor_type === 'STATUS_PAGE') throw new AppError(400, 'Built-in provider configuration cannot be edited');
  const data = validateService(input);
  const nextLogo = logoPath ?? previous.logo_path;
  getDb().prepare(`UPDATE services SET name=?, description=?, address=?, logo_path=?, monitor_type=?, category=?,
    enabled=?, timeout_ms=?, current_status=CASE WHEN ?=0 THEN 'DISABLED' ELSE current_status END, updated_at=? WHERE id=?`).run(
      data.name, data.description, data.address, nextLogo, data.monitor_type, data.category,
      data.enabled, data.timeout_ms ?? null, data.enabled, new Date().toISOString(), id
    );
  if (!data.enabled) {
    const endedAt = new Date().toISOString();
    const ongoing = getDb().prepare("SELECT * FROM incidents WHERE service_id=? AND status='ONGOING'").get(id);
    if (ongoing) getDb().prepare("UPDATE incidents SET status='RESOLVED', ended_at=?, duration_seconds=? WHERE id=?")
      .run(endedAt, Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(ongoing.started_at)) / 1000)), ongoing.id);
  }
  if (logoPath && previous.logo_path) removeLogo(previous.logo_path);
  logger.info('Service edited', { serviceId: Number(id) });
  return getService(id);
}

export function deleteService(id) {
  const service = getService(id);
  if (service.monitor_type === 'STATUS_PAGE') throw new AppError(400, 'Built-in providers cannot be deleted');
  const info = getDb().prepare('DELETE FROM services WHERE id = ?').run(id);
  if (service.logo_path) removeLogo(service.logo_path);
  logger.info('Service deleted', { serviceId: Number(id), name: service.name });
  return info.changes > 0;
}

function removeLogo(logoPath) {
  const filename = path.basename(logoPath);
  const fullPath = path.resolve(config.uploadDir, filename);
  if (fullPath.startsWith(path.resolve(config.uploadDir) + path.sep)) fs.rmSync(fullPath, { force: true });
}
