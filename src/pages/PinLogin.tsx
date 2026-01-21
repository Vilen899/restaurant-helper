import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Delete, ArrowLeft, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    // Fetch locations for selection
    const fetchLocations = async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true);
      
      if (data && data.length > 0) {
        setLocations(data);
        setSelectedLocation(data[0].id);
      }
    };

    fetchLocations();
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit();
    }
  }, [pin]);

  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      toast.error('Выберите точку');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-pin', {
        body: { pin, location_id: selectedLocation },
      });

      if (error || data?.error) {
        toast.error('Неверный PIN-код');
        setPin('');
      } else if (data?.success) {
        toast.success(`Добро пожаловать, ${data.user.full_name}!`);
        // Store cashier session in sessionStorage (for this tab only)
        sessionStorage.setItem('cashier_session', JSON.stringify(data.user));
        navigate('/cashier');
      }
    } catch {
      toast.error('Ошибка подключения');
      setPin('');
    }

    setLoading(false);
  };

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm glass">
        <CardHeader className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4"
            onClick={() => navigate('/auth')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Email вход
          </Button>
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <UtensilsCrossed className="text-primary-foreground" size={32} />
          </div>
          <div>
            <CardTitle className="text-2xl">Вход кассира</CardTitle>
            <CardDescription>Введите 4-значный PIN-код</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Точка</span>
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите точку" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  pin.length > i 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border'
                }`}
              >
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {numbers.map((num, index) => {
              if (num === '') return <div key={index} />;
              if (num === 'del') {
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-16 text-xl"
                    onClick={handleDelete}
                    onDoubleClick={handleClear}
                    disabled={loading}
                  >
                    <Delete className="h-6 w-6" />
                  </Button>
                );
              }
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-16 text-xl font-semibold"
                  onClick={() => handleNumberClick(num)}
                  disabled={loading || pin.length >= 4}
                >
                  {num}
                </Button>
              );
            })}
          </div>

          {loading && (
            <p className="text-center text-muted-foreground animate-pulse">
              Проверка...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
