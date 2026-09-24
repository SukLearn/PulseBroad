import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closeDatabase, getDb, initializeDatabase } from '../src/database/index.js';
import { persistResult } from '../src/monitoring/monitoringService.js';
import { getStats } from '../src/services/resultService.js';

test('service checks run on demand and stale target results are discarded', async () => {
  initializeDatabase(':memory:', { seed: false });
  try {
    const app = createApp();
    const created = await request(app).post('/api/services').send({
      name: 'Local test', address: 'http://127.0.0.1:1', monitor_type: 'HTTP', category: 'HOME'
    });
    assert.equal(created.status, 201);
    const id = created.body.id;

    const checked = await request(app).post(`/api/services/${id}/check`);
    assert.equal(checked.status, 200);
    assert.equal(checked.body.result.status, 'DOWN');
    assert.equal(checked.body.service.current_status, 'DOWN');
    const oldConfiguration = getDb().prepare('SELECT * FROM services WHERE id=?').get(id);

    const updated = await request(app).put(`/api/services/${id}`).send({
      name: 'Local test', address: 'http://127.0.0.1:2', monitor_type: 'HTTP', category: 'HOME'
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.current_status, 'UNKNOWN');
    assert.equal(persistResult(oldConfiguration, {
      checkedAt: '2026-09-24T12:00:00.000Z', status: 'UP', responseTime: 1
    }), false);
    assert.equal(getDb().prepare('SELECT COUNT(*) AS count FROM monitoring_results WHERE checked_at=?')
      .get('2026-09-24T12:00:00.000Z').count, 0);

    const rechecked = await request(app).post(`/api/services/${id}/check`);
    assert.equal(rechecked.status, 200);
    assert.equal(rechecked.body.service.address, 'http://127.0.0.1:2');
    assert.equal(getStats(id).uptime_24h, 0);
  } finally {
    closeDatabase();
  }
});

test('unknown checks are excluded from uptime calculations', () => {
  initializeDatabase(':memory:', { seed: false });
  try {
    const now = new Date().toISOString();
    const id = getDb().prepare(`INSERT INTO services(name,address,monitor_type,created_at,updated_at)
      VALUES('Sample','http://localhost','HTTP',?,?)`).run(now, now).lastInsertRowid;
    const insert = getDb().prepare('INSERT INTO monitoring_results(service_id,checked_at,status) VALUES(?,?,?)');
    insert.run(id, now, 'UP');
    insert.run(id, now, 'UNKNOWN');
    assert.equal(getStats(id).uptime_24h, 100);
  } finally {
    closeDatabase();
  }
});
