import { useEffect, useState } from "react";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StaffForm } from "./StaffForm";
import type { StaffWithRelations } from "@/types";

export function StaffListPage() {
  const { staffList, fetchStaff, removeStaff } = useStaffStore();
  const { stores, fetchStores } = useStoreStore();
  const [editingStaff, setEditingStaff] = useState<StaffWithRelations | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchStores();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">スタッフ管理</h2>
        <Button onClick={() => { setEditingStaff(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />スタッフ追加
        </Button>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-sm font-medium">名前</th>
              <th className="text-left p-3 text-sm font-medium">店舗</th>
              <th className="text-left p-3 text-sm font-medium">目標時間</th>
              <th className="text-left p-3 text-sm font-medium">曜日</th>
              <th className="text-right p-3 text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{staff.display_name}</td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {staff.stores.map((ss) => {
                      const store = stores.find((s) => s.id === ss.store_id);
                      return store ? (
                        <Badge key={ss.store_id} variant="secondary" className="text-xs">
                          <span className="h-2 w-2 rounded-full mr-1 inline-block" style={{ backgroundColor: store.color }} />
                          {store.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </td>
                <td className="p-3 text-sm">
                  {staff.target_hours ? `${staff.target_hours}h` : "-"}
                </td>
                <td className="p-3">
                  <div className="flex gap-0.5">
                    {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => {
                      const avail = staff.availability.find((a) => a.day_of_week === i);
                      const status = avail?.status || "○";
                      return (
                        <span
                          key={i}
                          className={`text-xs w-6 h-6 flex items-center justify-center rounded ${
                            status === "○" ? "bg-green-100 text-green-700" :
                            status === "△" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingStaff(staff); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeStaff(staff.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staffList.length === 0 && (
          <p className="text-muted-foreground text-center py-8">スタッフを追加してください</p>
        )}
      </div>

      {showForm && (
        <StaffForm
          staff={editingStaff}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
