import { useEffect, useState } from "react";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export function PositionManager({ storeId }: { storeId: string }) {
  const { positions, fetchPositions, addPosition, removePosition } = useStoreStore();
  const [newName, setNewName] = useState("");
  const storePositions = positions.filter((p) => p.store_id === storeId);

  useEffect(() => {
    fetchPositions(storeId);
  }, [storeId]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addPosition({ id: crypto.randomUUID(), store_id: storeId, name: newName.trim() });
    setNewName("");
    fetchPositions(storeId);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">ポジション</h4>
      <div className="space-y-1">
        {storePositions.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1">
            <span className="text-sm">{p.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { removePosition(p.id); fetchPositions(storeId); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新しいポジション"
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
