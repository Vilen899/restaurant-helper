import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  userId: string;
  userName: string;
  onConfirm: () => void;
}

export function CloseShiftDialog({ open, onOpenChange, userName, onConfirm }: CloseShiftDialogProps) {
  const handleCloseShift = () => {
    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Закрытие смены
          </DialogTitle>
          <DialogDescription>
            Кассир: <b>{userName}</b>
            <br />
            Вы уверены, что хотите закрыть смену?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleCloseShift} className="gap-2">
            <LogOut className="h-4 w-4" />
            Закрыть смену
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
