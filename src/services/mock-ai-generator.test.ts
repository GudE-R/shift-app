import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMockShifts } from "./mock-ai-generator";
import type {
  Store,
  StaffWithRelations,
  StoreRequirement,
  ShiftEntry,
  StaffStore,
  StaffPosition,
  StaffAvailability,
  StaffNgDate,
  StaffFixedSlot,
} from "@/types";

const TS = "2026-04-27T00:00:00Z";

function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    id: "store-1",
    name: "店舗1",
    color: "#000000",
    business_hours: "{}",
    sort_order: 0,
    updated_at: TS,
    ...overrides,
  };
}

function makeStaff(overrides: Partial<StaffWithRelations> = {}): StaffWithRelations {
  const id = overrides.id ?? "staff-1";
  const stores: StaffStore[] = overrides.stores ?? [
    { staff_id: id, store_id: "store-1", updated_at: TS },
  ];
  const positions: StaffPosition[] = overrides.positions ?? [
    { staff_id: id, position_id: "pos-1", updated_at: TS },
  ];
  const availability: StaffAvailability[] = overrides.availability ?? [];
  const ngDates: StaffNgDate[] = overrides.ngDates ?? [];
  const fixedSlots: StaffFixedSlot[] = overrides.fixedSlots ?? [];

  return {
    id,
    display_name: `Staff ${id}`,
    anonymous_id: `anon-${id}`,
    status: "active",
    target_hours: null,
    min_hours: null,
    max_hours: null,
    max_consecutive_days: null,
    memo: null,
    default_start_time: null,
    default_end_time: null,
    updated_at: TS,
    ...overrides,
    stores,
    positions,
    availability,
    ngDates,
    fixedSlots,
  };
}

function makeRequirement(overrides: Partial<StoreRequirement> = {}): StoreRequirement {
  return {
    id: "req-1",
    store_id: "store-1",
    position_id: "pos-1",
    work_date: "2026-04-27", // 月曜
    start_time: "09:00",
    end_time: "17:00",
    count: 1,
    updated_at: TS,
    ...overrides,
  };
}

function makeManualShift(overrides: Partial<ShiftEntry> = {}): ShiftEntry {
  return {
    id: "manual-1",
    staff_id: "staff-1",
    store_id: "store-1",
    position_id: "pos-1",
    work_date: "2026-04-27",
    start_time: "09:00",
    end_time: "17:00",
    break_time_minutes: 60,
    is_ai_generated: false,
    is_manual_modified: true,
    updated_at: TS,
    ...overrides,
  };
}

const DATE_RANGE = { start: "2026-04-27", end: "2026-04-27" }; // 月曜1日のみ

// generateMockShifts は内部で setTimeout(1000) を使うため、各テストで fake timers を使う
async function run(params: Parameters<typeof generateMockShifts>[0]) {
  const promise = generateMockShifts(params);
  await vi.runAllTimersAsync();
  return promise;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("generateMockShifts — 基本動作", () => {
  it("1人のスタッフを1つの requirement に割り当てる（正常系）", async () => {
    const result = await run({
      store: makeStore(),
      staffList: [makeStaff()],
      requirements: [makeRequirement()],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0]).toMatchObject({
      staff_id: "staff-1",
      store_id: "store-1",
      position_id: "pos-1",
      work_date: "2026-04-27",
      start_time: "09:00",
      end_time: "17:00",
      is_ai_generated: true,
    });
    expect(result.shifts[0].id).toBeTypeOf("string");
    expect(result.warnings).toEqual([]);
  });

  it("対象店舗に所属していないスタッフは候補にならず人員不足になる", async () => {
    const otherStaff = makeStaff({
      id: "staff-2",
      stores: [{ staff_id: "staff-2", store_id: "store-OTHER", updated_at: TS }],
    });
    const result = await run({
      store: makeStore(),
      staffList: [otherStaff],
      requirements: [makeRequirement()],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe("understaffed");
    expect(result.warnings[0].affected_date).toBe("2026-04-27");
  });

  it("position に対応していないスタッフは割り当てられない", async () => {
    const wrongPosStaff = makeStaff({
      positions: [{ staff_id: "staff-1", position_id: "pos-OTHER", updated_at: TS }],
    });
    const result = await run({
      store: makeStore(),
      staffList: [wrongPosStaff],
      requirements: [makeRequirement()],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});

describe("generateMockShifts — 候補フィルタリング", () => {
  it("NG date が一致するスタッフは候補から外れる", async () => {
    const ngStaff = makeStaff({
      ngDates: [{ id: "ng-1", staff_id: "staff-1", ng_date: "2026-04-27", reason: null, updated_at: TS }],
    });
    const result = await run({
      store: makeStore(),
      staffList: [ngStaff],
      requirements: [makeRequirement()],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it("availability が '×' の曜日のスタッフは候補から外れる", async () => {
    const ngStaff = makeStaff({
      availability: [{ id: "av-1", staff_id: "staff-1", day_of_week: 1, status: "×", updated_at: TS }],
    });
    const result = await run({
      store: makeStore(),
      staffList: [ngStaff],
      requirements: [makeRequirement()],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
  });

  it("既存 manual シフトと時間重複するスタッフは候補にならない", async () => {
    // manual は別 position なので alreadyCovering には入らないが、
    // 同一日付・時間重複なので staff は候補から除外される
    const staff = makeStaff({
      positions: [
        { staff_id: "staff-1", position_id: "pos-1", updated_at: TS },
        { staff_id: "staff-1", position_id: "pos-2", updated_at: TS },
      ],
    });
    const manual = makeManualShift({
      position_id: "pos-1",
      start_time: "10:00",
      end_time: "12:00",
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [
        makeRequirement({ position_id: "pos-2", start_time: "11:00", end_time: "15:00" }),
      ],
      existingManualShifts: [manual],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it("既存 manual シフトが req と同じ position・時間をカバーしていれば追加生成は行わない", async () => {
    const staff = makeStaff({ id: "staff-A" });
    const otherStaff = makeStaff({ id: "staff-B" });
    const manual = makeManualShift({
      staff_id: "staff-A",
      start_time: "09:00",
      end_time: "17:00",
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff, otherStaff],
      requirements: [makeRequirement({ count: 1 })],
      existingManualShifts: [manual],
      dateRange: DATE_RANGE,
    });
    // manual が既にカバーしているので新規 generated は無し
    expect(result.shifts).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe("generateMockShifts — ソート/優先度", () => {
  it("availability が '○' のスタッフが '△' より優先される", async () => {
    const triangleStaff = makeStaff({
      id: "tri",
      availability: [{ id: "a1", staff_id: "tri", day_of_week: 1, status: "△", updated_at: TS }],
    });
    const circleStaff = makeStaff({
      id: "circ",
      availability: [{ id: "a2", staff_id: "circ", day_of_week: 1, status: "○", updated_at: TS }],
    });
    const result = await run({
      store: makeStore(),
      staffList: [triangleStaff, circleStaff], // 順序は ○ より △ が先
      requirements: [makeRequirement({ count: 1 })],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].staff_id).toBe("circ");
  });

  it("count > 1 の requirement に複数スタッフを割り当てる", async () => {
    const a = makeStaff({ id: "a" });
    const b = makeStaff({ id: "b" });
    const c = makeStaff({ id: "c" });
    const result = await run({
      store: makeStore(),
      staffList: [a, b, c],
      requirements: [makeRequirement({ count: 2 })],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it("候補数が count に満たない場合 warnings に understaffed が追加される", async () => {
    const result = await run({
      store: makeStore(),
      staffList: [makeStaff()],
      requirements: [makeRequirement({ count: 3 })],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      type: "understaffed",
      affected_date: "2026-04-27",
    });
    expect(result.warnings[0].message).toContain("2人不足");
  });
});

describe("generateMockShifts — base shift (default 時間)", () => {
  it("staff.default_start/end が requirement を完全カバーするなら base shift を採用する", async () => {
    const staff = makeStaff({
      default_start_time: "08:00",
      default_end_time: "18:00",
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [makeRequirement({ start_time: "09:00", end_time: "17:00" })],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].start_time).toBe("08:00");
    expect(result.shifts[0].end_time).toBe("18:00");
    // 10時間 (>8時間) → 60分休憩
    expect(result.shifts[0].break_time_minutes).toBe(60);
  });

  it("staff.default 時間が requirement をカバーしない場合は requirement の時間を使う", async () => {
    const staff = makeStaff({
      default_start_time: "10:00", // req start (09:00) より遅い → カバーしない
      default_end_time: "16:00",
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [makeRequirement({ start_time: "09:00", end_time: "17:00" })],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].start_time).toBe("09:00");
    expect(result.shifts[0].end_time).toBe("17:00");
  });
});

describe("generateMockShifts — fixed slots (固定シフト)", () => {
  it("曜日が一致する固定シフトが requirement に先んじて配置される", async () => {
    const staff = makeStaff({
      fixedSlots: [
        {
          id: "f1",
          staff_id: "staff-1",
          day_of_week: 1, // 月曜
          store_id: "store-1",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
      ],
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [], // requirement 無し
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0]).toMatchObject({
      staff_id: "staff-1",
      start_time: "10:00",
      end_time: "14:00",
      position_id: "pos-1", // staff.positions[0]
      is_ai_generated: true,
    });
  });

  it("曜日が異なる固定シフトは無視される", async () => {
    const staff = makeStaff({
      fixedSlots: [
        {
          id: "f1",
          staff_id: "staff-1",
          day_of_week: 0, // 日曜（テスト日は月曜）
          store_id: "store-1",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
      ],
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
  });

  it("固定シフトが NG date と重なる日はスキップする", async () => {
    const staff = makeStaff({
      fixedSlots: [
        {
          id: "f1",
          staff_id: "staff-1",
          day_of_week: 1,
          store_id: "store-1",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
      ],
      ngDates: [{ id: "ng-1", staff_id: "staff-1", ng_date: "2026-04-27", reason: null, updated_at: TS }],
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
  });

  it("固定シフトが既存 manual シフトと時間重複する場合スキップする", async () => {
    const staff = makeStaff({
      fixedSlots: [
        {
          id: "f1",
          staff_id: "staff-1",
          day_of_week: 1,
          store_id: "store-1",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
      ],
    });
    const manual = makeManualShift({ start_time: "12:00", end_time: "16:00" });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [],
      existingManualShifts: [manual],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
  });

  it("固定シフトの店舗が対象店舗と異なる場合はスキップする", async () => {
    const staff = makeStaff({
      fixedSlots: [
        {
          id: "f1",
          staff_id: "staff-1",
          day_of_week: 1,
          store_id: "store-OTHER",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
      ],
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toEqual([]);
  });
});

describe("generateMockShifts — extendShiftsForUnderstaffedSlots", () => {
  it("requirement の人員不足分について、既存 generated シフトの end_time が requirement.end_time まで延長される", async () => {
    // 1人だけの staff で:
    //   r1 (09:00-12:00 count=1) → staff を 09:00-12:00 で配置
    //   r2 (09:00-15:00 count=2) → staff は時間重複で除外、understaffed warning
    //   extend: r2 covering=1 < 2、shortage=1、既存 09:00-12:00 を 15:00 へ延長
    const staff = makeStaff({ id: "extend-staff" });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [
        makeRequirement({ id: "r1", start_time: "09:00", end_time: "12:00", count: 1 }),
        makeRequirement({ id: "r2", start_time: "09:00", end_time: "15:00", count: 2 }),
      ],
      existingManualShifts: [],
      dateRange: DATE_RANGE,
    });
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].start_time).toBe("09:00");
    expect(result.shifts[0].end_time).toBe("15:00");
    // 6h勤務 → 休憩なし (>360 ではないので 0)
    expect(result.shifts[0].break_time_minutes).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe("understaffed");
  });
});

describe("generateMockShifts — 範囲指定", () => {
  it("dateRange の各日について処理される（複数日にわたる固定シフト配置）", async () => {
    // 2026-04-27 月曜 〜 2026-05-03 日曜（7日間）
    const staff = makeStaff({
      fixedSlots: [
        {
          id: "f-mon",
          staff_id: "staff-1",
          day_of_week: 1, // 月曜のみ
          store_id: "store-1",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
        {
          id: "f-wed",
          staff_id: "staff-1",
          day_of_week: 3, // 水曜のみ
          store_id: "store-1",
          start_time: "10:00",
          end_time: "14:00",
          updated_at: TS,
        },
      ],
    });
    const result = await run({
      store: makeStore(),
      staffList: [staff],
      requirements: [],
      existingManualShifts: [],
      dateRange: { start: "2026-04-27", end: "2026-05-03" },
    });
    // 月曜(4/27) と 水曜(4/29) の2日分
    expect(result.shifts).toHaveLength(2);
    const dates = result.shifts.map((s) => s.work_date).sort();
    expect(dates).toEqual(["2026-04-27", "2026-04-29"]);
  });
});
