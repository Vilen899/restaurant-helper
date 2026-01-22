import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  quickAmounts?: number[];
}

export function NumericKeypad({ value, onChange, onConfirm, quickAmounts = [1000, 2000, 5000, 10000] }: NumericKeypadProps) {
  const handlePress = (digit: string) => {
    if (digit === 'C') {
      onChange('');
    } else if (digit === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (digit === '.') {
      if (!value.includes('.')) {
        onChange(value + digit);
      }
    } else {
      onChange(value + digit);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'backspace'];

  return (
    <div className="space-y-3">
      {/* Quick amount buttons */}
      {quickAmounts.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              className="h-11 font-semibold"
              onClick={() => onChange(amount.toString())}
            >
              {amount.toLocaleString()}
            </Button>
          ))}
        </div>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            variant={key === 'C' ? 'destructive' : 'outline'}
            className="h-14 text-xl font-bold"
            onClick={() => handlePress(key)}
          >
            {key === 'backspace' ? <Delete className="h-5 w-5" /> : key}
          </Button>
        ))}
      </div>
    </div>
  );
}
