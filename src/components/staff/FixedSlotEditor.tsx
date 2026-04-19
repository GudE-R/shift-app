import { useState } from "react";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatTimeInput(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

export function FixedSlotEditor({ staffId }: { staffId: string }) {
  const { staffList, addFixedSlot, removeFixedSlot } = useStaffStore();
  const { stores } = useStoreStore();
  const staff = staffList.find((s) => s.id === staffId);

  const assignedStoreIds = new Set(staff?.stores.map((s) => s.store_id) ?? []);
  const availableStores = stores.filter((s) => assignedStoreIds.has(s.id));

  const [dayOfWeek, setDayOfWeek] = useState<string>("3");
  const [storeId, setStoreId] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleAdd = async () => {
    if (!storeId || !startTime || !endTime) return;
    await addFixedSlot({
      staff_id: staffId,
      day_of_week: parseInt(dayOfWeek),
      store_id: storeId,
      start_time: startTime,
      end_time: endTime,
    });
    setStartTime("");
    setEndTime("");
  };

  const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "?";

  const canSave = Boolean(storeId && startTime && endTime);
  const needsAssign = availableStores.length === 0;

  return (
    <div className="space-y-4">
      {needsAssign && (
        <p className="text-xs text-amber-600">
          先に「店舗・ポジション」タブで出勤可能店舗を選んでください
        </p>
      )}
      <div className="border rounded-md p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">曜日</Label>
            <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
              {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">店舗</Label>
            <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">選択</option>
              {availableStores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">時間</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="22:00"
                maxLength={5}
                value={startTime}
                onChange={(e) => setStartTime(formatTimeInput(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">〜</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="05:00"
                maxLength={5}
                value={endTime}
                onChange={(e) => setEndTime(formatTimeInput(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!canSave}>
            <Plus className="h-4 w-4 mr-1" /> 追加
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {staff?.fixedSlots.length === 0 && (
          <p className="text-sm text-muted-foreground">固定シフトは未登録</p>
        )}
        {staff?.fixedSlots.map((fs) => (
          <div key={fs.id} className="flex items-center justify-between py-1 px-2 bg-blue-50 rounded">
            <span className="text-sm">
              <span className="font-medium">{DAYS[fs.day_of_week]}曜</span>
              {" "}{fs.start_time}〜{fs.end_time}
              <span className="text-muted-foreground ml-2">{storeName(fs.store_id)}</span>
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFixedSlot(fs.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
