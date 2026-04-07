import { getDb } from "../database";
import type { Position } from "@/types";

export async function getPositionsByStore(storeId: string): Promise<Position[]> {
  const db = await getDb();
  return db.select("SELECT * FROM positions WHERE store_id = $1 ORDER BY name", [storeId]);
}

export async function getAllPositions(): Promise<Position[]> {
  const db = await getDb();
  return db.select("SELECT * FROM positions ORDER BY name");
}

export async function createPosition(pos: Omit<Position, "updated_at">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO positions (id, store_id, name) VALUES ($1, $2, $3)",
    [pos.id, pos.store_id, pos.name]
  );
}

export async function updatePosition(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE positions SET name = $1, updated_at = datetime('now') WHERE id = $2", [name, id]);
}

export async function deletePosition(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM positions WHERE id = $1", [id]);
}
