import { useState } from "react";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useShiftStore } from "@/stores/useShiftStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { generateMockShifts } from "@/services/mock-ai-generator";
import { getRequirements } from "@/db/queries/store-requirements";

interface Props {
  onGenerated: () => void;
}

export function GenerateButton({ onGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ shifts: number; warnings: number } | null>(null);

  const { selectedStoreId, getDateRange } = useCalendarStore();
  const { shifts, deleteNonManualShifts, bulkInsertShifts } = useShiftStore();
  const { staffList } = useStaffStore();
  const { stores } = useStoreStore();

  const handleGenerate = async () => {
    if (!selectedStoreId) {
      alert("生成する店舗を選択してください");
      return;
    }

    const store = stores.find((s) => s.id === selectedStoreId);
    if (!store) return;

    setGenerating(true);
    setResult(null);

    try {
      const range = getDateRange();
      const requirements = await getRequirements(selectedStoreId, range);
      const manualShifts = shifts.filter((s) => s.is_manual_modified && s.store_id === selectedStoreId);

      const generated = await generateMockShifts({
        store,
        staffList,
        requirements,
        existingManualShifts: manualShifts,
        dateRange: range,
      });

      await deleteNonManualShifts(selectedStoreId, range.start, range.end);
      await bulkInsertShifts(generated.shifts);

      setResult({ shifts: generated.shifts.length, warnings: generated.warnings.length });
      onGenerated();
    } catch (err) {
      console.error("Generation failed:", err);
      alert("シフト生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleGenerate} disabled={generating || !selectedStoreId}>
        {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        AI生成
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.shifts}件生成 / 警告{result.warnings}件
        </span>
      )}
    </div>
  );
}
