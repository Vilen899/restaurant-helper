import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin, ShieldAlert, AlertCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== ГРОМКИЙ И СОЧНЫЙ ЗВУКОВОЙ ДВИЖОК ================== */
const playModernSound = (type: "click" | "success" | "error" | "warning" | "delete") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    // Громкость на 0.6 — это очень отчетливо
    masterGain.gain.setValueAtTime(0.6, ctx.currentTime);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    switch (type) {
      case "click":
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        break;
      case "delete":
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        break;
      case "success":
        [523, 659, 783, 1046].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(masterGain);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.5);
          o.start(ctx.currentTime + i * 0.08);
          o.stop(ctx.currentTime + i * 0.08 + 0.5);
        });
        break;
      case "error":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        break;
      case "warning":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        break;
    }
  } catch (e) {
    console.warn("Audio Context Error");
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

  /* ===== ФИЛЬТР ЦЕНТРАЛЬНОГО СКЛАДА ===== */
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (error) {
        toast.error("Ошибка загрузки данных");
        return;
      }
      if (data) {
        // Убираем всё, что похоже на "Центральный"
        const filtered = data.filter((loc) => {
          const n = loc.name.toLowerCase();
          return !n.includes("центр") && !n.includes("centr");
        });
        setLocations(filtered);
        if (filtered.length > 0) setSelectedLocation(filtered[0].id);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (pin.length === 4) handlePinSubmit();
  }, [pin]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4 && !loading) {
      setErrorMsg(null);
      playModernSound("click");
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (!loading && pin.length > 0) {
      playModernSound("delete");
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const showError = (msg: string, type: "warning" | "error" = "error") => {
    setErrorMsg(msg);
    setErrorType(type);
    setIsShaking(true);
    setPin("");
    playModernSound(type);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      showError("Выберите точку продажи");
      return;
    }
    setLoading(true);
    try {
      const { data, error: funcError } = await supabase.functions.invoke("verify-pin", {
        body: { pin, location_id: selectedLocation },
      });
      if (funcError) {
        const details = await funcError.context?.json().catch(() => ({}));
        showError(
          details.message || "Доступ запрещен",
          details.error === "SHIFT_OPEN_AT_ANOTHER_LOCATION" ? "warning" : "error",
        );
        return;
      }
      playModernSound("success");
      toast.success(`Приветствуем, ${data.user.full_name}`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch (e) {
      showError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#010103]">
      {/* Мягкое свечение фона */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-900/20 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full" />

      <div className={`relative z-10 w-full max-w-sm transition-all duration-500 ${isShaking ? "animate-shake" : ""}`}>
        {/* Заголовок */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6 group">
            <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 bg-white/[0.03] backdrop-blur-3xl rounded-[2.8rem] border border-white/10 flex items-center justify-center shadow-2xl">
              <LockKeyhole className="text-indigo-400 h-11 w-11 drop-shadow-[0_0_15px_rgba(129,140,248,0.7)]" />
            </div>
          </div>
          <h1 className="text-white font-black text-3xl tracking-tighter uppercase italic">
            CRUSTY <span className="text-indigo-400 font-light not-italic">POS</span>
          </h1>
          <div className="flex items-center gap-2 mt-3 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span className="text-indigo-200/60 text-[10px] uppercase tracking-[0.4em] font-black">
              Authorized Only
            </span>
          </div>
        </div>

        {/* Плашка ошибки */}
        <div
          className={`transition-all duration-500 ${errorMsg ? "mb-6 opacity-100 translate-y-0" : "opacity-0 -translate-y-4 h-0 overflow-hidden"}`}
        >
          <div
            className={`backdrop-blur-3xl px-6 py-5 rounded-[2.5rem] flex items-center gap-4 border shadow-2xl ${errorType === "error" ? "bg-red-500/10 border-red-500/30 text-red-100" : "bg-orange-500/10 border-orange-500/30 text-orange-100"}`}
          >
            <div className={`p-3 rounded-2xl ${errorType === "error" ? "bg-red-500/20" : "bg-orange-500/20"}`}>
              {errorType === "error" ? (
                <ShieldAlert className="h-6 w-6 text-red-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-orange-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest opacity-40 font-black">Ошибка доступа</span>
              <span className="text-sm font-bold">{errorMsg}</span>
            </div>
          </div>
        </div>

        {/* Панель ввода */}
        <div className="backdrop-blur-[120px] bg-white/[0.02] border border-white/10 rounded-[4.5rem] p-10 shadow-[0_60px_100px_-20px_rgba(0,0,0,0.9)]">
          <div className="mb-10">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-none text-white h-16 rounded-[2rem] shadow-inner px-8 hover:bg-white/10 transition-all text-lg font-medium">
                <div className="flex items-center gap-4">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  <SelectValue placeholder="Точка" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#08080c]/98 backdrop-blur-3xl border-white/10 text-white rounded-[2.5rem] p-3 shadow-2xl">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="rounded-2xl py-4 focus:bg-indigo-600/40 text-base">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Индикаторы ПИН */}
          <div className="flex justify-center gap-5 mb-12">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-16 h-16 rounded-[2rem] border-2 flex items-center justify-center transition-all duration-500 ${pin.length > i ? "border-indigo-400 bg-indigo-500/20 shadow-[0_0_40px_rgba(129,140,248,0.4)] scale-110" : "border-white/5 bg-white/5"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? "bg-indigo-300 shadow-[0_0_20px_#818cf8]" : "bg-white/10 scale-50"}`}
                />
              </div>
            ))}
          </div>

          {/* Кнопки */}
          <div className="grid grid-cols-3 gap-6">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-20 text-4xl font-extralight rounded-[2.2rem] transition-all active:scale-90 ${num === "" ? "invisible" : "bg-white/[0.04] hover:bg-white/[0.1] text-white border border-white/5"} ${num === "del" ? "hover:text-red-400" : "hover:text-indigo-400"}`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete className="h-8 w-8 opacity-40" /> : num}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="mt-10 flex justify-center gap-3 animate-pulse">
              {[0, 1, 2].map((d) => (
                <div key={d} className="w-2 h-2 bg-indigo-400 rounded-full" />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-white/5 text-[10px] mt-12 tracking-[0.6em] uppercase font-black">
          Secure Shell Access
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-12px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-12px); }
          80% { transform: translateX(12px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        button:focus { outline: none !important; }
      `,
        }}
      />
    </div>
  );
}
