import { create } from "zustand";
import { getDb } from "@/db/database";
import type { AiSettings, AiProviderId } from "@/services/ai/types";
import { DEFAULT_MODELS } from "@/services/ai/types";

const KEY = "ai_settings";

const DEFAULT: AiSettings = {
  enabled: false,
  provider: "claude",
  apiKey: "",
  model: DEFAULT_MODELS.claude,
};

interface AiState {
  settings: AiSettings;
  initialized: boolean;
  init: () => Promise<void>;
  save: (patch: Partial<AiSettings>) => Promise<void>;
  isReady: () => boolean;
}

export const useAiStore = create<AiState>((set, get) => ({
  settings: DEFAULT,
  initialized: false,

  init: async () => {
    try {
      const db = await getDb();
      const rows: any[] = await db.select("SELECT value FROM app_settings WHERE key = $1", [KEY]);
      if (rows.length > 0) {
        set({ settings: { ...DEFAULT, ...JSON.parse(rows[0].value) }, initialized: true });
        return;
      }
    } catch {
      // 未設定/読み込み失敗時はデフォルト（無効）のまま
    }
    set({ initialized: true });
  },

  save: async (patch) => {
    const next = { ...get().settings, ...patch };
    // プロバイダ変更時、モデルが空ならそのプロバイダの既定モデルにする
    if (patch.provider && !patch.model) next.model = DEFAULT_MODELS[patch.provider as AiProviderId];
    const db = await getDb();
    await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)", [
      KEY,
      JSON.stringify(next),
    ]);
    set({ settings: next });
  },

  // AI機能が利用可能か（オプトイン＋キーあり）
  isReady: () => {
    const { enabled, apiKey } = get().settings;
    return enabled && apiKey.trim().length > 0;
  },
}));
