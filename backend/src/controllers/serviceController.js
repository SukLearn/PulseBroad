import { createService, deleteService, getService, listServices, updateService } from '../services/serviceService.js';
import { getResults, getStats } from '../services/resultService.js';
import { listIncidents } from '../services/incidentService.js';

export const servicesController = {
  list(req, res) { res.json(listServices({ category: req.query.category })); },
  get(req, res) { res.json(getService(req.params.id)); },
  create(req, res) {
    const service = createService(req.body, req.file ? `/uploads/${req.file.filename}` : null);
    res.status(201).json(service);
  },
  update(req, res) {
    const service = updateService(req.params.id, req.body, req.file ? `/uploads/${req.file.filename}` : undefined);
    res.json(service);
  },
  remove(req, res) { deleteService(req.params.id); res.status(204).end(); },
  results(req, res) { getService(req.params.id); res.json(getResults(req.params.id, req.query.range)); },
  stats(req, res) { getService(req.params.id); res.json(getStats(req.params.id)); },
  incidents(req, res) { getService(req.params.id); res.json(listIncidents({ serviceId: req.params.id, since: req.query.since })); }
};

