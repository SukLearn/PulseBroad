import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDatabase, getDb, initializeDatabase } from '../src/database/index.js';
import { cleanupOldData } from '../src/jobs/cleanupScheduler.js';

test('cleanup removes measurements and resolved incidents older than seven days', () => {
  initializeDatabase(':memory:', { seed: false });
  const db = getDb(); const now = new Date('2026-09-16T12:00:00.000Z');
  const serviceId = db.prepare(`INSERT INTO services(name,address,monitor_type,category,created_at,updated_at) VALUES('Test','1.1.1.1','PING','PING',?,?)`).run(now.toISOString(), now.toISOString()).lastInsertRowid;
  const addResult = db.prepare("INSERT INTO monitoring_results(service_id,checked_at,status) VALUES(?,?,'UP')");
  addResult.run(serviceId, '2026-09-08T11:59:59.000Z'); addResult.run(serviceId, '2026-09-15T12:00:00.000Z');
  db.prepare("INSERT INTO provider_status(service_id,provider_status,checked_at) VALUES(?,'OPERATIONAL',?)").run(serviceId, '2026-09-08T11:00:00.000Z');
  db.prepare("INSERT INTO incidents(service_id,started_at,ended_at,duration_seconds,status,created_at) VALUES(?,?,?,?, 'RESOLVED',?)")
    .run(serviceId, '2026-09-08T10:00:00.000Z', '2026-09-08T11:00:00.000Z', 3600, '2026-09-08T10:00:00.000Z');
  const deleted = cleanupOldData(db, now);
  assert.deepEqual({ results: deleted.results, providers: deleted.providers, incidents: deleted.incidents }, { results: 1, providers: 1, incidents: 1 });
  assert.equal(db.prepare('SELECT COUNT(*) count FROM monitoring_results').get().count, 1);
  closeDatabase();
});

