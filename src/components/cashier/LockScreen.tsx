import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LockScreenProps {
  onUnlock: () => void;
  userName: string;
  userId: string;
}

export function LockScreen({ onUnlock, userName, userId }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      toast.error('Введите 4-значный PIN');
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-pin', {
        body: { pin, user_id: userId },
      });

      if (error || !data?.valid) {
        toast.error('Неверный PIN');
        setPin('');
      } else {
        onUnlock();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка проверки PIN');
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => handleUnlock(), 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{userName}</h1>
        <p className="text-muted-foreground">Введите PIN для разблокировки</p>
      </div>

      {/* PIN Display */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              pin.length > i ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((key) => (
          <Button
            key={key || 'empty'}
            variant={key === '←' ? 'outline' : 'secondary'}
            className="h-16 w-16 text-2xl"
            onClick={() => {
              if (key === '←') handleBackspace();
              else if (key) handleKeyPress(key);
            }}
            disabled={!key || verifying}
          >
            {key}
          </Button>
        ))}
      </div>

      {verifying && (
        <p className="text-muted-foreground mt-4">Проверка...</p>
      )}
    </div>
  );
}
