import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin, ShieldAlert, AlertCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== ЗВУКОВОЙ ДВИЖОК ================== */
const playModernSound = (type: "click" | "success" | "error" | "warning" | "delete") => {
  try {
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
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        break;
      case "delete":
        osc.frequency.setValueAtTime(250, ctx.currentTime);
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
          g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.4);
          o.start(ctx.currentTime + i * 0.08);
          o.stop(ctx.currentTime + i * 0.08 + 0.4);
        });
        break;
      case "error":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        break;
      case "warning":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        break;
    }
  } catch (e) {
    console.warn("Audio bypass", e);
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

  /* ===== ПОЛУЧЕНИЕ ЛОКАЦИЙ С ЖЕСТКОЙ ФИЛЬТРАЦИЕЙ ===== */
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true);

      if (error) {
        toast.error("Ошибка загрузки точек");
        return;
      }

      if (data) {
        // Фильтруем "Центральный", убирая пробелы и игнорируя регистр
        const filtered = data.filter((loc) => loc.name.toLowerCase().trim() !== "центральный");
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
        const isShiftError = details.error === "SHIFT_OPEN_AT_ANOTHER_LOCATION";
        showError(details.message || "Доступ отклонен", isShiftError ? "warning" : "error");
        return;
      }

      playModernSound("success");
      toast.success(`Добро пожаловать, ${data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch (e) {
      showError("Ошибка соединения", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020205]">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute inset-0 opacity-[0.05] grayscale pointer-events-none">
        <img src={logo} alt="" className="w-full h-full object-cover" />
      </div>

      <div className={`relative z-10 w-full max-w-sm transition-all duration-500 ${isShaking ? "animate-shake" : ""}`}>
        {/* LOGO SECTION */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
            <div className="relative w-20 h-20 bg-white/[0.03] backdrop-blur-3xl rounded-[2.2rem] border border-white/10 flex items-center justify-center shadow-2xl">
              <LockKeyhole className="text-indigo-400 h-9 w-9 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
            </div>
          </div>
          <h1 className="text-white font-black text-2xl tracking-tighter uppercase">
            CRUSTY <span className="text-indigo-400 font-light italic">TERMINAL</span>
          </h1>
          <div className="flex items-center gap-2 mt-2 bg-white/5 px-4 py-1 rounded-full border border-white/5">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">Secure Access v2.1</span>
          </div>
        </div>

        {/* ERROR BOX */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${errorMsg ? "max-h-28 mb-6 opacity-100 scale-100" : "max-h-0 opacity-0 scale-95"}`}
        >
          <div
            className={`
            backdrop-blur-3xl px-6 py-4 rounded-[2.2rem] flex items-center gap-4 border shadow-2xl
            ${errorType === "error" ? "bg-red-500/10 border-red-500/30 text-red-50" : "bg-orange-500/10 border-orange-500/30 text-orange-50"}
          `}
          >
            <div className={`p-3 rounded-2xl ${errorType === "error" ? "bg-red-500/20" : "bg-orange-500/20"}`}>
              {errorType === "error" ? (
                <ShieldAlert className="h-5 w-5 text-red-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-400" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase tracking-widest opacity-40 font-black">Внимание кассира</span>
              <span className="text-sm font-bold leading-tight">{errorMsg}</span>
            </div>
          </div>
        </div>

        {/* INPUT CARD */}
        <div className="backdrop-blur-[80px] bg-white/[0.02] border border-white/10 rounded-[3.5rem] p-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] text-center">
          <div className="mb-8">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-none text-white/90 h-16 rounded-2xl shadow-inner px-6 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  <SelectValue placeholder="Выберите точку" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f]/95 backdrop-blur-3xl border-white/10 text-white rounded-3xl p-2">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="rounded-xl py-3 focus:bg-indigo-500/20">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DOTS */}
          <div className="flex justify-center gap-5 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${
                  pin.length > i
                    ? "border-indigo-500 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-110"
                    : "border-white/5 bg-white/5"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${pin.length > i ? "bg-indigo-400 shadow-[0_0_10px_#818cf8]" : "bg-white/5 scale-50"}`}
                />
              </div>
            ))}
          </div>

          {/* KEYS */}
          <div className="grid grid-cols-3 gap-5">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-16 text-3xl font-light rounded-[1.8rem] transition-all duration-75 active:scale-90 ${
                  num === ""
                    ? "invisible pointer-events-none"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/[0.05]"
                } ${num === "del" ? "hover:text-red-400" : "hover:text-indigo-300"}`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete className="h-7 w-7 opacity-40" /> : num}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="mt-8 flex justify-center gap-2">
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-white/10 text-[9px] mt-10 tracking-[0.4em] uppercase font-black italic">
          Crusty Sandwiches Terminal System
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
        button:focus { outline: none !important; }
      `,
        }}
      />
    </div>
  );
}
