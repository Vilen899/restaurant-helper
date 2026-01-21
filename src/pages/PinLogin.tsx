import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo.webp';

// Sound generator using Web Audio API
const playClickSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const playDeleteSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 400;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
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
      playClickSound();
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    playDeleteSound();
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Full background logo */}
      <img 
        src={logo} 
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'crisp-edges' }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-sm animate-scale-in">

        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
          {/* Location selector */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
              <MapPin className="h-4 w-4" />
              <span>Точка продажи</span>
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <SelectValue placeholder="Выберите точку" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {locations.map(loc => (
                  <SelectItem 
                    key={loc.id} 
                    value={loc.id}
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  pin.length > i 
                    ? 'border-green-500 bg-green-500/20 text-green-400' 
                    : 'border-white/20 bg-white/5'
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
                    variant="ghost"
                    className="h-16 text-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-white transition-all duration-150 active:scale-90 active:bg-red-500/30"
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
                  variant="ghost"
                  className="h-16 text-2xl font-semibold bg-white/5 hover:bg-white/15 border border-white/10 text-white transition-all duration-150 active:scale-90 active:bg-green-500/20 active:border-green-500/50"
                  onClick={() => handleNumberClick(num)}
                  disabled={loading || pin.length >= 4}
                >
                  {num}
                </Button>
              );
            })}
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-white/60">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span>Проверка...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          © 2026 Crusty Sandwiches. Касса v1.0
        </p>
      </div>
    </div>
  );
}
