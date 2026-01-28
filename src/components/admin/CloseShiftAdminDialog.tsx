import { useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { XCircle, Clock, MapPin, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CloseShiftAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: {
    id: string;
    userName: string;
    locationName: string;
    startedAt: string;
  } | null;
  onConfirm: (shiftId: string, notes: string) => Promise<void>;
}

export function CloseShiftAdminDialog({
  open,
  onOpenChange,
  shift,
  onConfirm,
}: CloseShiftAdminDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!shift) return null;

  const duration = differenceInMinutes(new Date(), new Date(shift.startedAt));
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(shift.id, notes || 'Закрыто администратором');
      setNotes('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Закрыть смену
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>Вы собираетесь принудительно закрыть смену:</p>
              
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{shift.userName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.locationName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Начало: {format(new Date(shift.startedAt), 'dd MMM yyyy, HH:mm', { locale: ru })}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Длительность: {hours}ч {minutes}мин
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="notes">Примечание (опционально)</Label>
          <Textarea
            id="notes"
            placeholder="Причина закрытия смены..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Закрытие...' : 'Закрыть смену'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
