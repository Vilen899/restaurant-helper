import { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LockScreenProps {
  onUnlock: () => void;
  userName: string;
  userId: string; // ID текущего кассира
  locationId: string;
}

export function LockScreen({ onUnlock, userName, userId, locationId }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      setError('Введите 4-значный PIN');
      return;
    }

    setVerifying(true);
    setError('');
    
    try {
      const { data, error: apiError } = await supabase.functions.invoke('verify-pin', {
        body: { pin, location_id: locationId },
      });

      if (apiError || data?.error) {
        setError('Неверный PIN');
        setPin('');
      } else if (data?.success && data?.user) {
        // Проверяем, что это тот же пользователь
        if (data.user.id === userId) {
          onUnlock();
        } else {
          setError(`Только ${userName} может разблокировать`);
          setPin('');
        }
      } else {
        setError('Неверный PIN');
        setPin('');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Ошибка проверки PIN');
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setError('');
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => handleUnlock(), 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{userName}</h1>
        <p className="text-muted-foreground">Введите свой PIN для разблокировки</p>
        <p className="text-xs text-muted-foreground mt-1">
          Только вы можете разблокировать экран
        </p>
      </div>

      {/* PIN Display */}
      <div className="flex gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              pin.length > i ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-destructive mb-4 bg-destructive/10 px-4 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

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
