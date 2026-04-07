import { useEffect, useCallback } from "react";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useShiftStore } from "@/stores/useShiftStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { ValidationPanel } from "./ValidationPanel";
import { GenerateButton } from "./GenerateButton";
import { ExportDialog } from "../export/ExportDialog";
import { useState } from "react";

export function CalendarPage() {
  const { currentDate, viewMode, selectedStoreId, setViewMode, setSelectedStoreId, goNext, goPrev, goToday, getDateRange } = useCalendarStore();
  const { shifts, fetchShifts, validationResults, runValidation } = useShiftStore();
  const { staffList, fetchStaff } = useStaffStore();
  const { stores, fetchStores } = useStoreStore();
  const [showExport, setShowExport] = useState(false);

  const loadData = useCallback(async () => {
    const range = getDateRange();
    await fetchShifts(range.start, range.end, selectedStoreId || undefined);
  }, [currentDate, viewMode, selectedStoreId]);

  useEffect(() => {
    fetchStaff();
    fetchStores();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    runValidation(staffList);
  }, [shifts, staffList]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">シフトカレンダー</h2>
          <Select
            value={selectedStoreId || ""}
            onChange={(e) => setSelectedStoreId(e.target.value || null)}
            className="w-40"
          >
            <option value="">全店舗</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <GenerateButton onGenerated={loadData} />
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>出力</Button>
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === "month" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("month")}>月</Button>
            <Button variant={viewMode === "week" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("week")}>週</Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="icon" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={goToday}>今日</Button>
        <Button variant="outline" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-lg font-medium ml-2">
          {format(currentDate, viewMode === "month" ? "yyyy年M月" : "yyyy年M月d日〜", { locale: ja })}
        </span>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg">
        {viewMode === "month" ? <MonthView onRefresh={loadData} /> : <WeekView onRefresh={loadData} />}
      </div>

      <ValidationPanel results={validationResults} staffList={staffList} />

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
