import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { apiRouter } from './routes/index.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use('/uploads', express.static(path.resolve(config.uploadDir), { dotfiles: 'deny', immutable: true, maxAge: '7d' }));
  app.use('/api', apiRouter);
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((error, req, res, next) => {
    if (req.file?.path) { try { fs.rmSync(req.file.path, { force: true }); } catch {} }
    const status = error.status ?? (error.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
    if (status >= 500) logger.error('Request failed', { method: req.method, path: req.path, error: error.message });
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message, details: error.details });
  });
  return app;
}
