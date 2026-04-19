import { getDb } from "../database";
import type { Staff, StaffStore, StaffPosition, StaffAvailability, StaffNgDate, StaffWithRelations } from "@/types";

export async function getStaffList(): Promise<Staff[]> {
  const db = await getDb();
  return db.select("SELECT * FROM staff WHERE status = 'active' ORDER BY display_name");
}

export async function getAllStaffWithRelations(): Promise<StaffWithRelations[]> {
  const db = await getDb();
  const staffList: Staff[] = await db.select("SELECT * FROM staff WHERE status = 'active' ORDER BY display_name");
  const allStores: StaffStore[] = await db.select("SELECT * FROM staff_stores");
  const allPositions: StaffPosition[] = await db.select("SELECT * FROM staff_positions");
  const allAvailability: StaffAvailability[] = await db.select("SELECT * FROM staff_availability");
  const allNgDates: StaffNgDate[] = await db.select("SELECT * FROM staff_ng_dates");

  return staffList.map((s) => ({
    ...s,
    stores: allStores.filter((ss) => ss.staff_id === s.id),
    positions: allPositions.filter((sp) => sp.staff_id === s.id),
    availability: allAvailability.filter((sa) => sa.staff_id === s.id),
    ngDates: allNgDates.filter((ng) => ng.staff_id === s.id),
  }));
}

export async function createStaff(staff: Omit<Staff, "updated_at">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO staff (id, display_name, anonymous_id, status, target_hours, min_hours, max_hours, max_consecutive_days, memo, default_start_time, default_end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [staff.id, staff.display_name, staff.anonymous_id, staff.status,
     staff.target_hours, staff.min_hours, staff.max_hours, staff.max_consecutive_days, staff.memo,
     staff.default_start_time, staff.default_end_time]
  );
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.display_name !== undefined) { fields.push(`display_name = $${idx++}`); values.push(data.display_name); }
  if (data.target_hours !== undefined) { fields.push(`target_hours = $${idx++}`); values.push(data.target_hours); }
  if (data.min_hours !== undefined) { fields.push(`min_hours = $${idx++}`); values.push(data.min_hours); }
  if (data.max_hours !== undefined) { fields.push(`max_hours = $${idx++}`); values.push(data.max_hours); }
  if (data.max_consecutive_days !== undefined) { fields.push(`max_consecutive_days = $${idx++}`); values.push(data.max_consecutive_days); }
  if (data.memo !== undefined) { fields.push(`memo = $${idx++}`); values.push(data.memo); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
  if (data.default_start_time !== undefined) { fields.push(`default_start_time = $${idx++}`); values.push(data.default_start_time); }
  if (data.default_end_time !== undefined) { fields.push(`default_end_time = $${idx++}`); values.push(data.default_end_time); }

  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(`UPDATE staff SET ${fields.join(", ")} WHERE id = $${idx}`, values);
}

export async function deleteStaff(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE staff SET status = 'inactive', updated_at = datetime('now') WHERE id = $1", [id]);
}

// Staff-Store relations
export async function setStaffStores(staffId: string, storeIds: string[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM staff_stores WHERE staff_id = $1", [staffId]);
  for (const storeId of storeIds) {
    await db.execute("INSERT INTO staff_stores (staff_id, store_id) VALUES ($1, $2)", [staffId, storeId]);
  }
}

// Staff-Position relations
export async function setStaffPositions(staffId: string, positionIds: string[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM staff_positions WHERE staff_id = $1", [staffId]);
  for (const posId of positionIds) {
    await db.execute("INSERT INTO staff_positions (staff_id, position_id) VALUES ($1, $2)", [staffId, posId]);
  }
}

// Availability
export async function setStaffAvailability(staffId: string, availability: { day_of_week: number; status: string }[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM staff_availability WHERE staff_id = $1", [staffId]);
  for (const a of availability) {
    await db.execute(
      "INSERT INTO staff_availability (id, staff_id, day_of_week, status) VALUES ($1, $2, $3, $4)",
      [crypto.randomUUID(), staffId, a.day_of_week, a.status]
    );
  }
}

// NG Dates
export async function getStaffNgDates(staffId: string): Promise<StaffNgDate[]> {
  const db = await getDb();
  return db.select("SELECT * FROM staff_ng_dates WHERE staff_id = $1 ORDER BY ng_date", [staffId]);
}

export async function addStaffNgDate(ngDate: Omit<StaffNgDate, "updated_at">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO staff_ng_dates (id, staff_id, ng_date, reason) VALUES ($1, $2, $3, $4)",
    [ngDate.id, ngDate.staff_id, ngDate.ng_date, ngDate.reason]
  );
}

export async function deleteStaffNgDate(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM staff_ng_dates WHERE id = $1", [id]);
}
