import { useState, useEffect } from 'react';
import { Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { differenceInSeconds } from 'date-fns';

interface ShiftTimerProps {
  shiftStart: string | undefined;
  hourlyRate: number;
}

export function ShiftTimer({ shiftStart, hourlyRate }: ShiftTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!shiftStart) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed time
    const startDate = new Date(shiftStart);
    setElapsed(differenceInSeconds(new Date(), startDate));

    // Update every second
    const interval = setInterval(() => {
      setElapsed(differenceInSeconds(new Date(), startDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [shiftStart]);

  if (!shiftStart) {
    return null;
  }

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Calculate earnings based on hours worked
  const hoursWorked = elapsed / 3600;
  const earnings = Math.round(hoursWorked * hourlyRate);

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="justify-center text-green-600 border-green-600 py-1.5">
        <Clock className="w-3 h-3 mr-1" />
        <span className="font-mono font-bold">{timeString}</span>
      </Badge>
      {hourlyRate > 0 && (
        <Badge variant="outline" className="justify-center text-blue-600 border-blue-600 py-1.5">
          <DollarSign className="w-3 h-3 mr-1" />
          <span className="font-mono">{earnings.toLocaleString()} ֏</span>
        </Badge>
      )}
    </div>
  );
}
