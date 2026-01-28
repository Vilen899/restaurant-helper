import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

export default function PinLogin() {
  const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleNumberClick = (num: string) => {
    if (pin.length < 4 && !loading) setPin((prev) => prev + num);
  };
  const handleDelete = () => {
    if (!loading) setPin((prev) => prev.slice(0, -1));
  };
  const handleClear = () => setPin("");

  useEffect(() => {
    if (pin.length === 4) handlePinSubmit();
  }, [pin]);

  const handlePinSubmit = async () => {
    if (!selectedLocation) {
      toast.error("Выберите точку");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/functions/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, location_id: selectedLocation }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Ошибка входа");
        setPin("");
        return;
      }

      toast.success(`Добро пожаловать, ${data.user.full_name}!`);
      sessionStorage.setItem("cashier_session", JSON.stringify(data.user));
      navigate("/cashier");
    } catch {
      toast.error("Ошибка подключения");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <img src={logo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
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
          <div className="grid grid-cols-3 gap-3">
            {numbers.map((num, i) => {
              if (num === "") return <div key={i} />;
              if (num === "del")
                return (
                  <Button
                    key={i}
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
                  key={i}
                  variant="ghost"
                  className="h-16 bg-white/5 text-white"
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
