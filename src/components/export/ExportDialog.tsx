import { useCalendarStore } from "@/stores/useCalendarStore";
import { useShiftStore } from "@/stores/useShiftStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { useStoreStore } from "@/stores/useStoreStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { exportPdf } from "@/services/pdf-export";
import { exportCsv } from "@/services/csv-export";

interface Props {
  onClose: () => void;
}

export function ExportDialog({ onClose }: Props) {
  const { getDateRange, selectedStoreId } = useCalendarStore();
  const { shifts } = useShiftStore();
  const { staffList } = useStaffStore();
  const { stores } = useStoreStore();

  const storeName = stores.find((s) => s.id === selectedStoreId)?.name || "全店舗";
  const range = getDateRange();

  const handlePdf = async () => {
    await exportPdf(shifts, staffList, range, storeName);
    onClose();
  };

  const handleCsv = async () => {
    await exportCsv(shifts, storeName);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>出力</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={handlePdf}>
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">PDF出力</div>
              <div className="text-xs text-muted-foreground">A3横レイアウト・印刷用</div>
            </div>
          </Button>
          <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={handleCsv}>
            <FileSpreadsheet className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">CSV出力</div>
              <div className="text-xs text-muted-foreground">Excel対応・UTF-8 BOM付き</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
