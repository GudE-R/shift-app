import { useEffect, useState } from "react";
import { useAiStore } from "@/stores/useAiStore";
import { DEFAULT_MODELS } from "@/services/ai/types";
import type { AiProviderId } from "@/services/ai/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function AiSettingsPanel() {
  const { settings, initialized, init, save } = useAiStore();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = async () => {
    await save(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">AIアシスタント（任意機能）</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AIアシスタント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            自然言語の要望（例:「今週末は人を厚めに」）を解釈してシフト生成に反映します。
            有効化すると、シフト生成時に店舗名・スタッフ氏名・ポジション名がAIプロバイダへ送信されます。
            無効のままなら従来どおり完全オフラインで動作します。
          </p>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            />
            AIアシスタントを有効にする
          </label>

          <div className="space-y-2">
            <Label>プロバイダ</Label>
            <Select
              value={draft.provider}
              onChange={(e) => {
                const provider = e.target.value as AiProviderId;
                setDraft({ ...draft, provider, model: DEFAULT_MODELS[provider] });
              }}
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="gemini">Gemini (Google) — 準備中</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>モデル</Label>
            <Input
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder={DEFAULT_MODELS[draft.provider]}
            />
          </div>

          <div className="space-y-2">
            <Label>APIキー</Label>
            <Input
              type="password"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-muted-foreground">この端末のローカルDBにのみ保存されます。</p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>保存</Button>
            {saved && <span className="text-sm text-green-600">保存しました</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
