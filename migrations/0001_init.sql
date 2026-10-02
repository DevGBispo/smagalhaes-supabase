CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  source_name TEXT NOT NULL,
  reservation_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vessels (
  id TEXT PRIMARY KEY,
  terminal TEXT NOT NULL,
  ship TEXT NOT NULL,
  voyage TEXT NOT NULL DEFAULT '',
  imported_deadline TEXT,
  observed_deadline TEXT,
  observed_eta TEXT,
  observed_etb TEXT,
  observed_gate_open TEXT,
  last_checked_at TEXT,
  last_observed_at TEXT,
  last_import_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_vessels_active ON vessels(active,terminal);
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES imports(id),
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  reservation TEXT NOT NULL,
  client TEXT NOT NULL,
  deadline TEXT,
  qty20 INTEGER NOT NULL DEFAULT 0,
  qty40 INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reservations_import ON reservations(import_id);
CREATE INDEX IF NOT EXISTS idx_reservations_vessel ON reservations(vessel_id);
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observations_vessel ON observations(vessel_id,observed_at);
CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  changed_at TEXT NOT NULL,
  field TEXT NOT NULL,
  previous_value TEXT,
  current_value TEXT,
  source TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_changes_time ON changes(changed_at DESC);
CREATE TABLE IF NOT EXISTS monitor_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  observed INTEGER NOT NULL DEFAULT 0,
  changed INTEGER NOT NULL DEFAULT 0,
  details_json TEXT
);
