import { Router } from 'express';
import { servicesController } from '../controllers/serviceController.js';
import { asyncHandler } from '../utils/errors.js';
import { uploadLogo, verifyUploadedLogo } from '../middleware/upload.js';

export const servicesRouter = Router();
servicesRouter.get('/', asyncHandler(servicesController.list));
servicesRouter.get('/:id', asyncHandler(servicesController.get));
servicesRouter.post('/', uploadLogo, verifyUploadedLogo, asyncHandler(servicesController.create));
servicesRouter.put('/:id', uploadLogo, verifyUploadedLogo, asyncHandler(servicesController.update));
servicesRouter.delete('/:id', asyncHandler(servicesController.remove));
servicesRouter.get('/:id/results', asyncHandler(servicesController.results));
servicesRouter.get('/:id/stats', asyncHandler(servicesController.stats));
servicesRouter.get('/:id/incidents', asyncHandler(servicesController.incidents));

