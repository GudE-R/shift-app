import React from "react";
import type { ShiftEntryWithNames } from "@/types";
import { Lock } from "lucide-react";

interface Props {
  shift: ShiftEntryWithNames;
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const ShiftCell = React.memo(function ShiftCell({ shift, compact, onClick }: Props) {
  const timeStr = `${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`;

  if (compact) {
    return (
      <div
        className="text-xs px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer"
        style={{ backgroundColor: shift.store_color + "20", borderLeft: `3px solid ${shift.store_color}` }}
        onClick={onClick}
        title={`${shift.position_name} ${timeStr}`}
      >
        <div className="flex items-center gap-0.5">
          {shift.is_manual_modified && <Lock className="h-2 w-2 flex-shrink-0" />}
          <span>{timeStr}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="text-xs px-2 py-1 rounded mb-1 cursor-pointer"
      style={{ backgroundColor: shift.store_color + "20", borderLeft: `3px solid ${shift.store_color}` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        {shift.is_manual_modified && <Lock className="h-3 w-3" />}
        <span className="font-medium">{timeStr}</span>
      </div>
      <div className="text-muted-foreground">{shift.position_name}</div>
      {shift.break_time_minutes > 0 && (
        <div className="text-muted-foreground">休憩{shift.break_time_minutes}分</div>
      )}
    </div>
  );
});
