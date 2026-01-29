import { useState, useEffect } from "react";
// ... остальные импорты те же

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // Для текста сверху
  const [isShaking, setIsShaking] = useState(false); // Для анимации тряски
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Сброс ошибки при начале ввода
  const handleNumberClick = (num: string) => {
    if (pin.length < 4 && !loading) {
      if (errorMsg) setErrorMsg(null);
      playClickSound();
      setPin((prev) => prev + num);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      setErrorMsg("Выберите точку продажи");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke("verify-pin", {
        body: { pin, location_id: selectedLocation },
      });

      // Если Edge Function вернула ошибку (401, 403, 500)
      if (funcError) {
        const errorData = await funcError.context?.json(); // Пытаемся достать JSON ошибки
        const errorCode = errorData?.error || funcError.message;

        setPin("");
        triggerErrorEffects();

        if (errorCode.includes("SHIFT_OPEN_AT_ANOTHER_LOCATION") || errorCode.includes("403")) {
          playWarningSound();
          setErrorMsg(errorData?.message || "Смена открыта в другом месте");
        } else if (errorCode.includes("INVALID_PIN") || errorCode.includes("401")) {
          playErrorSound();
          setErrorMsg("Неверный PIN-код. Попробуйте снова");
        } else {
          playErrorSound();
          setErrorMsg("Ошибка доступа");
        }
        return;
      }

      // УСПЕХ
      playSuccessSound();
      toast.success(`Добро пожаловать, ${data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch (e) {
      triggerErrorEffects();
      setErrorMsg("Ошибка соединения");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Эффект тряски
  const triggerErrorEffects = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <img src={logo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/40" />

      <div className={`relative z-10 w-full max-w-sm transition-all duration-300 ${isShaking ? "animate-bounce" : ""}`}>
        {/* БЛОК ОШИБКИ СВЕРХУ */}
        <div className={`overflow-hidden transition-all duration-300 ${errorMsg ? "max-h-20 mb-4" : "max-h-0"}`}>
          <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-xl text-red-200 px-4 py-3 rounded-2xl text-center text-sm font-medium shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            {errorMsg}
          </div>
        </div>

        <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-[2rem] p-8 shadow-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-widest mb-3 ml-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>Локация</span>
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:ring-green-500/50">
                <SelectValue placeholder="Выберите точку" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ПИН-ТОЧКИ С ПОДСВЕТКОЙ ОШИБКИ */}
          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl transition-all duration-200 ${
                  pin.length > i
                    ? "border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                    : errorMsg
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-white/10 bg-white/5"
                }`}
              >
                {pin[i] ? <div className="w-3 h-3 bg-current rounded-full animate-in zoom-in" /> : ""}
              </div>
            ))}
          </div>

          {/* КЛАВИАТУРА */}
          <div className="grid grid-cols-3 gap-4">
            {numbers.map((num, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-16 text-2xl font-light rounded-2xl transition-all active:scale-95 ${
                  num === "del"
                    ? "bg-white/5 hover:bg-red-500/20 text-white/70"
                    : "bg-white/5 hover:bg-white/10 text-white"
                } ${num === "" ? "opacity-0 pointer-events-none" : ""}`}
                onClick={() => (num === "del" ? handleDelete() : handleNumberClick(num))}
                disabled={loading}
              >
                {num === "del" ? <Delete className="h-6 w-6" /> : num}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
