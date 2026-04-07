import { create } from "zustand";
import { getDb } from "@/db/database";

interface AuthState {
  isUnlocked: boolean;
  hasPassword: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  checkPassword: (password: string) => Promise<boolean>;
  unlock: () => void;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  hasPassword: false,
  initialized: false,

  init: async () => {
    try {
      const db = await getDb();
      const rows: any[] = await db.select("SELECT value FROM app_settings WHERE key = 'password_hash'");
      set({ hasPassword: rows.length > 0, initialized: true });
    } catch {
      set({ hasPassword: false, initialized: true });
    }
  },

  setPassword: async (password: string) => {
    const db = await getDb();
    const hash = await hashPassword(password);
    await db.execute(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('password_hash', $1)",
      [hash]
    );
    set({ hasPassword: true, isUnlocked: true });
  },

  checkPassword: async (password: string) => {
    const db = await getDb();
    const rows: any[] = await db.select("SELECT value FROM app_settings WHERE key = 'password_hash'");
    if (rows.length === 0) return false;
    const hash = await hashPassword(password);
    const valid = rows[0].value === hash;
    if (valid) set({ isUnlocked: true });
    return valid;
  },

  unlock: () => set({ isUnlocked: true }),
}));
