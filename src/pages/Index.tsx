import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== Звуки ================== */
const playClickSound = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 800;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.1);
};

const playDeleteSound = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 400;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.1);
};

const playSuccessSound = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
  const freqs = [523, 659, 784]; // C5 E5 G5
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.frequency.value = f;
    osc.type = "sine";
    osc.start(audioCtx.currentTime + i * 0.1);
    osc.stop(audioCtx.currentTime + i * 0.1 + 0.15);
  });
};

const playErrorSound = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  const freqs = [400, 350];
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.frequency.value = f;
    osc.type = "square";
    osc.start(audioCtx.currentTime + i * 0.15);
    osc.stop(audioCtx.currentTime + i * 0.15 + 0.15);
  });
};

/* ================== Компонент ================== */
export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Загружаем активные точки
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
        if (data && data.length > 0) {
          setLocations(data);
          setSelectedLocation(data[0].id);
        }
      } catch {
        toast.error("Не удалось загрузить точки");
      }
    };
    fetchLocations();
  }, []);

  /* ===== Ввод PIN ===== */
  const handleNumberClick = (num: string) => {
    if (pin.length < 4 && !loading) {
      playClickSound();
      setPin((p) => p + num);
    }
  };

  const handleDelete = () => {
    if (!loading) {
      playDeleteSound();
      setPin((p) => p.slice(0, -1));
    }
  };

  const handleClear = () => setPin("");

  // Автопроверка при 4 цифрах
  useEffect(() => {
    if (pin.length === 4) handlePinSubmit();
  }, [pin]);

  /* ===== Отправка PIN ===== */
  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      toast.error("Выберите точку");
      return;
    }
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("verify-pin", {
        body: { pin, location_id: selectedLocation },
      });

      if (res.error) {
        playErrorSound();

        let msg = "Неизвестная ошибка сервера";
        try {
          const errBody = JSON.parse(res.error.message);
          if (errBody.error === "SHIFT_OPEN_AT_ANOTHER_LOCATION") {
            msg = `Смена уже открыта в "${errBody.location_name}". Закройте её перед входом`;
          } else if (errBody.error === "INVALID_PIN") {
            msg = "Неверный PIN-код";
          } else if (errBody.message) {
            msg = errBody.message;
          }
        } catch {}

        toast.error(msg);
        setPin("");
        return;
      }

      if (!res.data || !res.data.success) {
        playErrorSound();
        toast.error(res.data?.message || "Ошибка авторизации");
        setPin("");
        return;
      }

      // ✅ Успех
      playSuccessSound();
      toast.success(`Добро пожаловать, ${res.data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(res.data.user));
      navigate("/cashier");
    } catch (e) {
      playErrorSound();
      toast.error((e as Error).message || "Ошибка подключения");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  /* ================== UI ================== */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <img src={logo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
          {/* Точка */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
              <MapPin className="h-4 w-4" />
              <span>Точка продажи</span>
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Выберите точку" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="text-white">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${pin.length > i ? "border-green-500 bg-green-500/20 text-green-400" : "border-white/20 bg-white/5"}`}
              >
                {pin[i] ? "•" : ""}
              </div>
            ))}
          </div>

          {/* Клавиатура */}
          <div className="grid grid-cols-3 gap-3">
            {numbers.map((num, idx) => {
              if (num === "") return <div key={idx} />;
              if (num === "del")
                return (
                  <Button
                    key={idx}
                    variant="ghost"
                    className="h-16 bg-white/5 text-white"
                    onClick={handleDelete}
                    onDoubleClick={handleClear}
                    disabled={loading}
                  >
                    <Delete />
                  </Button>
                );
              return (
                <Button
                  key={idx}
                  variant="ghost"
                  className="h-16 text-2xl bg-white/5 text-white"
                  onClick={() => handleNumberClick(num)}
                  disabled={loading || pin.length >= 4}
                >
                  {num}
                </Button>
              );
            })}
          </div>

          {loading && <div className="mt-4 text-center text-white/60">Проверка…</div>}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">© 2026 Crusty Sandwiches · Касса v1.0</p>
      </div>
    </div>
  );
}
