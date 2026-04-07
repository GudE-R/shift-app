import { useState } from "react";
import { useStaffStore } from "@/stores/useStaffStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

export function NgDateEditor({ staffId }: { staffId: string }) {
  const { staffList, addNgDate, removeNgDate } = useStaffStore();
  const staff = staffList.find((s) => s.id === staffId);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");

  const handleAdd = async () => {
    if (!date) return;
    await addNgDate(staffId, date, reason || undefined);
    setReason("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="理由（任意）" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-1">
        {staff?.ngDates.map((ng) => (
          <div key={ng.id} className="flex items-center justify-between py-1 px-2 bg-red-50 rounded">
            <div>
              <span className="text-sm font-medium">{ng.ng_date}</span>
              {ng.reason && <span className="text-xs text-muted-foreground ml-2">{ng.reason}</span>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeNgDate(ng.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {(!staff?.ngDates || staff.ngDates.length === 0) && (
          <p className="text-sm text-muted-foreground">NG日はありません</p>
        )}
      </div>
    </div>
  );
}
