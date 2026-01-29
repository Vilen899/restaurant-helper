import { useState, useEffect } from "react";
import { ArrowRightLeft, MoveRight, Box, Database, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StockTransfer() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState({ from: "", to: "", ing: "", qty: "" });
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: ings } = await supabase.from("ingredients").select("*").eq("is_active", true);
      const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
      setIngredients(ings || []);
      setLocations(locs || []);
    };
    loadData();
  }, []);

  // Проверка остатка на складе-отправителе при выборе товара или склада
  useEffect(() => {
    if (form.from && form.ing) {
      supabase
        .from("inventory")
        .select("quantity")
        .eq("location_id", form.from)
        .eq("ingredient_id", form.ing)
        .maybeSingle()
        .then(({ data }) => setAvailable(data?.quantity || 0));
    } else {
      setAvailable(null);
    }
  }, [form.from, form.ing]);

  const handleTransfer = async () => {
    if (!form.from || !form.to || !form.ing || !form.qty) {
      return toast.error("ЗАПОЛНИТЕ ВСЕ ПОЛЯ");
    }
    const q = Number(form.qty);
    if (q <= 0) return toast.error("УКАЖИТЕ КОРРЕКТНОЕ КОЛИЧЕСТВО");
    if (available !== null && q > available) return toast.error("НЕДОСТАТОЧНО ТОВАРА НА СКЛАДЕ");
    if (form.from === form.to) return toast.error("СКЛАДЫ ДОЛЖНЫ РАЗЛИЧАТЬСЯ");

    setLoading(true);
    try {
      // 1. Списываем со склада А
      await supabase.rpc('increment_inventory', { loc_id: form.from, ing_id: form.ing, val: -q });
      // 2. Добавляем на склад Б
      await supabase.rpc('increment_inventory', { loc_id: form.to, ing_id: form.ing, val: q });
      
      // 3. Запись в журнал движений (Вид 311 - Перемещение между складами)
      await (supabase.from("stock_movements" as any) as any).insert({
        ingredient_id: form.ing,
        location_id: form.from,
        quantity: -q,
        type: "MB1B_311",
        reference: `ПЕРЕНОС НА ${locations.find(l => l.id === form.to)?.name}`
      });

      toast.success("ПЕРЕМЕЩЕНИЕ (311) ВЫПОЛНЕНО");
      setForm({ ...form, qty: "" });
      // Обновляем доступный остаток на экране
      setAvailable(prev => (prev !== null ? prev - q : 0));
    } catch (e) {
      toast.error("ОШИБКА ПРОВОДКИ ДОКУМЕНТА");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 p-6 font-sans">
      <div className="max-w-xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
          <div className="bg-blue-600 p-2 rounded-md">
            <ArrowRightLeft className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white uppercase italic">MB1B: Перемещение запаса</h1>
            <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Movement Type: 311 (Transfer between S-Loc)</p>
          </div>
        </div>

        {/* FORM */}
        <div className="space-y-6 bg-zinc-900/30 p-6 border border-white/5 rounded-lg shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-tight">Отправитель</label>
              <Select onValueChange={(v) => setForm({ ...form, from: v })}>
                <SelectTrigger className="h-10 bg-black border-white/10 text-xs font-bold uppercase text-red-400">
                  <SelectValue placeholder="ОТКУДА" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-white border-white/10">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs uppercase">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-tight">Получатель</label>
              <Select onValueChange={(v) => setForm({ ...form, to: v })}>
                <SelectTrigger className="h-10 bg-black border-white/10 text-xs font-bold uppercase text-emerald-400">
                  <SelectValue placeholder="КУДА" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-white border-white/10">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs uppercase">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 font-bold">Материал</label>
            <Select onValueChange={(v) => setForm({ ...form, ing: v })}>
              <SelectTrigger className="h-10 bg-black border-white/10 text-sm uppercase">
                <SelectValue placeholder="ВЫБЕРИТЕ МАТЕРИАЛ" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white border-white/10">
                {ingredients.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="text-xs uppercase">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {available !== null && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 p-3 rounded flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-indigo-400" />
                <span className="text-[10px] text-indigo-400 font-bold uppercase">Доступно сейчас:</span>
              </div>
              <span className="text-lg font-mono font-black text-indigo-400">
                {available.toFixed(3)}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 font-bold">Количество переноса</label>
            <Input 
              type="number" 
              value={form.qty} 
              onChange={(e) => setForm({ ...form, qty: e.target.value })} 
              className="h-12 bg-black border-white/10 text-center text-xl font-bold text-white focus:ring-1 focus:ring-indigo-500" 
              placeholder="0.000" 
            />
          </div>

          <Button 
            onClick={handleTransfer} 
            disabled={loading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 font-bold text-sm uppercase tracking-wider transition-all"
          >
            {loading ? "ПРОВОДКА..." : "ВЫПОЛНИТЬ ПЕРЕМЕЩЕНИЕ"}
          </Button>
        </div>

        {/* INFO FOOTER */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-zinc-900/20 border border-white/5 rounded-lg text-zinc-500">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed uppercase tracking-tight">
            Внимание: Транзакция MB1B автоматически списывает запас со склада-отправителя и приходует его на склад-получатель. Операция мгновенно отразится в MMBE и MB51.
          </p>
        </div>
      </div>
    </div>
  );
}
