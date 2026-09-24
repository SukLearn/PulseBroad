import { getDb } from '../database/index.js';
import { monitorHttp } from './httpMonitor.js';
import { monitorPing } from './pingMonitor.js';
import { monitorProvider } from '../status-providers/index.js';
import { evaluateIncident } from '../services/incidentService.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export async function checkService(service, dependencies = {}) {
  let result;
  try {
    if (service.monitor_type === 'HTTP') result = await monitorHttp(service, { defaultTimeoutMs: config.httpTimeoutMs, ...dependencies });
    else if (service.monitor_type === 'PING') result = await monitorPing(service, dependencies);
    else result = await monitorProvider(service, { defaultTimeoutMs: config.httpTimeoutMs, ...dependencies });
  } catch (error) {
    logger.warn('Monitor adapter failed', { serviceId: service.id, error: error.message });
    result = { checkedAt: new Date().toISOString(), status: 'UNKNOWN', errorMessage: 'Provider check failed' };
  }
  return persistResult(service, result) ? result : null;
}

export function persistResult(service, result, database = getDb()) {
  const transaction = database.transaction(() => {
    const current = database.prepare('SELECT address, monitor_type, provider_key, enabled FROM services WHERE id=?').get(service.id);
    if (!current || !current.enabled || current.address !== service.address ||
      current.monitor_type !== service.monitor_type || current.provider_key !== service.provider_key) return false;
    database.prepare(`INSERT INTO monitoring_results
      (service_id, checked_at, status, response_time, packets_sent, packets_received, packet_loss,
       minimum_latency, maximum_latency, average_latency, http_status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        service.id, result.checkedAt, result.status, result.responseTime ?? null,
        result.packetsSent ?? null, result.packetsReceived ?? null, result.packetLoss ?? null,
        result.minimumLatency ?? null, result.maximumLatency ?? null, result.averageLatency ?? null,
        result.httpStatus ?? null, result.errorMessage ?? null
      );
    if (service.monitor_type === 'STATUS_PAGE') {
      database.prepare('INSERT INTO provider_status(service_id, provider_status, message, checked_at) VALUES (?, ?, ?, ?)')
        .run(service.id, result.status, result.message ?? result.errorMessage ?? null, result.checkedAt);
    }
    database.prepare('UPDATE services SET current_status=?, current_message=?, last_checked_at=? WHERE id=?')
      .run(result.status, result.message ?? result.errorMessage ?? null, result.checkedAt, service.id);
    evaluateIncident(service, result, database);
    return true;
  });
  return transaction();
}
