import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin, ShieldAlert, AlertCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== УЛУЧШЕННЫЙ ЗВУКОВОЙ ДВИЖОК ================== */
const playModernSound = (type: "click" | "success" | "error" | "warning" | "delete") => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.1, ctx.currentTime);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);

  switch (type) {
    case "click":
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      break;
    case "delete":
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      break;
    case "success":
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(masterGain);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
        o.start(ctx.currentTime + i * 0.1);
        o.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
      break;
    case "error":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      break;
    case "warning":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.alternateMixture = 300;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      break;
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
      showError("Выберите точку продажи", "error");
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
      toast.success(`С возвращением, ${data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch (e) {
      showError("Ошибка сети", "error");
    } finally {
      setLoading(false);
    }
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020205]">
      {/* ФОНОВЫЕ ЭФФЕКТЫ (Mesh Gradient) */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/30 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 blur-[130px] rounded-full" />
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-emerald-900/10 blur-[100px] rounded-full" />

      {/* Overlay логотипа */}
      <div className="absolute inset-0 opacity-20 grayscale mix-blend-soft-light pointer-events-none">
        <img src={logo} alt="" className="w-full h-full object-cover" />
      </div>

      <div className={`relative z-10 w-full max-w-sm transition-all duration-500 ${isShaking ? "animate-shake" : ""}`}>
        {/* ШАПКА ТЕРМИНАЛА */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/40 transition-all" />
            <div className="relative w-20 h-20 bg-white/[0.03] backdrop-blur-2xl rounded-[2rem] border border-white/10 flex items-center justify-center shadow-2xl">
              <LockKeyhole className="text-cyan-400 h-10 w-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            </div>
          </div>
          <h1 className="text-white font-extrabold text-2xl tracking-tight flex items-center gap-2">
            CRUSTY <span className="text-cyan-400 font-light italic">POS</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Terminal v2.0</span>
          </div>
        </div>

        {/* ПЛАВАЮЩИЙ БЛОК ОШИБКИ */}
        <div
          className={`transition-all duration-500 ease-in-out ${errorMsg ? "translate-y-0 opacity-100 mb-6" : "translate-y-4 opacity-0 h-0 overflow-hidden"}`}
        >
          <div
            className={`
            backdrop-blur-3xl px-6 py-4 rounded-[2.5rem] flex items-center gap-4 border shadow-[0_20px_40px_rgba(0,0,0,0.4)]
            ${
              errorType === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-100"
                : "bg-amber-500/10 border-amber-500/30 text-amber-100"
            }
          `}
          >
            <div
              className={`p-3 rounded-2xl ${errorType === "error" ? "bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]"}`}
            >
              {errorType === "error" ? (
                <ShieldAlert className="h-6 w-6 text-red-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest opacity-40 font-black">Внимание кассира</span>
              <span className="text-sm font-bold tracking-wide leading-tight">{errorMsg}</span>
            </div>
          </div>
        </div>

        {/* ГЛАВНЫЙ МОДУЛЬ ВВОДА */}
        <div className="backdrop-blur-[60px] bg-white/[0.03] border border-white/[0.08] rounded-[3.5rem] p-8 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)]">
          {/* СЕЛЕКТ ЛОКАЦИИ */}
          <div className="mb-8">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-none text-white/90 h-16 rounded-[1.5rem] focus:ring-2 focus:ring-cyan-500/30 shadow-inner flex items-center px-6 transition-all hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-500/20 p-2 rounded-lg">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                  </div>
                  <SelectValue placeholder="Выберите точку" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950/95 backdrop-blur-3xl border-white/10 text-white rounded-[2rem] p-2">
                {locations.map((loc) => (
                  <SelectItem
                    key={loc.id}
                    value={loc.id}
                    className="rounded-xl py-4 focus:bg-cyan-500/20 focus:text-cyan-100 transition-all"
                  >
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ИНДИКАТОРЫ (ТОЧКИ) ВВОДА */}
          <div className="flex justify-center gap-5 mb-12">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 transform ${
                  pin.length > i
                    ? "border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)] scale-110"
                    : errorMsg
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-white/5 bg-white/5"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-500 ${
                    pin.length > i ? "bg-cyan-400 shadow-[0_0_15px_#22d3ee] scale-100" : "bg-white/5 scale-50"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* ЦИФРОВАЯ ПАНЕЛЬ */}
          <div className="grid grid-cols-3 gap-5">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-16 text-3xl font-light rounded-[1.8rem] transition-all duration-100 active:scale-90 active:bg-cyan-500/20 border border-transparent ${
                  num === ""
                    ? "invisible"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-white hover:border-white/10 shadow-sm"
                } ${num === "del" ? "hover:text-red-400" : "hover:text-cyan-300"}`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete className="h-7 w-7 opacity-40" /> : num}
              </Button>
            ))}
          </div>

          {/* СТАТУС ЗАГРУЗКИ */}
          <div
            className={`mt-8 flex flex-col items-center gap-2 transition-all duration-300 ${loading ? "opacity-100" : "opacity-0"}`}
          >
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] text-cyan-400/40 uppercase tracking-[0.3em] font-black">
              Протокол доступа...
            </span>
          </div>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-white/10 text-[9px] tracking-[0.5em] uppercase font-bold">
            Crusty Sandwiches · Yerevan 2026
          </p>
        </footer>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        
        /* Кастомный курсор или фокус */
        ::selection { background: rgba(34, 211, 238, 0.2); }
      `,
        }}
      />
    </div>
  );
}
