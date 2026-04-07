import React, { useState } from "react";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useShiftStore } from "@/stores/useShiftStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { eachDayOfInterval, startOfMonth, endOfMonth, format, getDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ShiftCell } from "./ShiftCell";
import { ShiftEntryDialog } from "./ShiftEntryDialog";
import type { ShiftEntryWithNames } from "@/types";

interface Props {
  onRefresh: () => void;
}

export function MonthView({ onRefresh }: Props) {
  const { currentDate } = useCalendarStore();
  const { shifts } = useShiftStore();
  const { staffList } = useStaffStore();
  const [editingShift, setEditingShift] = useState<{ staffId: string; date: string; shift?: ShiftEntryWithNames } | null>(null);

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  const getShiftsForCell = (staffId: string, date: string): ShiftEntryWithNames[] => {
    return shifts.filter((s) => s.staff_id === staffId && s.work_date === date);
  };

  return (
    <>
      <div className="min-w-[800px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr>
              <th className="border p-2 text-sm font-medium bg-muted/50 w-28 text-left sticky left-0 bg-muted z-20">
                スタッフ
              </th>
              {days.map((day) => {
                const dow = getDay(day);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th
                    key={day.toISOString()}
                    className={`border p-1 text-xs font-medium min-w-[60px] ${isWeekend ? "bg-red-50" : "bg-muted/50"}`}
                  >
                    <div>{format(day, "d")}</div>
                    <div className="text-muted-foreground">{dayLabels[dow]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id}>
                <td className="border p-2 text-sm font-medium bg-muted/30 sticky left-0 bg-background z-10 truncate max-w-[112px]">
                  {staff.display_name}
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const cellShifts = getShiftsForCell(staff.id, dateStr);
                  const dow = getDay(day);
                  const isWeekend = dow === 0 || dow === 6;
                  return (
                    <td
                      key={dateStr}
                      className={`border p-0.5 align-top cursor-pointer hover:bg-accent/50 transition-colors ${isWeekend ? "bg-red-50/30" : ""}`}
                      onClick={() => setEditingShift({ staffId: staff.id, date: dateStr })}
                    >
                      {cellShifts.map((shift) => (
                        <ShiftCell
                          key={shift.id}
                          shift={shift}
                          compact
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingShift({ staffId: staff.id, date: dateStr, shift });
                          }}
                        />
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {staffList.length === 0 && (
          <p className="text-muted-foreground text-center py-8">スタッフを登録してください</p>
        )}
      </div>

      {editingShift && (
        <ShiftEntryDialog
          staffId={editingShift.staffId}
          date={editingShift.date}
          shift={editingShift.shift}
          onClose={() => { setEditingShift(null); onRefresh(); }}
        />
      )}
    </>
  );
}
