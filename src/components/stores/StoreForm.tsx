import { useState } from "react";
import { useStoreStore } from "@/stores/useStoreStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Store } from "@/types";

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

interface Props {
  store: Store | null;
  onClose: () => void;
}

export function StoreForm({ store, onClose }: Props) {
  const { addStore, editStore } = useStoreStore();
  const [name, setName] = useState(store?.name || "");
  const [color, setColor] = useState(store?.color || COLORS[0]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (store) {
      await editStore(store.id, { name, color });
    } else {
      await addStore({
        id: crypto.randomUUID(),
        name,
        color,
        business_hours: JSON.stringify({ 0: { open: "10:00", close: "22:00" }, 1: { open: "10:00", close: "22:00" }, 2: { open: "10:00", close: "22:00" }, 3: { open: "10:00", close: "22:00" }, 4: { open: "10:00", close: "22:00" }, 5: { open: "10:00", close: "22:00" }, 6: { open: "10:00", close: "22:00" } }),
        sort_order: 0,
      });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>{store ? "店舗編集" : "店舗追加"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>店舗名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="店舗名を入力" autoFocus />
          </div>
          <div>
            <Label>カラー</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
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
