import type { ValidationResult, Staff } from "@/types";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle } from "lucide-react";

interface Props {
  results: ValidationResult[];
  staffList: Staff[];
}

export function ValidationPanel({ results, staffList }: Props) {
  if (results.length === 0) return null;

  const getStaffName = (id: string) => staffList.find((s) => s.id === id)?.display_name || "不明";

  const errors = results.filter((r) => r.severity === "error");
  const warnings = results.filter((r) => r.severity === "warning");

  return (
    <div className="border rounded-lg p-3 bg-muted/30 flex-shrink-0 max-h-40 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">バリデーション</span>
        {errors.length > 0 && <Badge variant="destructive">{errors.length}件のエラー</Badge>}
        {warnings.length > 0 && <Badge variant="warning">{warnings.length}件の警告</Badge>}
      </div>
      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            {r.severity === "error" ? (
              <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <span>
              <span className="font-medium">{getStaffName(r.staff_id)}</span>
              {r.work_date && <span className="text-muted-foreground"> ({r.work_date})</span>}
              {" "}{r.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
