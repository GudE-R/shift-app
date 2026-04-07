import type { ShiftEntry, Staff, ValidationResult } from "@/types";
import { parse, differenceInMinutes, startOfWeek, endOfWeek, format, addDays, isWithinInterval, parseISO } from "date-fns";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function shiftDurationMinutes(entry: ShiftEntry): number {
  return timeToMinutes(entry.end_time) - timeToMinutes(entry.start_time);
}

function shiftWorkMinutes(entry: ShiftEntry): number {
  return shiftDurationMinutes(entry) - entry.break_time_minutes;
}

function timeOverlaps(a: ShiftEntry, b: ShiftEntry): boolean {
  const aStart = timeToMinutes(a.start_time);
  const aEnd = timeToMinutes(a.end_time);
  const bStart = timeToMinutes(b.start_time);
  const bEnd = timeToMinutes(b.end_time);
  return aStart < bEnd && bStart < aEnd;
}

export function checkBreakTime(shifts: ShiftEntry[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const s of shifts) {
    const duration = shiftDurationMinutes(s);
    if (duration > 480 && s.break_time_minutes < 60) {
      results.push({
        severity: "error",
        rule: "break_time",
        message: `8時間超勤務で休憩${s.break_time_minutes}分（60分以上必要）`,
        staff_id: s.staff_id,
        work_date: s.work_date,
      });
    } else if (duration > 360 && s.break_time_minutes < 45) {
      results.push({
        severity: "error",
        rule: "break_time",
        message: `6時間超勤務で休憩${s.break_time_minutes}分（45分以上必要）`,
        staff_id: s.staff_id,
        work_date: s.work_date,
      });
    }
  }
  return results;
}

export function checkDoubleBooking(shifts: ShiftEntry[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const byStaffDate = new Map<string, ShiftEntry[]>();

  for (const s of shifts) {
    const key = `${s.staff_id}_${s.work_date}`;
    if (!byStaffDate.has(key)) byStaffDate.set(key, []);
    byStaffDate.get(key)!.push(s);
  }

  for (const [, entries] of byStaffDate) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i].store_id !== entries[j].store_id && timeOverlaps(entries[i], entries[j])) {
          results.push({
            severity: "error",
            rule: "double_booking",
            message: `同一時間帯に複数店舗のシフトが重複しています`,
            staff_id: entries[i].staff_id,
            work_date: entries[i].work_date,
          });
        }
      }
    }
  }
  return results;
}

export function checkOvertimeWeekly(shifts: ShiftEntry[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const staffWeekHours = new Map<string, number>();

  for (const s of shifts) {
    const weekStart = format(startOfWeek(parseISO(s.work_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const key = `${s.staff_id}_${weekStart}`;
    const hours = shiftWorkMinutes(s) / 60;
    staffWeekHours.set(key, (staffWeekHours.get(key) || 0) + hours);
  }

  const reported = new Set<string>();
  for (const [key, hours] of staffWeekHours) {
    if (hours > 40 && !reported.has(key)) {
      const [staffId] = key.split("_");
      results.push({
        severity: "warning",
        rule: "overtime_weekly",
        message: `週${hours.toFixed(1)}時間（40時間超）`,
        staff_id: staffId,
      });
      reported.add(key);
    }
  }
  return results;
}

export function checkOvertimeDaily(shifts: ShiftEntry[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const s of shifts) {
    const hours = shiftDurationMinutes(s) / 60;
    if (hours > 12) {
      results.push({
        severity: "warning",
        rule: "overtime_daily",
        message: `1日${hours.toFixed(1)}時間勤務（12時間超）`,
        staff_id: s.staff_id,
        work_date: s.work_date,
      });
    }
  }
  return results;
}

export function checkConsecutiveDays(shifts: ShiftEntry[], staffList: Staff[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const staffDates = new Map<string, Set<string>>();

  for (const s of shifts) {
    if (!staffDates.has(s.staff_id)) staffDates.set(s.staff_id, new Set());
    staffDates.get(s.staff_id)!.add(s.work_date);
  }

  for (const [staffId, dates] of staffDates) {
    const staff = staffMap.get(staffId);
    const maxDays = staff?.max_consecutive_days ?? 5;
    const sortedDates = [...dates].sort();

    let consecutive = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = parseISO(sortedDates[i - 1]);
      const curr = parseISO(sortedDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        consecutive++;
        if (consecutive > maxDays) {
          results.push({
            severity: "warning",
            rule: "consecutive_days",
            message: `${consecutive}日連続勤務（上限${maxDays}日）`,
            staff_id: staffId,
            work_date: sortedDates[i],
          });
        }
      } else {
        consecutive = 1;
      }
    }
  }
  return results;
}

export function validateShifts(shifts: ShiftEntry[], staffList: Staff[]): ValidationResult[] {
  return [
    ...checkBreakTime(shifts),
    ...checkDoubleBooking(shifts),
    ...checkOvertimeWeekly(shifts),
    ...checkOvertimeDaily(shifts),
    ...checkConsecutiveDays(shifts, staffList),
  ];
}
