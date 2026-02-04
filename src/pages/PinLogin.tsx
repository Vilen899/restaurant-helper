import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin, ShieldAlert, AlertCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/* ================== ГРОМКИЙ ЗВУКОВОЙ ДВИЖОК ================== */
const playModernSound = (type: "click" | "success" | "error" | "warning" | "delete") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
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

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (error) return;
      if (data) {
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
      showError("Выберите точку");
      return;
    }
    setLoading(true);
    try {
      const { data, error: funcError } = await supabase.functions.invoke("verify-pin", {
        body: { pin, location_id: selectedLocation },
      });
      
      // Check for error in response data first (API returns 200 but with error object)
      if (data?.error) {
        showError(
          data.message || "Доступ запрещен",
          data.error === "SHIFT_OPEN_AT_ANOTHER_LOCATION" ? "warning" : "error",
        );
        return;
      }
      
      // Check for function invocation error
      if (funcError) {
        const details = await funcError.context?.json().catch(() => ({}));
        showError(
          details.message || "Доступ запрещен",
          details.error === "SHIFT_OPEN_AT_ANOTHER_LOCATION" ? "warning" : "error",
        );
        return;
      }
      
      // Success - navigate to cashier
      if (data?.success && data?.user) {
        playModernSound("success");
        sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
        navigate("/cashier");
      } else {
        showError("Неверный PIN или ошибка авторизации");
      }
    } catch (e) {
      console.error("PIN verification error:", e);
      showError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020205]">
      {/* Мягкие блики на фоне */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.05),transparent)] pointer-events-none" />

      <div
        className={`relative z-10 w-full max-w-[340px] transition-all duration-500 ${isShaking ? "animate-shake" : ""}`}
      >
        {/* Компактный заголовок */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
            <div className="relative w-16 h-16 bg-white/[0.03] backdrop-blur-3xl rounded-[1.8rem] border border-white/10 flex items-center justify-center shadow-xl">
              <LockKeyhole className="text-indigo-400 h-7 w-7" />
            </div>
          </div>
          <h1 className="text-white font-black text-xl tracking-tighter uppercase italic">
            CRUSTY <span className="text-indigo-400 font-light not-italic">POS</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
            <span className="text-indigo-200/50 text-[8px] uppercase tracking-[0.3em] font-black">Terminal Access</span>
          </div>
        </div>

        {/* Плашка ошибки */}
        <div
          className={`transition-all duration-500 ${errorMsg ? "mb-4 opacity-100" : "opacity-0 h-0 overflow-hidden"}`}
        >
          <div
            className={`backdrop-blur-3xl px-4 py-3 rounded-[1.5rem] flex items-center gap-3 border ${errorType === "error" ? "bg-red-500/10 border-red-500/20 text-red-100" : "bg-orange-500/10 border-orange-500/20 text-orange-100"}`}
          >
            <AlertCircle className="h-5 w-5 shrink-0 opacity-70" />
            <span className="text-xs font-medium leading-tight">{errorMsg}</span>
          </div>
        </div>

        {/* Основная карточка (Уменьшена) */}
        <div className="backdrop-blur-[100px] bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl">
          {/* Селект локации */}
          <div className="mb-6">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-white/5 border-none text-white h-12 rounded-[1.2rem] px-4 hover:bg-white/10 transition-all text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  <SelectValue placeholder="Точка" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-[1.5rem]">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="rounded-xl focus:bg-indigo-600/30">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Индикаторы ПИН (Уменьшены) */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-[1.2rem] border flex items-center justify-center transition-all duration-500 ${pin.length > i ? "border-indigo-400 bg-indigo-400/10 scale-110" : "border-white/5 bg-white/5"}`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${pin.length > i ? "bg-indigo-400 shadow-[0_0_10px_#818cf8]" : "bg-white/10 scale-50"}`}
                />
              </div>
            ))}
          </div>

          {/* Клавиатура (Компактная) */}
          <div className="grid grid-cols-3 gap-3">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-14 text-2xl font-light rounded-[1.2rem] transition-all active:scale-90 ${num === "" ? "invisible" : "bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/5"} ${num === "del" ? "hover:text-red-400" : "hover:text-indigo-400"}`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete className="h-5 w-5 opacity-40" /> : num}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="mt-6 flex justify-center gap-2 animate-pulse">
              {[0, 1, 2].map((d) => (
                <div key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-white/5 text-[8px] mt-8 tracking-[0.5em] uppercase font-black">
          Authorized Access
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
        .animate-shake { animation: shake 0.35s ease-in-out both; }
        button:focus { outline: none !important; }
      `,
        }}
      />
    </div>
  );
}
