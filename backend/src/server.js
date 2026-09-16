import { createApp } from './app.js';
import { config } from './config.js';
import { initializeDatabase, closeDatabase } from './database/index.js';
import { startMonitorScheduler, stopMonitorScheduler } from './jobs/monitorScheduler.js';
import { startCleanupScheduler, stopCleanupScheduler } from './jobs/cleanupScheduler.js';
import { logger } from './utils/logger.js';

initializeDatabase();
const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info('Backend listening', { port: config.port, timezone: config.timezone });
  startMonitorScheduler();
  startCleanupScheduler();
});

function shutdown(signal) {
  logger.info('Shutting down', { signal });
  stopMonitorScheduler();
  stopCleanupScheduler();
  server.close(() => { closeDatabase(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => logger.error('Unhandled rejection', { error: error?.message }));

