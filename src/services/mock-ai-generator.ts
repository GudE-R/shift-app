import type { Store, StaffWithRelations, StoreRequirement, ShiftEntry, GenerateResult } from "@/types";
import { parseISO, getDay } from "date-fns";

interface GenerateParams {
  store: Store;
  staffList: StaffWithRelations[];
  requirements: StoreRequirement[];
  existingManualShifts: ShiftEntry[];
  dateRange: { start: string; end: string };
}

function calcBreakMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const duration = (eh * 60 + em) - (sh * 60 + sm);
  if (duration > 480) return 60;
  if (duration > 360) return 45;
  return 0;
}

function timeOverlaps(s1: string, e1: string, s2: string, e2: string): boolean {
  const [s1m, e1m] = [toMinutes(s1), toMinutes(e1)];
  const [s2m, e2m] = [toMinutes(s2), toMinutes(e2)];
  return s1m < e2m && s2m < e1m;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function generateMockShifts(params: GenerateParams): Promise<GenerateResult> {
  const { store, staffList, requirements, existingManualShifts, dateRange } = params;

  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 1000));

  const generatedShifts: Omit<ShiftEntry, "id" | "updated_at">[] = [];
  const warnings: GenerateResult["warnings"] = [];

  // Track hours assigned to each staff during this generation
  const staffHours = new Map<string, number>();

  // Get eligible staff for this store
  const eligibleStaff = staffList.filter((s) =>
    s.stores.some((ss) => ss.store_id === store.id)
  );

  // Process each requirement slot
  for (const req of requirements) {
    const dayOfWeek = getDay(parseISO(req.work_date));
    let assigned = 0;

    // Check how many manual shifts already cover this slot
    const manualCovering = existingManualShifts.filter(
      (ms) =>
        ms.work_date === req.work_date &&
        ms.position_id === req.position_id &&
        timeOverlaps(ms.start_time, ms.end_time, req.start_time, req.end_time)
    );
    const neededCount = Math.max(0, req.count - manualCovering.length);
    if (neededCount === 0) continue;

    // Find candidates for this slot
    const candidates = eligibleStaff
      .filter((staff) => {
        // Check position capability
        if (!staff.positions.some((sp) => sp.position_id === req.position_id)) return false;

        // Check NG dates
        if (staff.ngDates.some((ng) => ng.ng_date === req.work_date)) return false;

        // Check availability
        const avail = staff.availability.find((a) => a.day_of_week === dayOfWeek);
        if (avail?.status === "×") return false;

        // Check night shift
        if (!staff.night_shift_ok) {
          const startH = parseInt(req.start_time.split(":")[0]);
          const endH = parseInt(req.end_time.split(":")[0]);
          if (startH >= 22 || endH <= 5 || endH >= 22) return false;
        }

        // Check if already assigned at overlapping time on this date
        const alreadyAssigned = [
          ...generatedShifts.filter((gs) => gs.staff_id === staff.id && gs.work_date === req.work_date),
          ...existingManualShifts.filter((ms) => ms.staff_id === staff.id && ms.work_date === req.work_date),
        ];
        if (alreadyAssigned.some((a) => timeOverlaps(a.start_time, a.end_time, req.start_time, req.end_time))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Prefer staff with fewer hours assigned (balance workload)
        const aHours = staffHours.get(a.id) || 0;
        const bHours = staffHours.get(b.id) || 0;
        if (aHours !== bHours) return aHours - bHours;

        // Prefer ○ over △
        const aAvail = a.availability.find((av) => av.day_of_week === dayOfWeek)?.status || "○";
        const bAvail = b.availability.find((av) => av.day_of_week === dayOfWeek)?.status || "○";
        if (aAvail === "○" && bAvail === "△") return -1;
        if (aAvail === "△" && bAvail === "○") return 1;

        return 0;
      });

    // Assign top N candidates
    for (let i = 0; i < Math.min(neededCount, candidates.length); i++) {
      const staff = candidates[i];
      const breakMin = calcBreakMinutes(req.start_time, req.end_time);
      const shiftDuration = (toMinutes(req.end_time) - toMinutes(req.start_time)) / 60;

      generatedShifts.push({
        staff_id: staff.id,
        store_id: store.id,
        position_id: req.position_id,
        work_date: req.work_date,
        start_time: req.start_time,
        end_time: req.end_time,
        break_time_minutes: breakMin,
        is_ai_generated: true,
        is_manual_modified: false,
      });

      staffHours.set(staff.id, (staffHours.get(staff.id) || 0) + shiftDuration);
      assigned++;
    }

    if (assigned < neededCount) {
      warnings.push({
        type: "understaffed",
        message: `${req.work_date} ${req.start_time}-${req.end_time} の人員が${neededCount - assigned}人不足`,
        affected_date: req.work_date,
      });
    }
  }

  // Add id to each shift
  const shiftsWithId = generatedShifts.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
  }));

  return { shifts: shiftsWithId, warnings };
}
