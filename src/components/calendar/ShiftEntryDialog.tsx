import { useState } from "react";
import { useShiftStore } from "@/stores/useShiftStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ShiftEntryWithNames } from "@/types";

interface Props {
  staffId: string;
  date: string;
  shift?: ShiftEntryWithNames;
  onClose: () => void;
}

export function ShiftEntryDialog({ staffId, date, shift, onClose }: Props) {
  const { addShift, editShift, removeShift } = useShiftStore();
  const { stores, positions } = useStoreStore();

  const [storeId, setStoreId] = useState(shift?.store_id || stores[0]?.id || "");
  const [positionId, setPositionId] = useState(shift?.position_id || positions[0]?.id || "");
  const [startTime, setStartTime] = useState(shift?.start_time || "09:00");
  const [endTime, setEndTime] = useState(shift?.end_time || "17:00");
  const [breakMinutes, setBreakMinutes] = useState((shift?.break_time_minutes || 0).toString());
  const [isManual, setIsManual] = useState(shift?.is_manual_modified ?? true);

  const storePositions = positions.filter((p) => p.store_id === storeId);

  const handleSave = async () => {
    if (!storeId || !positionId) return;

    if (shift) {
      await editShift(shift.id, {
        store_id: storeId,
        position_id: positionId,
        start_time: startTime,
        end_time: endTime,
        break_time_minutes: parseInt(breakMinutes) || 0,
        is_manual_modified: true,
      });
    } else {
      await addShift({
        id: crypto.randomUUID(),
        staff_id: staffId,
        store_id: storeId,
        position_id: positionId,
        work_date: date,
        start_time: startTime,
        end_time: endTime,
        break_time_minutes: parseInt(breakMinutes) || 0,
        is_ai_generated: false,
        is_manual_modified: isManual,
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (shift) {
      await removeShift(shift.id);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>{shift ? "シフト編集" : "シフト追加"} - {date}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>店舗</Label>
            <Select value={storeId} onChange={(e) => { setStoreId(e.target.value); setPositionId(""); }}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>ポジション</Label>
            <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
              <option value="">選択してください</option>
              {storePositions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>開始</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>終了</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>休憩(分)</Label>
            <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className="w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isManual} onCheckedChange={setIsManual} />
            <Label>手動保護（AI再生成で上書きしない）</Label>
          </div>
        </div>
        <DialogFooter>
          {shift && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">削除</Button>
          )}
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
