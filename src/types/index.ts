// ===== Database Models =====

export interface Store {
  id: string;
  name: string;
  color: string;
  business_hours: string; // JSON string: Record<number, { open: string; close: string }>
  sort_order: number;
  updated_at: string;
}

export interface BusinessHours {
  [dayOfWeek: number]: { open: string; close: string };
}

export interface Position {
  id: string;
  store_id: string;
  name: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  display_name: string;
  anonymous_id: string;
  status: "active" | "inactive";
  target_hours: number | null;
  min_hours: number | null;
  max_hours: number | null;
  max_consecutive_days: number | null;
  memo: string | null;
  default_start_time: string | null;
  default_end_time: string | null;
  updated_at: string;
}

export interface StaffStore {
  staff_id: string;
  store_id: string;
  updated_at: string;
}

export interface StaffPosition {
  staff_id: string;
  position_id: string;
  updated_at: string;
}

export type AvailabilityStatus = "○" | "△" | "×";

export interface StaffAvailability {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=Sun, 6=Sat
  status: AvailabilityStatus;
  updated_at: string;
}

export interface StaffNgDate {
  id: string;
  staff_id: string;
  ng_date: string; // YYYY-MM-DD
  reason: string | null;
  updated_at: string;
}

export interface StoreRequirement {
  id: string;
  store_id: string;
  position_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  count: number;
  updated_at: string;
}

export interface ShiftEntry {
  id: string;
  staff_id: string;
  store_id: string;
  position_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  break_time_minutes: number;
  is_ai_generated: boolean;
  is_manual_modified: boolean;
  updated_at: string;
}

export interface ConflictLog {
  id: string;
  table_name: string;
  record_id: string;
  old_data: string; // JSON
  new_data: string; // JSON
  created_at: string;
}

// ===== Validation =====

export type ValidationSeverity = "error" | "warning";

export interface ValidationResult {
  severity: ValidationSeverity;
  rule: "break_time" | "double_booking" | "overtime_weekly" | "overtime_daily" | "consecutive_days";
  message: string;
  staff_id: string;
  work_date?: string;
}

// ===== Composite Types =====

export interface StaffWithRelations extends Staff {
  stores: StaffStore[];
  positions: StaffPosition[];
  availability: StaffAvailability[];
  ngDates: StaffNgDate[];
}

export interface ShiftEntryWithNames extends ShiftEntry {
  staff_name: string;
  store_name: string;
  position_name: string;
  store_color: string;
}

// ===== AI Generation =====

export interface GenerateResult {
  shifts: Omit<ShiftEntry, "updated_at">[];
  warnings: { type: string; message: string; affected_date: string }[];
}
