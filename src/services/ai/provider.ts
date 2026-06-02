import type { AiContext, AiSettings, ParsedResult, GenerationDirective, PersistentAction } from "./types";
import { createClaudeProvider } from "./claude-provider";

export interface AiProvider {
  parseConstraints(input: string, ctx: AiContext): Promise<ParsedResult>;
}

export function getProvider(settings: AiSettings): AiProvider {
  switch (settings.provider) {
    case "claude":
      return createClaudeProvider(settings);
    case "gemini":
      // Phase 3 で実装。未実装の間は明示エラー。
      throw new Error("Gemini プロバイダは未実装です");
    default:
      throw new Error(`未知のプロバイダ: ${settings.provider}`);
  }
}

// LLM の生のツール出力を ParsedResult に正規化する（不正な項目は捨てる）。
// staffId/positionId が実在 id か検証して幻覚を弾く。
export function normalizeToolOutput(raw: any, ctx: AiContext): ParsedResult {
  const staffIds = new Set(ctx.staff.map((s) => s.id));
  const positionIds = new Set(ctx.positions.map((p) => p.id));

  const directives: GenerationDirective[] = [];
  for (const d of Array.isArray(raw?.directives) ? raw.directives : []) {
    switch (d?.kind) {
      case "weekend_heavy":
        directives.push({ kind: "weekend_heavy", extra: Math.max(1, Number(d.extra) || 1) });
        break;
      case "reduce_labor_cost":
        directives.push({ kind: "reduce_labor_cost" });
        break;
      case "staff_shift_cap":
        if (staffIds.has(d.staffId) && Number.isFinite(Number(d.max)))
          directives.push({ kind: "staff_shift_cap", staffId: d.staffId, max: Number(d.max) });
        break;
      case "prefer_staff":
        if (staffIds.has(d.staffId)) directives.push({ kind: "prefer_staff", staffId: d.staffId });
        break;
      case "avoid_staff_on":
        if (staffIds.has(d.staffId) && typeof d.date === "string")
          directives.push({ kind: "avoid_staff_on", staffId: d.staffId, date: d.date });
        break;
    }
  }

  const persistentActions: PersistentAction[] = [];
  for (const a of Array.isArray(raw?.persistentActions) ? raw.persistentActions : []) {
    switch (a?.kind) {
      case "add_ng_date":
        if (staffIds.has(a.staffId) && typeof a.date === "string")
          persistentActions.push({ kind: "add_ng_date", staffId: a.staffId, date: a.date, reason: a.reason });
        break;
      case "set_availability":
        if (staffIds.has(a.staffId) && ["○", "△", "×"].includes(a.status) && Number.isFinite(Number(a.dayOfWeek)))
          persistentActions.push({
            kind: "set_availability",
            staffId: a.staffId,
            dayOfWeek: Number(a.dayOfWeek),
            status: a.status,
          });
        break;
      case "set_requirement_count":
        if (positionIds.has(a.positionId) && typeof a.date === "string" && Number.isFinite(Number(a.count)))
          persistentActions.push({
            kind: "set_requirement_count",
            date: a.date,
            positionId: a.positionId,
            count: Number(a.count),
          });
        break;
    }
  }

  return {
    directives,
    persistentActions,
    summary: typeof raw?.summary === "string" ? raw.summary : "",
  };
}
