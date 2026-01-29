import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== ЗВУКИ ================== */
const playSound = (freq: number, type: OscillatorType = "sine", duration = 0.1) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data?.length) {
        setLocations(data);
        setSelectedLocation(data[0].id);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (pin.length === 4) handlePinSubmit();
  }, [pin]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4 && !loading) {
      if (errorMsg) setErrorMsg(null);
      playSound(800);
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (!loading) {
      playSound(400);
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      showError("Выберите точку продажи");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke("verify-pin", {
        body: { pin, location_id: selectedLocation },
      });

      if (funcError) {
        // Попытка получить детальное сообщение из тела ошибки
        const details = await funcError.context?.json().catch(() => ({}));
        showError(details.message || "Ошибка доступа");
        return;
      }

      playSound(600, "sine", 0.3); // Успех
      toast.success(`Привет, ${data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch (e) {
      showError("Ошибка подключения");
    } finally {
      setLoading(false);
    }
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setPin("");
    playSound(200, "square", 0.3); // Ошибка
    setTimeout(() => setIsShaking(false), 500);
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[#0a0a0a]">
      <img src={logo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />

      <div
        className={`relative z-10 w-full max-w-sm transition-transform duration-500 ${isShaking ? "animate-shake" : ""}`}
      >
        {/* КРАСИВЫЙ БЛОК ОШИБКИ */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${errorMsg ? "max-h-20 mb-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-xl text-red-100 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        </div>

        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          {/* ВЫБОР ТОЧКИ */}
          <div className="mb-8">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-3 block ml-1">
              Локация
            </label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-0">
                <SelectValue placeholder="Точка продажи" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ИНДИКАТОРЫ ПИНА */}
          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                  pin.length > i
                    ? "border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    : errorMsg
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-white/10 bg-white/5"
                }`}
              >
                {pin[i] && <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />}
              </div>
            ))}
          </div>

          {/* КНОПКИ */}
          <div className="grid grid-cols-3 gap-4">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-16 text-2xl font-light rounded-2xl hover:bg-white/10 active:scale-90 transition-all ${
                  num === "" ? "invisible" : "bg-white/5 text-white"
                }`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete /> : num}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="mt-6 text-center text-xs text-white/40 animate-pulse tracking-widest uppercase">
              Авторизация...
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `,
        }}
      />
    </div>
  );
}
