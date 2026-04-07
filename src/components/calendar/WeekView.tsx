import React, { useState } from "react";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useShiftStore } from "@/stores/useShiftStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { eachDayOfInterval, startOfWeek, endOfWeek, format, getDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ShiftCell } from "./ShiftCell";
import { ShiftEntryDialog } from "./ShiftEntryDialog";
import type { ShiftEntryWithNames } from "@/types";

interface Props {
  onRefresh: () => void;
}

export function WeekView({ onRefresh }: Props) {
  const { currentDate } = useCalendarStore();
  const { shifts } = useShiftStore();
  const { staffList } = useStaffStore();
  const [editingShift, setEditingShift] = useState<{ staffId: string; date: string; shift?: ShiftEntryWithNames } | null>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <>
      <div className="min-w-[600px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr>
              <th className="border p-2 text-sm font-medium bg-muted/50 w-28 text-left">スタッフ</th>
              {days.map((day) => {
                const dow = getDay(day);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={day.toISOString()} className={`border p-2 text-sm font-medium ${isWeekend ? "bg-red-50" : "bg-muted/50"}`}>
                    <div>{format(day, "M/d")}</div>
                    <div className="text-muted-foreground text-xs">{dayLabels[dow]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id}>
                <td className="border p-2 text-sm font-medium bg-muted/30">{staff.display_name}</td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const cellShifts = shifts.filter((s) => s.staff_id === staff.id && s.work_date === dateStr);
                  return (
                    <td
                      key={dateStr}
                      className="border p-1 align-top cursor-pointer hover:bg-accent/50 h-20"
                      onClick={() => setEditingShift({ staffId: staff.id, date: dateStr })}
                    >
                      {cellShifts.map((shift) => (
                        <ShiftCell
                          key={shift.id}
                          shift={shift}
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
