import { useMemo, useState } from "react";
import { useStaffStore } from "@/stores/useStaffStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";

const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function NgDateEditor({ staffId }: { staffId: string }) {
  const { staffList, addNgDate, removeNgDate } = useStaffStore();
  const staff = staffList.find((s) => s.id === staffId);
  const [cursor, setCursor] = useState(new Date());

  const selectedDates = useMemo(() => {
    const map = new Map<string, string>();
    staff?.ngDates.forEach((ng) => map.set(ng.ng_date, ng.id));
    return map;
  }, [staff?.ngDates]);

  const ngWeekdays = useMemo(() => {
    const set = new Set<number>();
    staff?.availability.forEach((a) => {
      if (a.status === "×") set.add(a.day_of_week);
    });
    return set;
  }, [staff?.availability]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const toggleDate = async (date: Date) => {
    if (ngWeekdays.has(date.getDay())) return;
    const key = format(date, "yyyy-MM-dd");
    const existingId = selectedDates.get(key);
    if (existingId) {
      await removeNgDate(existingId);
    } else {
      await addNgDate(staffId, key);
    }
  };

  const sortedSelected = useMemo(
    () => [...(staff?.ngDates ?? [])].sort((a, b) => a.ng_date.localeCompare(b.ng_date)),
    [staff?.ngDates]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => subMonths(c, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{format(cursor, "yyyy年 M月", { locale: ja })}</span>
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEK_LABELS.map((w, i) => (
          <div key={w} className={`py-1 font-medium ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}>
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const isNgWeekday = ngWeekdays.has(d.getDay());
          const isSelected = selectedDates.has(key) || isNgWeekday;
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleDate(d)}
              disabled={isNgWeekday}
              title={isNgWeekday ? "曜日設定によりNG" : undefined}
              className={[
                "aspect-square rounded-md text-sm transition-colors",
                inMonth ? "" : "text-muted-foreground/40",
                isNgWeekday
                  ? "bg-red-200 text-red-800 cursor-not-allowed"
                  : isSelected
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "hover:bg-accent",
                isToday && !isSelected ? "ring-1 ring-primary" : "",
              ].join(" ")}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          選択中: {sortedSelected.length}日
        </p>
        {sortedSelected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sortedSelected.map((ng) => (
              <span key={ng.id} className="text-xs bg-red-50 text-red-700 rounded px-2 py-0.5">
                {ng.ng_date}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
