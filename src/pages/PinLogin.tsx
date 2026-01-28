import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const location_id = "YOUR_LOCATION_ID"; // или получить из Select

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) setPin((prev) => prev + num);
  };

  const handleDelete = () => setPin((prev) => prev.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) handleSubmit();
  }, [pin]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/functions/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, location_id }),
      });

      const text = await res.text();

      if (text.startsWith("SUCCESS|")) {
        const parts = text.split("|");
        const user = { id: parts[1], full_name: parts[2], location_id: parts[3] };
        toast.success(`Добро пожаловать, ${user.full_name}!`);
        sessionStorage.setItem("cashier_session", JSON.stringify(user));
        navigate("/cashier");
      } else {
        toast.error(text);
        setPin("");
      }
    } catch (e) {
      toast.error("Ошибка подключения");
      setPin("");
    }
    setLoading(false);
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="grid grid-cols-3 gap-3">
        {numbers.map((num, i) => {
          if (num === "") return <div key={i} />;
          if (num === "del")
            return (
              <Button key={i} onClick={handleDelete}>
                DEL
              </Button>
            );
          return (
            <Button key={i} onClick={() => handleNumberClick(num)}>
              {num}
            </Button>
          );
        })}
      </div>
      {loading && <p className="text-white mt-4">Проверка...</p>}
    </div>
  );
}
