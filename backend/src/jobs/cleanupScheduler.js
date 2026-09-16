import { getDb } from '../database/index.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let timer;

export function cleanupOldData(database = getDb(), now = new Date()) {
  const cutoff = new Date(now.getTime() - config.retentionDays * 86400000).toISOString();
  const transaction = database.transaction(() => {
    const results = database.prepare('DELETE FROM monitoring_results WHERE checked_at < ?').run(cutoff).changes;
    const providers = database.prepare('DELETE FROM provider_status WHERE checked_at < ?').run(cutoff).changes;
    const incidents = database.prepare("DELETE FROM incidents WHERE status='RESOLVED' AND ended_at < ?").run(cutoff).changes;
    return { results, providers, incidents, cutoff };
  });
  const deleted = transaction();
  logger.info('Database cleanup completed', deleted);
  return deleted;
}

export function startCleanupScheduler() {
  cleanupOldData();
  timer = setInterval(() => {
    try { cleanupOldData(); }
    catch (error) { logger.error('Database cleanup failed', { error: error.message }); }
  }, config.cleanupIntervalSeconds * 1000);
}

export function stopCleanupScheduler() { clearInterval(timer); }

