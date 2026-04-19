import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:shiftcraft.db");
    await initSchema(db);
  }
  return db;
}

async function initSchema(database: Database) {
  await database.execute(`PRAGMA journal_mode=WAL`);
  await database.execute(`PRAGMA foreign_keys=ON`);

  // Split schema.sql into individual statements and execute
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await database.execute(stmt);
  }

  await migrateStaffBaseShift(database);
  await migrateStaffFixedSlotsDropPosition(database);
}

async function migrateStaffFixedSlotsDropPosition(database: Database) {
  const cols: { name: string }[] = await database.select("PRAGMA table_info(staff_fixed_slots)");
  if (cols.length === 0) return;
  if (!cols.some((c) => c.name === "position_id")) return;
  await database.execute(`CREATE TABLE staff_fixed_slots_new (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  await database.execute(
    "INSERT INTO staff_fixed_slots_new (id, staff_id, day_of_week, store_id, start_time, end_time, updated_at) " +
    "SELECT id, staff_id, day_of_week, store_id, start_time, end_time, updated_at FROM staff_fixed_slots"
  );
  await database.execute("DROP TABLE staff_fixed_slots");
  await database.execute("ALTER TABLE staff_fixed_slots_new RENAME TO staff_fixed_slots");
}

async function migrateStaffBaseShift(database: Database) {
  const cols: { name: string }[] = await database.select("PRAGMA table_info(staff)");
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("default_start_time")) {
    await database.execute("ALTER TABLE staff ADD COLUMN default_start_time TEXT");
  }
  if (!names.has("default_end_time")) {
    await database.execute("ALTER TABLE staff ADD COLUMN default_end_time TEXT");
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    business_hours TEXT NOT NULL DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    anonymous_id TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    night_shift_ok INTEGER DEFAULT 1,
    target_hours REAL,
    min_hours REAL,
    max_hours REAL,
    max_consecutive_days INTEGER,
    memo TEXT,
    default_start_time TEXT,
    default_end_time TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_stores (
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (staff_id, store_id)
);

CREATE TABLE IF NOT EXISTS staff_positions (
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (staff_id, position_id)
);

CREATE TABLE IF NOT EXISTS staff_availability (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT '○',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(staff_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS staff_ng_dates (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    ng_date TEXT NOT NULL,
    reason TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(staff_id, ng_date)
);

CREATE TABLE IF NOT EXISTS staff_fixed_slots (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS store_requirements (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shift_entries (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_time_minutes INTEGER DEFAULT 0,
    is_ai_generated INTEGER DEFAULT 1,
    is_manual_modified INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conflict_logs (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data TEXT NOT NULL,
    new_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
`;
