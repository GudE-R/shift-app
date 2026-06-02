import type { AiContext } from "./types";
import type { Store, StaffWithRelations, Position } from "@/types";

// LLM に渡すコンテキストを最小化して組み立てる。
// memo・目標時間・anonymous_id など名前解決に不要な個人情報は送らない。
export function buildContext(
  store: Store,
  staffList: StaffWithRelations[],
  positions: Position[],
  dateRange: { start: string; end: string }
): AiContext {
  return {
    storeName: store.name,
    dateRange,
    staff: staffList.map((s) => ({ id: s.id, name: s.display_name })),
    positions: positions.map((p) => ({ id: p.id, name: p.name })),
  };
}

export const SYSTEM_PROMPT = `あなたはシフト管理アプリの制約パーサです。
店長の自然言語の要望を、構造化された制約に変換するのが役割です。シフトの割当計算は別のエンジンが行うので、あなたは要望の解釈のみに専念してください。

必ず apply_shift_constraints ツールを1回呼び出して結果を返してください。

- 「今回だけ」「今週末は厚めに」のような一時的な要望は directives に入れる。
- 「今後ずっと」「NG日として登録」「毎週」のような恒久的な変更は persistentActions に入れる。
- staffId / positionId は与えられたコンテキストの id をそのまま使う。氏名のあいまい一致で最も近い人物を選ぶ。
- 日付は YYYY-MM-DD 形式。曜日は 0=日曜〜6=土曜。
- summary には解釈内容を日本語で簡潔に書く（店長が確認できるように）。
- 該当しない要望は空配列で良い。推測で余計な制約を足さないこと。`;

// プロバイダ非依存の JSON Schema（Claude tool use / Gemini function calling 双方で使う）
export const TOOL_NAME = "apply_shift_constraints";

export const TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "店長向けの解釈サマリ（日本語）" },
    directives: {
      type: "array",
      description: "今回の生成だけに効く一時的な指示",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["weekend_heavy", "reduce_labor_cost", "staff_shift_cap", "prefer_staff", "avoid_staff_on"],
          },
          extra: { type: "number", description: "weekend_heavy: 土日の増員数" },
          staffId: { type: "string" },
          max: { type: "number", description: "staff_shift_cap: 総シフト数の上限" },
          date: { type: "string", description: "avoid_staff_on: YYYY-MM-DD" },
        },
        required: ["kind"],
      },
    },
    persistentActions: {
      type: "array",
      description: "恒久的なデータ変更（ユーザー承認後に適用）",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["add_ng_date", "set_availability", "set_requirement_count"],
          },
          staffId: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          reason: { type: "string" },
          dayOfWeek: { type: "number", description: "0=日〜6=土" },
          status: { type: "string", enum: ["○", "△", "×"] },
          positionId: { type: "string" },
          count: { type: "number" },
        },
        required: ["kind"],
      },
    },
  },
  required: ["summary", "directives", "persistentActions"],
} as const;

export function buildUserMessage(input: string, ctx: AiContext): string {
  return `# 店舗コンテキスト
店舗: ${ctx.storeName}
対象期間: ${ctx.dateRange.start} 〜 ${ctx.dateRange.end}

## スタッフ（id: 氏名）
${ctx.staff.map((s) => `- ${s.id}: ${s.name}`).join("\n")}

## ポジション（id: 名称）
${ctx.positions.map((p) => `- ${p.id}: ${p.name}`).join("\n")}

# 店長の要望
${input}`;
}
