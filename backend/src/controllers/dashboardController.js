import { getDashboard } from '../services/resultService.js';
import { listServices } from '../services/serviceService.js';
import { listIncidents } from '../services/incidentService.js';

export function dashboard(req, res) {
  res.json({
    summary: getDashboard(),
    homeServices: listServices({ category: 'HOME' }).slice(0, 6),
    externalServices: listServices({ category: 'EXTERNAL' }),
    recentIncidents: listIncidents({ limit: 8 })
  });
}

