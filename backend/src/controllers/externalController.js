import { getService, listServices } from '../services/serviceService.js';
import { getDb } from '../database/index.js';
import { AppError } from '../utils/errors.js';

export function listExternal(req, res) { res.json(listServices({ category: 'EXTERNAL' })); }

export function getExternal(req, res) {
  const service = getService(req.params.id);
  if (service.category !== 'EXTERNAL') throw new AppError(404, 'External service not found');
  const history = getDb().prepare('SELECT * FROM provider_status WHERE service_id=? ORDER BY checked_at DESC LIMIT 500').all(service.id);
  res.json({ ...service, history });
}

