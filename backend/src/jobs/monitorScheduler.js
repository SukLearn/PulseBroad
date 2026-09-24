import pLimit from 'p-limit';
import { getDb } from '../database/index.js';
import { checkService } from '../monitoring/monitoringService.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const limit = pLimit(config.concurrency);
const activeChecks = new Map();
let timer;
let stopped = false;

export function queueServiceCheck(serviceId) {
  const id = Number(serviceId);
  if (activeChecks.has(id)) return activeChecks.get(id);
  const check = limit(async () => {
    const service = getDb().prepare('SELECT * FROM services WHERE id=? AND enabled=1').get(id);
    if (!service) return null;
    return checkService(service);
  });
  activeChecks.set(id, check);
  void check.finally(() => activeChecks.delete(id)).catch(() => {});
  return check;
}

export async function runMonitoringCycle() {
  const ids = getDb().prepare('SELECT id FROM services WHERE enabled=1').all();
  const results = await Promise.allSettled(ids.map(({ id }) => queueServiceCheck(id)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') logger.error('Service check failed unexpectedly', { serviceId: ids[index].id, error: result.reason?.message });
  });
}

export function startMonitorScheduler() {
  stopped = false;
  const schedule = async () => {
    if (stopped) return;
    const started = Date.now();
    try { await runMonitoringCycle(); }
    catch (error) { logger.error('Scheduler error', { error: error.message }); }
    const delay = Math.max(1000, config.monitorIntervalSeconds * 1000 - (Date.now() - started));
    timer = setTimeout(schedule, delay);
  };
  timer = setTimeout(schedule, 1000);
  logger.info('Monitoring started', { intervalSeconds: config.monitorIntervalSeconds, concurrency: config.concurrency });
}

export function stopMonitorScheduler() {
  stopped = true;
  clearTimeout(timer);
}
