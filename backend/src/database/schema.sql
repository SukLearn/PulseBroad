PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  logo_path TEXT,
  monitor_type TEXT NOT NULL CHECK (monitor_type IN ('PING', 'HTTP', 'STATUS_PAGE')),
  category TEXT NOT NULL DEFAULT 'HOME' CHECK (category IN ('HOME', 'PING', 'EXTERNAL')),
  provider_key TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  timeout_ms INTEGER,
  current_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  current_message TEXT,
  last_checked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monitoring_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time REAL,
  packets_sent INTEGER,
  packets_received INTEGER,
  packet_loss REAL,
  minimum_latency REAL,
  maximum_latency REAL,
  average_latency REAL,
  http_status INTEGER,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL CHECK (status IN ('ONGOING', 'RESOLVED')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  provider_status TEXT NOT NULL,
  message TEXT,
  checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_results_service_checked ON monitoring_results(service_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_results_checked ON monitoring_results(checked_at);
CREATE INDEX IF NOT EXISTS idx_incidents_service_started ON incidents(service_id, started_at);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON incidents(started_at);
CREATE INDEX IF NOT EXISTS idx_incidents_ended ON incidents(ended_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_one_ongoing ON incidents(service_id) WHERE status = 'ONGOING';
CREATE INDEX IF NOT EXISTS idx_provider_service_checked ON provider_status(service_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_provider_checked ON provider_status(checked_at);

