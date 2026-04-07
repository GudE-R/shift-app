import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { getShiftsByDateRange } from "@/db/queries/shift-entries";
import { getRequirements } from "@/db/queries/store-requirements";
import { validateShifts } from "@/validation/rules";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { ShiftEntryWithNames, StoreRequirement, ValidationResult } from "@/types";

export function DashboardPage() {
  const { staffList, fetchStaff } = useStaffStore();
  const { stores, fetchStores } = useStoreStore();
  const [weekShifts, setWeekShifts] = useState<ShiftEntryWithNames[]>([]);
  const [requirements, setRequirements] = useState<StoreRequirement[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchStaff();
    fetchStores();
    loadData();
  }, []);

  useEffect(() => {
    if (weekShifts.length > 0 || staffList.length > 0) {
      setValidations(validateShifts(weekShifts, staffList));
    }
  }, [weekShifts, staffList]);

  const loadData = async () => {
    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(weekEnd, "yyyy-MM-dd");
    const shifts = await getShiftsByDateRange(start, end);
    setWeekShifts(shifts);
    const reqs = await getRequirements(undefined, { start, end });
    setRequirements(reqs);
  };

  // Calculate staffing rate
  const totalRequired = requirements.reduce((sum, r) => sum + r.count, 0);
  const totalAssigned = requirements.reduce((sum, req) => {
    const covering = weekShifts.filter(
      (s) =>
        s.work_date === req.work_date &&
        s.store_id === req.store_id &&
        s.position_id === req.position_id
    );
    return sum + Math.min(covering.length, req.count);
  }, 0);
  const staffingRate = totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 0;

  // Total hours this week
  const totalHours = weekShifts.reduce((sum, s) => {
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    return sum + ((eh * 60 + em) - (sh * 60 + sm) - s.break_time_minutes) / 60;
  }, 0);

  const errors = validations.filter((v) => v.severity === "error").length;
  const warnings = validations.filter((v) => v.severity === "warning").length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>
      <p className="text-muted-foreground">
        {format(weekStart, "M月d日", { locale: ja })} 〜 {format(weekEnd, "M月d日", { locale: ja })} の概要
      </p>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今週のシフト数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekShifts.length}</div>
            <p className="text-xs text-muted-foreground">合計 {totalHours.toFixed(1)} 時間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">充足率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${staffingRate >= 80 ? "text-green-600" : staffingRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
              {staffingRate}%
            </div>
            <p className="text-xs text-muted-foreground">{totalAssigned} / {totalRequired} スロット</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブスタッフ</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffList.length}</div>
            <p className="text-xs text-muted-foreground">{stores.length} 店舗</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">警告</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {errors > 0 && <Badge variant="destructive">{errors} エラー</Badge>}
              {warnings > 0 && <Badge variant="warning">{warnings} 警告</Badge>}
              {errors === 0 && warnings === 0 && <span className="text-2xl font-bold text-green-600">0</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">日別シフト数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {weekDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const count = weekShifts.filter((s) => s.work_date === dateStr).length;
              return (
                <div key={dateStr} className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground">{format(day, "E", { locale: ja })}</div>
                  <div className="text-xs text-muted-foreground">{format(day, "M/d")}</div>
                  <div className="mt-1 h-16 bg-muted rounded flex items-end justify-center pb-1">
                    <div
                      className="w-6 bg-primary rounded-t"
                      style={{ height: `${Math.min(count * 8, 56)}px` }}
                    />
                  </div>
                  <div className="text-sm font-medium mt-1">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
