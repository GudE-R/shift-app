import type { Store, StaffWithRelations, StoreRequirement, ShiftEntry, GenerateResult } from "@/types";
import type { GenerationDirective } from "./ai/types";
import { parseISO, getDay, eachDayOfInterval, format } from "date-fns";

interface GenerateParams {
  store: Store;
  staffList: StaffWithRelations[];
  requirements: StoreRequirement[];
  existingManualShifts: ShiftEntry[];
  dateRange: { start: string; end: string };
  // AIアシスタントが解釈した一時的なソフト指示。未指定なら従来挙動と完全に同一。
  directives?: GenerationDirective[];
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

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function extendShiftsForUnderstaffedSlots(
  generatedShifts: Omit<ShiftEntry, "id" | "updated_at">[],
  requirements: StoreRequirement[],
  existingManualShifts: ShiftEntry[]
) {
  for (const req of requirements) {
    const covering = [
      ...generatedShifts.filter(
        (s) => s.work_date === req.work_date && s.position_id === req.position_id &&
          timeOverlaps(s.start_time, s.end_time, req.start_time, req.end_time)
      ),
      ...existingManualShifts.filter(
        (s) => s.work_date === req.work_date && s.position_id === req.position_id &&
          timeOverlaps(s.start_time, s.end_time, req.start_time, req.end_time)
      ),
    ];
    if (covering.length >= req.count) continue;

    // Try extending end times of adjacent generated shifts to cover the slot
    const reqEnd = toMinutes(req.end_time);
    const extendable = generatedShifts
      .filter(
        (s) =>
          s.work_date === req.work_date &&
          s.position_id === req.position_id &&
          toMinutes(s.end_time) < reqEnd &&
          toMinutes(s.end_time) >= toMinutes(req.start_time)
      )
      .sort((a, b) => toMinutes(b.end_time) - toMinutes(a.end_time));

    const shortage = req.count - covering.length;
    for (let i = 0; i < Math.min(shortage, extendable.length); i++) {
      extendable[i].end_time = toHHMM(reqEnd);
      extendable[i].break_time_minutes = calcBreakMinutes(extendable[i].start_time, extendable[i].end_time);
    }
  }
}

export async function generateMockShifts(params: GenerateParams): Promise<GenerateResult> {
  const { store, staffList, requirements, existingManualShifts, dateRange, directives = [] } = params;

  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 1000));

  const generatedShifts: Omit<ShiftEntry, "id" | "updated_at">[] = [];
  const warnings: GenerateResult["warnings"] = [];

  // Track hours assigned to each staff during this generation
  const staffHours = new Map<string, number>();
  // Track shift COUNT per staff (for staff_shift_cap directive)
  const staffShiftCount = new Map<string, number>();

  // Pre-compute directive lookups (no directives => all neutral => 従来挙動)
  const weekendExtra = directives
    .filter((d): d is Extract<GenerationDirective, { kind: "weekend_heavy" }> => d.kind === "weekend_heavy")
    .reduce((sum, d) => sum + d.extra, 0);
  const reduceLaborCost = directives.some((d) => d.kind === "reduce_labor_cost");
  const shiftCaps = new Map(
    directives.filter((d) => d.kind === "staff_shift_cap").map((d: any) => [d.staffId, d.max])
  );
  const preferredStaff = new Set(
    directives.filter((d) => d.kind === "prefer_staff").map((d: any) => d.staffId)
  );
  const avoidStaffOn = new Set(
    directives.filter((d) => d.kind === "avoid_staff_on").map((d: any) => `${d.staffId}|${d.date}`)
  );

  // Get eligible staff for this store
  const eligibleStaff = staffList.filter((s) =>
    s.stores.some((ss) => ss.store_id === store.id)
  );

  // Pre-place fixed slots (highest priority)
  const dates = eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });
  for (const date of dates) {
    const workDate = format(date, "yyyy-MM-dd");
    const dow = getDay(date);
    for (const staff of eligibleStaff) {
      for (const slot of staff.fixedSlots) {
        if (slot.store_id !== store.id) continue;
        if (slot.day_of_week !== dow) continue;
        if (staff.ngDates.some((ng) => ng.ng_date === workDate)) continue;

        const overlapsManual = existingManualShifts.some(
          (ms) => ms.staff_id === staff.id && ms.work_date === workDate &&
            timeOverlaps(ms.start_time, ms.end_time, slot.start_time, slot.end_time)
        );
        if (overlapsManual) continue;

        // Pick position: prefer the requirement's position matching this time slot, else first assigned position
        const matchingReq = requirements.find(
          (r) => r.work_date === workDate && timeOverlaps(r.start_time, r.end_time, slot.start_time, slot.end_time)
            && staff.positions.some((sp) => sp.position_id === r.position_id)
        );
        const positionId = matchingReq?.position_id ?? staff.positions[0]?.position_id;
        if (!positionId) continue;

        generatedShifts.push({
          staff_id: staff.id,
          store_id: slot.store_id,
          position_id: positionId,
          work_date: workDate,
          start_time: slot.start_time,
          end_time: slot.end_time,
          break_time_minutes: calcBreakMinutes(slot.start_time, slot.end_time),
          is_ai_generated: true,
          is_manual_modified: false,
        });
        const duration = (toMinutes(slot.end_time) - toMinutes(slot.start_time)) / 60;
        staffHours.set(staff.id, (staffHours.get(staff.id) || 0) + duration);
        staffShiftCount.set(staff.id, (staffShiftCount.get(staff.id) || 0) + 1);
      }
    }
  }

  // Process each requirement slot
  for (const req of requirements) {
    const dayOfWeek = getDay(parseISO(req.work_date));
    let assigned = 0;

    // Check how many shifts (manual + already-placed fixed slots) cover this slot
    const alreadyCovering = [
      ...existingManualShifts.filter(
        (ms) =>
          ms.work_date === req.work_date &&
          ms.position_id === req.position_id &&
          timeOverlaps(ms.start_time, ms.end_time, req.start_time, req.end_time)
      ),
      ...generatedShifts.filter(
        (gs) =>
          gs.work_date === req.work_date &&
          gs.position_id === req.position_id &&
          timeOverlaps(gs.start_time, gs.end_time, req.start_time, req.end_time)
      ),
    ];
    // weekend_heavy: 土日は必要人数を増やす
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const effectiveCount = req.count + (isWeekend ? weekendExtra : 0);
    const neededCount = Math.max(0, effectiveCount - alreadyCovering.length);
    if (neededCount === 0) continue;

    // Find candidates for this slot
    const candidates = eligibleStaff
      .filter((staff) => {
        // Check position capability
        if (!staff.positions.some((sp) => sp.position_id === req.position_id)) return false;

        // Check NG dates
        if (staff.ngDates.some((ng) => ng.ng_date === req.work_date)) return false;

        // avoid_staff_on: この日だけ除外
        if (avoidStaffOn.has(`${staff.id}|${req.work_date}`)) return false;

        // staff_shift_cap: 総シフト数の上限に達していたら除外
        const cap = shiftCaps.get(staff.id);
        if (cap !== undefined && (staffShiftCount.get(staff.id) || 0) >= cap) return false;

        // Check availability
        const avail = staff.availability.find((a) => a.day_of_week === dayOfWeek);
        if (avail?.status === "×") return false;

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
        // prefer_staff: 指定スタッフを最優先
        const aPref = preferredStaff.has(a.id) ? 1 : 0;
        const bPref = preferredStaff.has(b.id) ? 1 : 0;
        if (aPref !== bPref) return bPref - aPref;

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

      // Use base shift if set (must cover the requirement slot)
      // reduce_labor_cost: 既定時間への延長をやめ、必要枠ぴったりに割り当てる
      let startTime = req.start_time;
      let endTime = req.end_time;
      if (!reduceLaborCost && staff.default_start_time && staff.default_end_time) {
        const baseStart = toMinutes(staff.default_start_time);
        const baseEnd = toMinutes(staff.default_end_time);
        const reqStart = toMinutes(req.start_time);
        const reqEnd = toMinutes(req.end_time);
        if (baseStart <= reqStart && baseEnd >= reqEnd) {
          startTime = staff.default_start_time;
          endTime = staff.default_end_time;
        }
      }

      const breakMin = calcBreakMinutes(startTime, endTime);
      const shiftDuration = (toMinutes(endTime) - toMinutes(startTime)) / 60;

      generatedShifts.push({
        staff_id: staff.id,
        store_id: store.id,
        position_id: req.position_id,
        work_date: req.work_date,
        start_time: startTime,
        end_time: endTime,
        break_time_minutes: breakMin,
        is_ai_generated: true,
        is_manual_modified: false,
      });

      staffHours.set(staff.id, (staffHours.get(staff.id) || 0) + shiftDuration);
      staffShiftCount.set(staff.id, (staffShiftCount.get(staff.id) || 0) + 1);
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

  // reduce_labor_cost 時はシフト延長による穴埋めもしない（総労働時間を抑える）
  if (!reduceLaborCost) {
    extendShiftsForUnderstaffedSlots(generatedShifts, requirements, existingManualShifts);
  }

  // Add id to each shift
  const shiftsWithId = generatedShifts.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
  }));

  return { shifts: shiftsWithId, warnings };
}
