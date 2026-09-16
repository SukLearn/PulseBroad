import pLimit from 'p-limit';
import { getDb } from '../database/index.js';
import { checkService } from '../monitoring/monitoringService.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const locks = new Set();
let timer;
let stopped = false;

export async function runMonitoringCycle() {
  const services = getDb().prepare('SELECT * FROM services WHERE enabled=1').all();
  const limit = pLimit(config.concurrency);
  await Promise.allSettled(services.map((service) => limit(async () => {
    if (locks.has(service.id)) {
      logger.warn('Skipped overlapping service check', { serviceId: service.id });
      return;
    }
    locks.add(service.id);
    try { await checkService(service); }
    catch (error) { logger.error('Service check failed unexpectedly', { serviceId: service.id, error: error.message }); }
    finally { locks.delete(service.id); }
  })));
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

