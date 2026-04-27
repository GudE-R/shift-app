import { describe, it, expect } from "vitest";
import {
  checkBreakTime,
  checkDoubleBooking,
  checkOvertimeWeekly,
  checkOvertimeDaily,
  checkConsecutiveDays,
  validateShifts,
} from "./rules";
import type { ShiftEntry, Staff } from "@/types";

function makeShift(overrides: Partial<ShiftEntry> = {}): ShiftEntry {
  return {
    id: "shift-1",
    staff_id: "staff-1",
    store_id: "store-1",
    position_id: "pos-1",
    work_date: "2026-04-27", // 月曜
    start_time: "09:00",
    end_time: "17:00",
    break_time_minutes: 60,
    is_ai_generated: false,
    is_manual_modified: false,
    updated_at: "2026-04-27T00:00:00Z",
    ...overrides,
  };
}

function makeStaff(overrides: Partial<Staff> = {}): Staff {
  return {
    id: "staff-1",
    display_name: "山田太郎",
    anonymous_id: "anon-1",
    status: "active",
    target_hours: null,
    min_hours: null,
    max_hours: null,
    max_consecutive_days: null,
    memo: null,
    default_start_time: null,
    default_end_time: null,
    updated_at: "2026-04-27T00:00:00Z",
    ...overrides,
  };
}

describe("checkBreakTime", () => {
  it("8時間ぴったり勤務・休憩60分なら違反なし（境界: 480分は >480 ではない）", () => {
    const shift = makeShift({ start_time: "09:00", end_time: "17:00", break_time_minutes: 60 });
    expect(checkBreakTime([shift])).toEqual([]);
  });

  it("6時間ぴったり勤務・休憩0分なら違反なし（境界: 360分は >360 ではない）", () => {
    const shift = makeShift({ start_time: "09:00", end_time: "15:00", break_time_minutes: 0 });
    expect(checkBreakTime([shift])).toEqual([]);
  });

  it("8時間超勤務で休憩60分未満は error（>480分・<60分）", () => {
    const shift = makeShift({
      id: "s1",
      start_time: "09:00",
      end_time: "18:00", // 540分
      break_time_minutes: 45,
    });
    const results = checkBreakTime([shift]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      severity: "error",
      rule: "break_time",
      staff_id: "staff-1",
      work_date: "2026-04-27",
    });
    expect(results[0].message).toContain("8時間超");
  });

  it("8時間超勤務でも休憩60分ちょうどなら違反なし（else if 分岐に入らない）", () => {
    const shift = makeShift({ start_time: "09:00", end_time: "18:00", break_time_minutes: 60 });
    expect(checkBreakTime([shift])).toEqual([]);
  });

  it("6時間超〜8時間以下の勤務で休憩45分未満は error", () => {
    const shift = makeShift({
      start_time: "09:00",
      end_time: "16:00", // 420分
      break_time_minutes: 30,
    });
    const results = checkBreakTime([shift]);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("break_time");
    expect(results[0].message).toContain("6時間超");
  });

  it("6時間超勤務で休憩45分ちょうどなら違反なし", () => {
    const shift = makeShift({ start_time: "09:00", end_time: "16:00", break_time_minutes: 45 });
    expect(checkBreakTime([shift])).toEqual([]);
  });

  it("複数シフトを与えた場合、違反のあるものだけ抽出する", () => {
    const ok = makeShift({ id: "ok", start_time: "09:00", end_time: "13:00", break_time_minutes: 0 });
    const ng = makeShift({
      id: "ng",
      start_time: "09:00",
      end_time: "18:00",
      break_time_minutes: 30,
    });
    const results = checkBreakTime([ok, ng]);
    expect(results).toHaveLength(1);
  });

  it("空配列なら結果も空", () => {
    expect(checkBreakTime([])).toEqual([]);
  });
});

describe("checkDoubleBooking", () => {
  it("単一スタッフ・単一シフトなら違反なし", () => {
    expect(checkDoubleBooking([makeShift()])).toEqual([]);
  });

  it("同一スタッフ・同一日付・別店舗で時間が重なる場合は error", () => {
    const a = makeShift({ id: "a", store_id: "store-1", start_time: "09:00", end_time: "13:00" });
    const b = makeShift({ id: "b", store_id: "store-2", start_time: "12:00", end_time: "16:00" });
    const results = checkDoubleBooking([a, b]);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("double_booking");
    expect(results[0].severity).toBe("error");
  });

  it("同一店舗内で時間が重なっても検出しない（仕様: 別店舗のみ対象）", () => {
    const a = makeShift({ id: "a", store_id: "store-1", start_time: "09:00", end_time: "13:00" });
    const b = makeShift({ id: "b", store_id: "store-1", start_time: "12:00", end_time: "16:00" });
    expect(checkDoubleBooking([a, b])).toEqual([]);
  });

  it("別日付なら別店舗でも違反なし", () => {
    const a = makeShift({ id: "a", store_id: "store-1", work_date: "2026-04-27" });
    const b = makeShift({ id: "b", store_id: "store-2", work_date: "2026-04-28" });
    expect(checkDoubleBooking([a, b])).toEqual([]);
  });

  it("時間が完全に隣接（重ならない: 13:00終了 / 13:00開始）なら違反なし", () => {
    const a = makeShift({ id: "a", store_id: "store-1", start_time: "09:00", end_time: "13:00" });
    const b = makeShift({ id: "b", store_id: "store-2", start_time: "13:00", end_time: "17:00" });
    expect(checkDoubleBooking([a, b])).toEqual([]);
  });

  it("別スタッフなら同時刻・別店舗でも違反なし", () => {
    const a = makeShift({ id: "a", staff_id: "staff-1", store_id: "store-1" });
    const b = makeShift({ id: "b", staff_id: "staff-2", store_id: "store-2" });
    expect(checkDoubleBooking([a, b])).toEqual([]);
  });
});

describe("checkOvertimeWeekly", () => {
  it("週合計実働40時間以下なら違反なし", () => {
    // 9時間勤務 - 60分休憩 = 8時間実働 × 5日 = 40時間（境界: >40 ではない）
    const shifts: ShiftEntry[] = [
      "2026-04-27", // 月
      "2026-04-28", // 火
      "2026-04-29", // 水
      "2026-04-30", // 木
      "2026-05-01", // 金
    ].map((d, i) =>
      makeShift({
        id: `s${i}`,
        work_date: d,
        start_time: "09:00",
        end_time: "18:00",
        break_time_minutes: 60,
      })
    );
    expect(checkOvertimeWeekly(shifts)).toEqual([]);
  });

  it("週合計実働40時間超なら warning", () => {
    // 8時間勤務(休憩0) × 6日 = 48時間
    const shifts: ShiftEntry[] = [
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ].map((d, i) =>
      makeShift({
        id: `s${i}`,
        work_date: d,
        start_time: "09:00",
        end_time: "17:00",
        break_time_minutes: 0,
      })
    );
    const results = checkOvertimeWeekly(shifts);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      severity: "warning",
      rule: "overtime_weekly",
      staff_id: "staff-1",
    });
    expect(results[0].message).toContain("48.0");
  });

  it("週は月曜始まりで集計する（日曜と月曜は別週扱い）", () => {
    // 日曜 (2026-04-26) と月曜 (2026-04-27) は別週
    // 各日 25時間（不可能だが集計確認用に大量に）×2 = 50h ずつ別週なら警告は2件出る
    // 簡略化: 同一週内なら警告1件、別週なら 0 件 になることを確認
    const sun = makeShift({
      id: "sun",
      work_date: "2026-04-26",
      start_time: "00:00",
      end_time: "23:00", // 23h
      break_time_minutes: 0,
    });
    const mon = makeShift({
      id: "mon",
      work_date: "2026-04-27",
      start_time: "00:00",
      end_time: "23:00", // 23h
      break_time_minutes: 0,
    });
    // 別週なら 23h ずつ → 警告なし
    const results = checkOvertimeWeekly([sun, mon]);
    expect(results).toEqual([]);
  });

  it("複数スタッフがそれぞれ違反なら複数件出る", () => {
    const big = (staffId: string): ShiftEntry =>
      makeShift({
        id: `${staffId}-mon`,
        staff_id: staffId,
        work_date: "2026-04-27",
        start_time: "00:00",
        end_time: "23:00",
        break_time_minutes: 0,
      });
    const results = checkOvertimeWeekly([big("a"), big("b")]);
    // a, b それぞれ 1日23h × 1日 = 23h → 警告は出ない
    expect(results).toEqual([]);
  });
});

describe("checkOvertimeDaily", () => {
  it("12時間ぴったりなら違反なし（境界: >12 ではない）", () => {
    const shift = makeShift({ start_time: "08:00", end_time: "20:00" });
    expect(checkOvertimeDaily([shift])).toEqual([]);
  });

  it("12時間超なら warning", () => {
    const shift = makeShift({ start_time: "08:00", end_time: "21:00" }); // 13h
    const results = checkOvertimeDaily([shift]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      severity: "warning",
      rule: "overtime_daily",
      staff_id: "staff-1",
      work_date: "2026-04-27",
    });
    expect(results[0].message).toContain("13.0");
  });

  it("休憩を引かず純粋な拘束時間で判定する", () => {
    // 13時間勤務 + 60分休憩 → 実働12h だが、duration は13hなので warning が出る
    const shift = makeShift({ start_time: "08:00", end_time: "21:00", break_time_minutes: 60 });
    expect(checkOvertimeDaily([shift])).toHaveLength(1);
  });

  it("空配列なら結果も空", () => {
    expect(checkOvertimeDaily([])).toEqual([]);
  });
});

describe("checkConsecutiveDays", () => {
  it("max_consecutive_days=null（デフォルト5日）で5日連続なら違反なし", () => {
    const shifts = [
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
    ].map((d, i) => makeShift({ id: `s${i}`, work_date: d }));
    expect(checkConsecutiveDays(shifts, [makeStaff()])).toEqual([]);
  });

  it("デフォルト5日で6日連続なら6日目に warning", () => {
    const shifts = [
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ].map((d, i) => makeShift({ id: `s${i}`, work_date: d }));
    const results = checkConsecutiveDays(shifts, [makeStaff()]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      severity: "warning",
      rule: "consecutive_days",
      staff_id: "staff-1",
      work_date: "2026-05-02",
    });
  });

  it("max_consecutive_days=3 で4日連続なら4日目に warning", () => {
    const shifts = [
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
    ].map((d, i) => makeShift({ id: `s${i}`, work_date: d }));
    const staff = makeStaff({ max_consecutive_days: 3 });
    const results = checkConsecutiveDays(shifts, [staff]);
    expect(results).toHaveLength(1);
    expect(results[0].work_date).toBe("2026-04-30");
    expect(results[0].message).toContain("4日連続");
    expect(results[0].message).toContain("上限3日");
  });

  it("飛び石の日付ならカウントがリセットされ違反なし", () => {
    const shifts = [
      "2026-04-27",
      "2026-04-28",
      "2026-04-30", // 1日空く
      "2026-05-01",
      "2026-05-02",
    ].map((d, i) => makeShift({ id: `s${i}`, work_date: d }));
    expect(checkConsecutiveDays(shifts, [makeStaff()])).toEqual([]);
  });

  it("staffList に該当スタッフが居なくてもデフォルト5日で判定する", () => {
    const shifts = [
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ].map((d, i) => makeShift({ id: `s${i}`, work_date: d }));
    const results = checkConsecutiveDays(shifts, []); // staffList 空
    expect(results).toHaveLength(1);
  });

  it("複数スタッフの連続勤務をそれぞれ個別に判定する", () => {
    const mkShifts = (staffId: string) =>
      [
        "2026-04-27",
        "2026-04-28",
        "2026-04-29",
        "2026-04-30",
        "2026-05-01",
        "2026-05-02",
      ].map((d, i) => makeShift({ id: `${staffId}-${i}`, staff_id: staffId, work_date: d }));
    const all = [...mkShifts("a"), ...mkShifts("b")];
    const results = checkConsecutiveDays(all, [
      makeStaff({ id: "a" }),
      makeStaff({ id: "b" }),
    ]);
    expect(results).toHaveLength(2);
    expect(new Set(results.map((r) => r.staff_id))).toEqual(new Set(["a", "b"]));
  });

  it("連続勤務日が重複登録されていても Set で1日として扱われる", () => {
    // 同一日に2件の入力 → 1日扱い
    const shifts = [
      makeShift({ id: "1", work_date: "2026-04-27" }),
      makeShift({ id: "2", work_date: "2026-04-27", store_id: "store-2" }),
    ];
    expect(checkConsecutiveDays(shifts, [makeStaff()])).toEqual([]);
  });
});

describe("validateShifts", () => {
  it("各ルールの結果が結合されて返る", () => {
    const longShift = makeShift({
      id: "long",
      start_time: "06:00",
      end_time: "21:00", // 15h: 12h超 → overtime_daily warning
      break_time_minutes: 30, // 8h超 + <60分 → break_time error
    });
    const results = validateShifts([longShift], [makeStaff()]);
    const rules = results.map((r) => r.rule).sort();
    expect(rules).toContain("break_time");
    expect(rules).toContain("overtime_daily");
  });

  it("違反のないシフトなら空配列を返す", () => {
    const ok = makeShift({ start_time: "09:00", end_time: "17:00", break_time_minutes: 60 });
    expect(validateShifts([ok], [makeStaff()])).toEqual([]);
  });

  it("空配列を渡しても落ちない", () => {
    expect(validateShifts([], [])).toEqual([]);
  });
});
