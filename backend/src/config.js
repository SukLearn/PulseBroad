import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: [path.resolve('.env'), path.resolve('../.env')] });

const integer = (name, fallback, min = 1) => {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isFinite(value) || value < min) throw new Error(`Invalid ${name}`);
  return value;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: integer('BACKEND_PORT', 4000),
  databasePath: process.env.DATABASE_PATH ?? path.resolve('data/monitor.db'),
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve('data/uploads'),
  monitorIntervalSeconds: integer('MONITOR_INTERVAL_SECONDS', 60),
  cleanupIntervalSeconds: integer('CLEANUP_INTERVAL_SECONDS', 3600),
  retentionDays: integer('RETENTION_DAYS', 7),
  httpTimeoutMs: integer('HTTP_TIMEOUT_MS', 10000, 100),
  concurrency: integer('MONITOR_CONCURRENCY', 8),
  timezone: process.env.APP_TIMEZONE ?? 'Asia/Tbilisi',
  logLevel: process.env.LOG_LEVEL ?? 'info'
};
