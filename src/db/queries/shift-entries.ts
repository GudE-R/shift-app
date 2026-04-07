import { getDb } from "../database";
import type { ShiftEntry, ShiftEntryWithNames } from "@/types";

export async function getShiftsByDateRange(start: string, end: string, storeId?: string): Promise<ShiftEntryWithNames[]> {
  const db = await getDb();
  let query = `
    SELECT se.*, s.display_name as staff_name, st.name as store_name, st.color as store_color, p.name as position_name
    FROM shift_entries se
    JOIN staff s ON se.staff_id = s.id
    JOIN stores st ON se.store_id = st.id
    JOIN positions p ON se.position_id = p.id
    WHERE se.work_date >= $1 AND se.work_date <= $2
  `;
  const params: any[] = [start, end];

  if (storeId) {
    query += " AND se.store_id = $3";
    params.push(storeId);
  }

  query += " ORDER BY se.work_date, se.start_time";
  const results: any[] = await db.select(query, params);
  return results.map((r) => ({
    ...r,
    is_ai_generated: Boolean(r.is_ai_generated),
    is_manual_modified: Boolean(r.is_manual_modified),
  }));
}

export async function createShiftEntry(entry: Omit<ShiftEntry, "updated_at">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO shift_entries (id, staff_id, store_id, position_id, work_date, start_time, end_time, break_time_minutes, is_ai_generated, is_manual_modified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [entry.id, entry.staff_id, entry.store_id, entry.position_id, entry.work_date,
     entry.start_time, entry.end_time, entry.break_time_minutes,
     entry.is_ai_generated ? 1 : 0, entry.is_manual_modified ? 1 : 0]
  );
}

export async function updateShiftEntry(id: string, data: Partial<ShiftEntry>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.staff_id !== undefined) { fields.push(`staff_id = $${idx++}`); values.push(data.staff_id); }
  if (data.store_id !== undefined) { fields.push(`store_id = $${idx++}`); values.push(data.store_id); }
  if (data.position_id !== undefined) { fields.push(`position_id = $${idx++}`); values.push(data.position_id); }
  if (data.work_date !== undefined) { fields.push(`work_date = $${idx++}`); values.push(data.work_date); }
  if (data.start_time !== undefined) { fields.push(`start_time = $${idx++}`); values.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push(`end_time = $${idx++}`); values.push(data.end_time); }
  if (data.break_time_minutes !== undefined) { fields.push(`break_time_minutes = $${idx++}`); values.push(data.break_time_minutes); }
  if (data.is_manual_modified !== undefined) { fields.push(`is_manual_modified = $${idx++}`); values.push(data.is_manual_modified ? 1 : 0); }

  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(`UPDATE shift_entries SET ${fields.join(", ")} WHERE id = $${idx}`, values);
}

export async function deleteShiftEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM shift_entries WHERE id = $1", [id]);
}

export async function deleteNonManualShifts(storeId: string, start: string, end: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM shift_entries WHERE store_id = $1 AND work_date >= $2 AND work_date <= $3 AND is_manual_modified = 0",
    [storeId, start, end]
  );
}

export async function bulkInsertShifts(entries: Omit<ShiftEntry, "updated_at">[]): Promise<void> {
  const db = await getDb();
  for (const entry of entries) {
    await createShiftEntry(entry);
  }
}
