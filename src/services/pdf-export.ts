import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ShiftEntryWithNames, Staff } from "@/types";
import { eachDayOfInterval, parseISO, format, getDay } from "date-fns";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export async function exportPdf(
  shifts: ShiftEntryWithNames[],
  staffList: Staff[],
  dateRange: { start: string; end: string },
  storeName: string
) {
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });

  // Note: Japanese font embedding is skipped for now; using default font
  // For production, NotoSansJP base64 should be added here
  doc.setFontSize(16);
  doc.text(`${storeName} シフト表`, 14, 20);
  doc.setFontSize(10);
  doc.text(`${dateRange.start} ~ ${dateRange.end}`, 14, 28);

  const days = eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });

  const headers = ["Staff", ...days.map((d) => `${format(d, "M/d")}(${DAY_LABELS[getDay(d)]})`)];

  const body = staffList.map((staff) => {
    const row = [staff.display_name];
    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayShifts = shifts.filter((s) => s.staff_id === staff.id && s.work_date === dateStr);
      if (dayShifts.length > 0) {
        row.push(dayShifts.map((s) => `${s.start_time}-${s.end_time}`).join("\n"));
      } else {
        row.push("");
      }
    }
    return row;
  });

  autoTable(doc, {
    head: [headers],
    body,
    startY: 35,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { cellWidth: 30 } },
    theme: "grid",
  });

  const pdfBytes = doc.output("arraybuffer");

  const path = await save({
    defaultPath: `shift_${storeName}_${dateRange.start}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (path) {
    await writeFile(path, new Uint8Array(pdfBytes));
  }
}
