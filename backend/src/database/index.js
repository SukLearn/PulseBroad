import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let db;

export function initializeDatabase(databasePath = config.databasePath, { seed = true } = {}) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.mkdirSync(config.uploadDir, { recursive: true });
  db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));
  if (seed) seedProviders();
  logger.info('Database initialized', { path: databasePath });
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database is not initialized');
  return db;
}

export function closeDatabase() {
  db?.close();
  db = undefined;
}

function seedProviders() {
  const now = new Date().toISOString();
  const providers = [
    ['Google Workspace', 'Official Google Workspace service health', 'https://www.google.com/appsstatus/dashboard/', 'google'],
    ['Cloudflare', 'Official Cloudflare system status', 'https://www.cloudflarestatus.com/', 'cloudflare'],
    ['AWS', 'Official AWS Service Health Dashboard', 'https://health.aws.amazon.com/health/status', 'aws']
  ];
  const insert = db.prepare(`INSERT INTO services
    (name, description, address, monitor_type, category, provider_key, enabled, created_at, updated_at)
    SELECT ?, ?, ?, 'STATUS_PAGE', 'EXTERNAL', ?, 1, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM services WHERE provider_key = ?)`);
  const transaction = db.transaction(() => {
    for (const [name, description, address, key] of providers) {
      insert.run(name, description, address, key, now, now, key);
    }
  });
  transaction();
}

