import { useState, useEffect } from "react";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { NgDateEditor } from "./NgDateEditor";
import type { StaffWithRelations, AvailabilityStatus } from "@/types";

interface Props {
  staff: StaffWithRelations | null;
  onClose: () => void;
}

export function StaffForm({ staff, onClose }: Props) {
  const { addStaff, editStaff, setStaffStores, setStaffPositions, setStaffAvailability } = useStaffStore();
  const { stores, positions, fetchStores, fetchPositions } = useStoreStore();
  const [tab, setTab] = useState("basic");

  const [name, setName] = useState(staff?.display_name || "");
  const [nightShiftOk, setNightShiftOk] = useState(staff?.night_shift_ok ?? true);
  const [targetHours, setTargetHours] = useState(staff?.target_hours?.toString() || "");
  const [minHours, setMinHours] = useState(staff?.min_hours?.toString() || "");
  const [maxHours, setMaxHours] = useState(staff?.max_hours?.toString() || "");
  const [maxConsecutive, setMaxConsecutive] = useState(staff?.max_consecutive_days?.toString() || "");
  const [memo, setMemo] = useState(staff?.memo || "");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(staff?.stores.map((s) => s.store_id) || []);
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>(staff?.positions.map((p) => p.position_id) || []);
  const [availability, setAvailability] = useState<{ day_of_week: number; status: AvailabilityStatus }[]>(
    staff?.availability.map((a) => ({ day_of_week: a.day_of_week, status: a.status as AvailabilityStatus })) ||
    Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, status: "○" as AvailabilityStatus }))
  );

  useEffect(() => {
    fetchStores();
    fetchPositions();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;

    const id = staff?.id || crypto.randomUUID();
    const data = {
      id,
      display_name: name,
      anonymous_id: staff?.anonymous_id || `staff_${id.slice(0, 8)}`,
      status: "active" as const,
      night_shift_ok: nightShiftOk,
      target_hours: targetHours ? parseFloat(targetHours) : null,
      min_hours: minHours ? parseFloat(minHours) : null,
      max_hours: maxHours ? parseFloat(maxHours) : null,
      max_consecutive_days: maxConsecutive ? parseInt(maxConsecutive) : null,
      memo: memo || null,
    };

    if (staff) {
      await editStaff(id, data);
    } else {
      await addStaff(data);
    }

    await setStaffStores(id, selectedStoreIds);
    await setStaffPositions(id, selectedPositionIds);
    await setStaffAvailability(id, availability);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>{staff ? "スタッフ編集" : "スタッフ追加"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="availability">曜日別可否</TabsTrigger>
            <TabsTrigger value="ngdates">NG日</TabsTrigger>
            <TabsTrigger value="assign">店舗・ポジション</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <div className="space-y-4">
              <div>
                <Label>表示名</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" autoFocus />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>目標時間(h/月)</Label>
                  <Input type="number" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} />
                </div>
                <div>
                  <Label>最低時間</Label>
                  <Input type="number" value={minHours} onChange={(e) => setMinHours(e.target.value)} />
                </div>
                <div>
                  <Label>上限時間</Label>
                  <Input type="number" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>連続勤務上限(日)</Label>
                <Input type="number" value={maxConsecutive} onChange={(e) => setMaxConsecutive(e.target.value)} placeholder="未設定=5日" className="w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={nightShiftOk} onCheckedChange={setNightShiftOk} />
                <Label>夜勤OK（22:00-翌5:00）</Label>
              </div>
              <div>
                <Label>メモ</Label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="人間関係・相性など" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityEditor value={availability} onChange={setAvailability} />
          </TabsContent>

          <TabsContent value="ngdates">
            {staff && <NgDateEditor staffId={staff.id} />}
            {!staff && <p className="text-sm text-muted-foreground py-4">保存後にNG日を追加できます</p>}
          </TabsContent>

          <TabsContent value="assign">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">出勤可能店舗</Label>
                <div className="space-y-2">
                  {stores.map((store) => (
                    <div key={store.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedStoreIds.includes(store.id)}
                        onCheckedChange={(checked) => {
                          setSelectedStoreIds((prev) =>
                            checked ? [...prev, store.id] : prev.filter((id) => id !== store.id)
                          );
                        }}
                      />
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: store.color }} />
                      <span className="text-sm">{store.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">対応可能ポジション</Label>
                <div className="space-y-2">
                  {positions.map((pos) => (
                    <div key={pos.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedPositionIds.includes(pos.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPositionIds((prev) =>
                            checked ? [...prev, pos.id] : prev.filter((id) => id !== pos.id)
                          );
                        }}
                      />
                      <span className="text-sm">{pos.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
