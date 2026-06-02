// ===== AI Agent layer =====
// LLM はソルバーではなく「自然言語 → 構造化制約」への通訳として働く。
// 出力は揮発的な GenerationDirective か、永続的な PersistentAction に分類される。

export type AiProviderId = "claude" | "gemini";

export interface AiSettings {
  enabled: boolean;
  provider: AiProviderId;
  apiKey: string;
  model: string;
}

export const DEFAULT_MODELS: Record<AiProviderId, string> = {
  claude: "claude-opus-4-8",
  gemini: "gemini-2.5-flash",
};

// ----- 揮発: 今回の生成だけに効くソフト指示 -----
export type GenerationDirective =
  | { kind: "weekend_heavy"; extra: number } // 土日の必要人数を +extra
  | { kind: "reduce_labor_cost" } // 既定時間への延長/枠拡張を抑え、必要最小限に
  | { kind: "staff_shift_cap"; staffId: string; max: number } // staff の総シフト数上限
  | { kind: "prefer_staff"; staffId: string } // 優先的に割当
  | { kind: "avoid_staff_on"; staffId: string; date: string }; // YYYY-MM-DD だけ除外

// ----- 永続: 既存テーブルへの更新（Phase 2 で確認UI経由で適用）-----
export type PersistentAction =
  | { kind: "add_ng_date"; staffId: string; date: string; reason?: string }
  | { kind: "set_availability"; staffId: string; dayOfWeek: number; status: "○" | "△" | "×" }
  | { kind: "set_requirement_count"; date: string; positionId: string; count: number };

export interface ParsedResult {
  directives: GenerationDirective[];
  persistentActions: PersistentAction[];
  // ユーザー向けの解釈サマリ（「週末を1人増員 / 田中さんを週2まで」等）
  summary: string;
}

// LLM に渡す匿名化済みコンテキスト（memo 等の個人情報は含めない）
export interface AiContext {
  storeName: string;
  dateRange: { start: string; end: string };
  staff: { id: string; name: string }[]; // 名前解決に必要な最小限
  positions: { id: string; name: string }[];
}
