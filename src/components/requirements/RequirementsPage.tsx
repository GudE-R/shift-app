import { useEffect, useState } from "react";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { RequirementForm } from "./RequirementForm";
import { getRequirements } from "@/db/queries/store-requirements";
import { deleteRequirement } from "@/db/queries/store-requirements";
import type { StoreRequirement } from "@/types";

export function RequirementsPage() {
  const { stores, positions, fetchStores, fetchPositions } = useStoreStore();
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [requirements, setRequirements] = useState<StoreRequirement[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchPositions();
  }, []);

  useEffect(() => {
    if (selectedStoreId) loadRequirements();
  }, [selectedStoreId]);

  const loadRequirements = async () => {
    const reqs = await getRequirements(selectedStoreId || undefined);
    setRequirements(reqs);
  };

  const handleDelete = async (id: string) => {
    await deleteRequirement(id);
    loadRequirements();
  };

  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name || "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">必要人員設定</h2>
        <Button onClick={() => setShowForm(true)} disabled={!selectedStoreId}>
          <Plus className="h-4 w-4 mr-2" />追加
        </Button>
      </div>

      <Select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
        <option value="">店舗を選択</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>

      {selectedStoreId && (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium">日付</th>
                <th className="text-left p-3 text-sm font-medium">ポジション</th>
                <th className="text-left p-3 text-sm font-medium">時間帯</th>
                <th className="text-left p-3 text-sm font-medium">人数</th>
                <th className="text-right p-3 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => (
                <tr key={req.id} className="border-b last:border-0">
                  <td className="p-3 text-sm">{req.work_date}</td>
                  <td className="p-3 text-sm">{getPositionName(req.position_id)}</td>
                  <td className="p-3 text-sm">{req.start_time} - {req.end_time}</td>
                  <td className="p-3 text-sm">{req.count}人</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(req.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requirements.length === 0 && (
            <p className="text-muted-foreground text-center py-8">必要人員を設定してください</p>
          )}
        </div>
      )}

      {showForm && selectedStoreId && (
        <RequirementForm
          storeId={selectedStoreId}
          onClose={() => { setShowForm(false); loadRequirements(); }}
        />
      )}
    </div>
  );
}
