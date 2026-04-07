import { getDb } from "../database";
import type { Store } from "@/types";

export async function getStores(): Promise<Store[]> {
  const db = await getDb();
  return db.select("SELECT * FROM stores ORDER BY sort_order, name");
}

export async function createStore(store: Omit<Store, "updated_at">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO stores (id, name, color, business_hours, sort_order) VALUES ($1, $2, $3, $4, $5)",
    [store.id, store.name, store.color, store.business_hours, store.sort_order]
  );
}

export async function updateStore(id: string, data: Partial<Store>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.color !== undefined) { fields.push(`color = $${idx++}`); values.push(data.color); }
  if (data.business_hours !== undefined) { fields.push(`business_hours = $${idx++}`); values.push(data.business_hours); }
  if (data.sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(data.sort_order); }

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(`UPDATE stores SET ${fields.join(", ")} WHERE id = $${idx}`, values);
}

export async function deleteStore(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM stores WHERE id = $1", [id]);
}
