import type { AvailabilityStatus } from "@/types";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const STATUSES: AvailabilityStatus[] = ["○", "△", "×"];

interface Props {
  value: { day_of_week: number; status: AvailabilityStatus }[];
  onChange: (value: { day_of_week: number; status: AvailabilityStatus }[]) => void;
}

export function AvailabilityEditor({ value, onChange }: Props) {
  const toggle = (dayOfWeek: number) => {
    const current = value.find((v) => v.day_of_week === dayOfWeek)?.status || "○";
    const nextIdx = (STATUSES.indexOf(current) + 1) % STATUSES.length;
    onChange(
      value.map((v) =>
        v.day_of_week === dayOfWeek ? { ...v, status: STATUSES[nextIdx] } : v
      )
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">クリックで ○ → △ → × を切り替え</p>
      <div className="flex gap-2">
        {DAYS.map((day, i) => {
          const status = value.find((v) => v.day_of_week === i)?.status || "○";
          return (
            <button
              key={i}
              className={`flex flex-col items-center justify-center w-14 h-16 rounded-lg border-2 transition-colors ${
                status === "○" ? "border-green-400 bg-green-50" :
                status === "△" ? "border-yellow-400 bg-yellow-50" :
                "border-red-400 bg-red-50"
              }`}
              onClick={() => toggle(i)}
            >
              <span className="text-xs text-muted-foreground">{day}</span>
              <span className="text-lg font-bold">{status}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
