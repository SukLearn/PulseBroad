import { Router } from 'express';
import { servicesRouter } from './services.js';
import { dashboard } from '../controllers/dashboardController.js';
import { incidents } from '../controllers/incidentController.js';
import { getExternal, listExternal } from '../controllers/externalController.js';
import { asyncHandler } from '../utils/errors.js';

export const apiRouter = Router();
apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));
apiRouter.use('/services', servicesRouter);
apiRouter.get('/dashboard', asyncHandler(dashboard));
apiRouter.get('/incidents', asyncHandler(incidents));
apiRouter.get('/external-services', asyncHandler(listExternal));
apiRouter.get('/external-services/:id', asyncHandler(getExternal));

