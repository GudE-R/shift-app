import { fetch } from "@tauri-apps/plugin-http";
import type { AiContext, AiSettings, ParsedResult } from "./types";
import type { AiProvider } from "./provider";
import { normalizeToolOutput } from "./provider";
import { SYSTEM_PROMPT, TOOL_NAME, TOOL_INPUT_SCHEMA, buildUserMessage } from "./prompt";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

// Tauri の plugin-http 経由で呼ぶ（CORS回避・Rust側からの送出）。
export function createClaudeProvider(settings: AiSettings): AiProvider {
  return {
    async parseConstraints(input: string, ctx: AiContext): Promise<ParsedResult> {
      const body = {
        model: settings.model,
        max_tokens: 1024,
        // システムプロンプトとツール定義は不変なので cache_control で再利用する。
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tools: [
          {
            name: TOOL_NAME,
            description: "店長の要望を構造化された生成指示と恒久変更に変換する",
            input_schema: TOOL_INPUT_SCHEMA,
            cache_control: { type: "ephemeral" },
          },
        ],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [{ role: "user", content: buildUserMessage(input, ctx) }],
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": settings.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Claude API エラー (${res.status}): ${text}`);
      }

      const data: any = await res.json();
      const toolUse = (data.content || []).find((c: any) => c.type === "tool_use" && c.name === TOOL_NAME);
      if (!toolUse) throw new Error("Claude がツール呼び出しを返しませんでした");

      return normalizeToolOutput(toolUse.input, ctx);
    },
  };
}
