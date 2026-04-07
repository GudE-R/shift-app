import type { ShiftEntryWithNames } from "@/types";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export async function exportCsv(shifts: ShiftEntryWithNames[], storeName: string) {
  const BOM = "\uFEFF";
  const header = "日付,スタッフ名,店舗名,ポジション,開始時間,終了時間,休憩(分)";
  const rows = shifts
    .sort((a, b) => a.work_date.localeCompare(b.work_date) || a.start_time.localeCompare(b.start_time))
    .map((s) =>
      [s.work_date, s.staff_name, s.store_name, s.position_name, s.start_time, s.end_time, s.break_time_minutes].join(",")
    );

  const content = BOM + [header, ...rows].join("\n");

  const path = await save({
    defaultPath: `shift_${storeName}_${shifts[0]?.work_date || "export"}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (path) {
    await writeTextFile(path, content);
  }
}
