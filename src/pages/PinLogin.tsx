import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin, AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== ЗВУКИ ================== */
const playSound = (freq: number, type: OscillatorType = "sine", duration = 0.15) => {
  try {
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
  } catch (e) {
    console.error("Audio error", e);
  }
};

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"warning" | "error">("error");
  const [isShaking, setIsShaking] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

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
      playSound(850, "sine", 0.05);
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (!loading && pin.length > 0) {
      playSound(400, "sine", 0.1);
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const showError = (msg: string, type: "warning" | "error" = "error") => {
    setErrorMsg(msg);
    setErrorType(type);
    setIsShaking(true);
    setPin("");

    if (type === "warning") {
      playSound(300, "sawtooth", 0.4);
    } else {
      playSound(150, "square", 0.3);
    }

    setTimeout(() => setIsShaking(false), 500);
  };

  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      showError("Сначала выберите точку продажи", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error: funcError } = await supabase.functions.invoke("verify-pin", {
        body: { pin, location_id: selectedLocation },
      });

      if (funcError) {
        const details = await funcError.context?.json().catch(() => ({}));
        const isShiftError = details.error === "SHIFT_OPEN_AT_ANOTHER_LOCATION";
        showError(details.message || "Ошибка доступа", isShiftError ? "warning" : "error");
        return;
      }

      // УСПЕХ
      playSound(700, "sine", 0.4);
      toast.success(`Добро пожаловать, ${data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch (e) {
      showError("Проблема с сетью", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-black overflow-hidden font-sans">
      {/* Background Image */}
      <img src={logo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      <div className={`relative z-10 w-full max-w-sm transition-all duration-500 ${isShaking ? "animate-shake" : ""}`}>
        {/* КРАСИВЫЙ БЛОК ОШИБКИ */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${errorMsg ? "max-h-28 mb-6 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div
            className={`
            backdrop-blur-2xl px-5 py-4 rounded-[2rem] flex items-center gap-4 border shadow-2xl
            ${
              errorType === "error"
                ? "bg-red-500/10 border-red-500/40 text-red-50 shadow-red-500/10"
                : "bg-orange-500/10 border-orange-500/40 text-orange-50 shadow-orange-500/10"
            }
          `}
          >
            <div className={`p-2.5 rounded-2xl ${errorType === "error" ? "bg-red-500/20" : "bg-orange-500/20"}`}>
              {errorType === "error" ? (
                <ShieldAlert className="h-5 w-5 text-red-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.1em] opacity-40 font-bold">Уведомление</span>
              <span className="text-sm font-medium leading-tight">{errorMsg}</span>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* SELECT LOCATION */}
          <div className="mb-10">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3 block ml-1 text-center">
              Выберите точку
            </label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-14 rounded-2xl focus:ring-0 text-center flex justify-center shadow-inner">
                <SelectValue placeholder="Точка продажи" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-2xl">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="focus:bg-white/10">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN DOTS */}
          <div className="flex justify-center gap-4 mb-12">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-[1.25rem] border-2 flex items-center justify-center transition-all duration-300 ${
                  pin.length > i
                    ? "border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                    : errorMsg
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-white/5 bg-white/5"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    pin.length > i ? "bg-green-400 scale-100" : "bg-white/10 scale-50"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* KEYPAD */}
          <div className="grid grid-cols-3 gap-4">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-16 text-2xl font-light rounded-2xl transition-all duration-100 active:scale-90 ${
                  num === ""
                    ? "invisible"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/[0.02]"
                } ${num === "del" ? "text-white/40" : ""}`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete className="h-6 w-6" /> : num}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Проверка доступа</span>
            </div>
          )}
        </div>

        <p className="text-center text-white/10 text-[10px] mt-8 tracking-[0.3em] uppercase">
          Crusty Sandwiches Terminal
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `,
        }}
      />
    </div>
  );
}
