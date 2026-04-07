import { useEffect, useState } from "react";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { StoreForm } from "./StoreForm";
import { PositionManager } from "./PositionManager";
import type { Store } from "@/types";

export function StoreListPage() {
  const { stores, fetchStores, removeStore } = useStoreStore();
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">店舗管理</h2>
        <Button onClick={() => { setEditingStore(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />店舗追加
        </Button>
      </div>

      <div className="grid gap-4">
        {stores.map((store) => (
          <div key={store.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: store.color }} />
                <span className="font-medium">{store.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedStoreId(selectedStoreId === store.id ? null : store.id);
                  }}
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setEditingStore(store); setShowForm(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeStore(store.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedStoreId === store.id && (
              <div className="mt-4 pt-4 border-t">
                <PositionManager storeId={store.id} />
              </div>
            )}
          </div>
        ))}
        {stores.length === 0 && (
          <p className="text-muted-foreground text-center py-8">店舗を追加してください</p>
        )}
      </div>

      {showForm && (
        <StoreForm
          store={editingStore}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
