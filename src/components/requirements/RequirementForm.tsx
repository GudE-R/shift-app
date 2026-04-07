import { useState } from "react";
import { useStoreStore } from "@/stores/useStoreStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createRequirement } from "@/db/queries/store-requirements";
import { format } from "date-fns";

interface Props {
  storeId: string;
  onClose: () => void;
}

export function RequirementForm({ storeId, onClose }: Props) {
  const { positions } = useStoreStore();
  const storePositions = positions.filter((p) => p.store_id === storeId);

  const [positionId, setPositionId] = useState(storePositions[0]?.id || "");
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");
  const [count, setCount] = useState("1");

  const handleSave = async () => {
    if (!positionId || !workDate) return;
    await createRequirement({
      id: crypto.randomUUID(),
      store_id: storeId,
      position_id: positionId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      count: parseInt(count) || 1,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>必要人員追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>ポジション</Label>
            <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
              {storePositions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>日付</Label>
            <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>開始時間</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>終了時間</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>必要人数</Label>
            <Input type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} className="w-24" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
