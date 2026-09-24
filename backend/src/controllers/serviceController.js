import { createService, deleteService, getService, listServices, updateService } from '../services/serviceService.js';
import { getResults, getStats } from '../services/resultService.js';
import { listIncidents } from '../services/incidentService.js';
import { queueServiceCheck } from '../jobs/monitorScheduler.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

function checkSoon(service) {
  if (!service.enabled) return;
  void queueServiceCheck(service.id).then((result) => {
    if (!result) return queueServiceCheck(service.id);
    return result;
  }).catch((error) => logger.error('Initial service check failed', { serviceId: service.id, error: error.message }));
}

export const servicesController = {
  list(req, res) { res.json(listServices({ category: req.query.category })); },
  get(req, res) { res.json(getService(req.params.id)); },
  create(req, res) {
    const service = createService(req.body, req.file ? `/uploads/${req.file.filename}` : null);
    checkSoon(service);
    res.status(201).json(service);
  },
  update(req, res) {
    const service = updateService(req.params.id, req.body, req.file ? `/uploads/${req.file.filename}` : undefined);
    checkSoon(service);
    res.json(service);
  },
  async check(req, res) {
    const service = getService(req.params.id);
    if (!service.enabled) throw new AppError(409, 'Enable this service before checking it');
    let result = await queueServiceCheck(service.id);
    if (!result) result = await queueServiceCheck(service.id);
    if (!result) throw new AppError(409, 'Service changed while the check was running; try again');
    res.json({ service: getService(service.id), result });
  },
  remove(req, res) { deleteService(req.params.id); res.status(204).end(); },
  results(req, res) { getService(req.params.id); res.json(getResults(req.params.id, req.query.range)); },
  stats(req, res) { getService(req.params.id); res.json(getStats(req.params.id)); },
  incidents(req, res) { getService(req.params.id); res.json(listIncidents({ serviceId: req.params.id, since: req.query.since })); }
};
