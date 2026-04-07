import { getDb } from "../database";
import type { StoreRequirement } from "@/types";

export async function getRequirements(storeId?: string, dateRange?: { start: string; end: string }): Promise<StoreRequirement[]> {
  const db = await getDb();
  let query = "SELECT * FROM store_requirements WHERE 1=1";
  const params: any[] = [];
  let idx = 1;

  if (storeId) { query += ` AND store_id = $${idx++}`; params.push(storeId); }
  if (dateRange) {
    query += ` AND work_date >= $${idx++} AND work_date <= $${idx++}`;
    params.push(dateRange.start, dateRange.end);
  }

  query += " ORDER BY work_date, start_time";
  return db.select(query, params);
}

export async function createRequirement(req: Omit<StoreRequirement, "updated_at">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO store_requirements (id, store_id, position_id, work_date, start_time, end_time, count) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [req.id, req.store_id, req.position_id, req.work_date, req.start_time, req.end_time, req.count]
  );
}

export async function updateRequirement(id: string, data: Partial<StoreRequirement>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.position_id !== undefined) { fields.push(`position_id = $${idx++}`); values.push(data.position_id); }
  if (data.work_date !== undefined) { fields.push(`work_date = $${idx++}`); values.push(data.work_date); }
  if (data.start_time !== undefined) { fields.push(`start_time = $${idx++}`); values.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push(`end_time = $${idx++}`); values.push(data.end_time); }
  if (data.count !== undefined) { fields.push(`count = $${idx++}`); values.push(data.count); }

  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(`UPDATE store_requirements SET ${fields.join(", ")} WHERE id = $${idx}`, values);
}

export async function deleteRequirement(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM store_requirements WHERE id = $1", [id]);
}
