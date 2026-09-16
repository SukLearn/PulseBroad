import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { closeDatabase, getDb, initializeDatabase } from '../src/database/index.js';
import { evaluateIncident } from '../src/services/incidentService.js';

let service;
beforeEach(() => {
  initializeDatabase(':memory:', { seed: false });
  const now = new Date().toISOString();
  const id = getDb().prepare(`INSERT INTO services(name,address,monitor_type,category,created_at,updated_at)
    VALUES ('Test','http://test.local','HTTP','HOME',?,?)`).run(now, now).lastInsertRowid;
  service = { id, name: 'Test' };
});
afterEach(() => closeDatabase());

test('UP, DOWN, DOWN, UP creates exactly one resolved incident', () => {
  evaluateIncident(service, { status: 'UP', checkedAt: '2026-01-01T12:00:00.000Z' });
  evaluateIncident(service, { status: 'DOWN', checkedAt: '2026-01-01T12:01:00.000Z' });
  evaluateIncident(service, { status: 'DOWN', checkedAt: '2026-01-01T12:02:00.000Z' });
  evaluateIncident(service, { status: 'UP', checkedAt: '2026-01-01T12:04:00.000Z' });
  const rows = getDb().prepare('SELECT * FROM incidents').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'RESOLVED');
  assert.equal(rows[0].duration_seconds, 180);
});

test('long outage creates only one ongoing incident', () => {
  for (let minute = 0; minute < 4; minute++) evaluateIncident(service, { status: 'DOWN', checkedAt: `2026-01-01T12:0${minute}:00.000Z` });
  const rows = getDb().prepare('SELECT * FROM incidents').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'ONGOING');
});

test('unknown provider result does not resolve an ongoing incident', () => {
  evaluateIncident(service, { status: 'DOWN', checkedAt: '2026-01-01T12:00:00.000Z' });
  evaluateIncident(service, { status: 'UNKNOWN', checkedAt: '2026-01-01T12:01:00.000Z' });
  assert.equal(getDb().prepare('SELECT status FROM incidents').get().status, 'ONGOING');
});

