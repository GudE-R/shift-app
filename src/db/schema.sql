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
);
