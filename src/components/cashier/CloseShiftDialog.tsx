import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogOut, DollarSign, Timer } from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  userId: string;
  userName: string;
  shiftStart?: string;
  hourlyRate?: number;
  onConfirm: () => void;
}

export function CloseShiftDialog({ 
  open, 
  onOpenChange, 
  userName, 
  shiftStart,
  hourlyRate = 0,
  onConfirm 
}: CloseShiftDialogProps) {
  const shiftStats = useMemo(() => {
    if (!shiftStart) return { hours: 0, minutes: 0, totalMinutes: 0, earnings: 0 };
    
    const totalMinutes = differenceInMinutes(new Date(), new Date(shiftStart));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const earnings = Math.round((totalMinutes / 60) * hourlyRate);
    
    return { hours, minutes, totalMinutes, earnings };
  }, [shiftStart, hourlyRate]);

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
          </DialogDescription>
        </DialogHeader>

        {shiftStart && (
          <div className="grid grid-cols-2 gap-3 py-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <Timer className="h-6 w-6 text-primary mb-2" />
                <span className="text-2xl font-bold">
                  {shiftStats.hours}ч {shiftStats.minutes}м
                </span>
                <span className="text-sm text-muted-foreground">Отработано</span>
              </CardContent>
            </Card>
            
            {hourlyRate > 0 && (
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <DollarSign className="h-6 w-6 text-green-600 mb-2" />
                  <span className="text-2xl font-bold text-green-600">
                    {shiftStats.earnings.toLocaleString()} ֏
                  </span>
                  <span className="text-sm text-muted-foreground">Заработано</span>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <p className="text-center text-muted-foreground">
          Вы уверены, что хотите закрыть смену?
        </p>

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
