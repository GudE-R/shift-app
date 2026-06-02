import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { useAiStore } from "@/stores/useAiStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { getProvider } from "@/services/ai/provider";
import { buildContext } from "@/services/ai/prompt";
import type { ParsedResult, GenerationDirective } from "@/services/ai/types";
import type { Store, Position } from "@/types";
import { getPositionsByStore } from "@/db/queries/positions";

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
  dateRange: { start: string; end: string };
  onGenerate: (directives: GenerationDirective[]) => void;
}

function directiveLabel(d: GenerationDirective, nameOf: (id: string) => string): string {
  switch (d.kind) {
    case "weekend_heavy":
      return `土日を${d.extra}人増員`;
    case "reduce_labor_cost":
      return "人件費を抑える（必要最小限の割当）";
    case "staff_shift_cap":
      return `${nameOf(d.staffId)}を最大${d.max}シフトまで`;
    case "prefer_staff":
      return `${nameOf(d.staffId)}を優先的に割当`;
    case "avoid_staff_on":
      return `${nameOf(d.staffId)}を${d.date}は除外`;
  }
}

export function AiAssistantDialog({ open, onClose, store, dateRange, onGenerate }: Props) {
  const { settings } = useAiStore();
  const { staffList } = useStaffStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [input, setInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getPositionsByStore(store.id).then(setPositions).catch(() => setPositions([]));
      setResult(null);
      setError(null);
      setInput("");
    }
  }, [open, store.id]);

  const nameOf = (id: string) => staffList.find((s) => s.id === id)?.display_name ?? "不明なスタッフ";

  const handleParse = async () => {
    if (!input.trim()) return;
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      const ctx = buildContext(store, staffList, positions, dateRange);
      const parsed = await getProvider(settings).parseConstraints(input, ctx);
      setResult(parsed);
    } catch (e: any) {
      setError(e?.message ?? "解釈に失敗しました");
    } finally {
      setParsing(false);
    }
  };

  const handleGenerate = () => {
    if (!result) return;
    onGenerate(result.directives);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AIアシスタントで生成</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: 今週末は人を厚めに。田中さんは今週は週2まで。人件費は抑えめで。"
              rows={3}
            />
            <Button onClick={handleParse} disabled={parsing || !input.trim()} variant="outline">
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              解釈する
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="space-y-3 rounded-md border p-3">
              {result.summary && <p className="text-sm">{result.summary}</p>}

              {result.directives.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.directives.map((d, i) => (
                    <Badge key={i} variant="secondary">
                      {directiveLabel(d, nameOf)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">適用する一時指示はありません。</p>
              )}

              {result.persistentActions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  恒久的な変更の提案が{result.persistentActions.length}件あります（今後のバージョンで適用対応予定）。
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleGenerate} disabled={!result}>
            この内容で生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
