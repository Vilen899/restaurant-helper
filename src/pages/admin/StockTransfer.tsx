import { useState, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StockTransfer() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState({ from: "", to: "", ing: "", qty: "" });

  useEffect(() => {
    const load = async () => {
      const { data: ings } = await supabase.from("ingredients").select("*").eq("is_active", true);
      const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
      setIngredients(ings || []);
      setLocations(locs || []);
    };
    load();
  }, []);

  const handleTransfer = async () => {
    if (!form.from || !form.to || !form.ing || !form.qty) return toast.error("ЗАПОЛНИТЕ ВСЕ ПОЛЯ");
    if (form.from === form.to) return toast.error("СКЛАДЫ ДОЛЖНЫ РАЗЛИЧАТЬСЯ");

    try {
      const q = Number(form.qty);
      // Снимаем с А, добавляем на Б
      await supabase.rpc('increment_inventory', { loc_id: form.from, ing_id: form.ing, val: -q });
      await supabase.rpc('increment_inventory', { loc_id: form.to, ing_id: form.ing, val: q });
      
      // ЗАПИСЫВАЕМ В ЖУРНАЛ (ДЛЯ MB51)
      await (supabase.from("stock_movements" as any) as any).insert({
        ingredient_id: form.ing,
        location_id: form.from,
        quantity: -q,
        type: "MB1B_311",
        reference: `TO_${locations.find(l => l.id === form.to)?.name || form.to}`
      });

      toast.success("ПЕРЕНОС ВЫПОЛНЕН. ПРОВЕРЬТЕ MB51");
      setForm({ ...form, qty: "" });
    } catch (e) {
      toast.error("ОШИБКА ПЕРЕНОСА");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-10 bg-[#0c0c0c] text-white uppercase font-sans">
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
        <ArrowRightLeft className="text-blue-500" />
        <h1 className="text-lg font-black italic">MB1B: ПЕРЕМЕЩЕНИЕ (311)</h1>
      </div>
      <div className="space-y-6 bg-zinc-900/30 p-6 border border-white/5 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <Select onValueChange={v => setForm({...form, from: v})}><SelectTrigger className="h-10 bg-black uppercase font-bold text-red-400"><SelectValue placeholder="ОТКУДА" /></SelectTrigger><SelectContent className="bg-zinc-900 text-white">{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select>
          <Select onValueChange={v => setForm({...form, to: v})}><SelectTrigger className="h-10 bg-black uppercase font-bold text-emerald-400"><SelectValue placeholder="КУДА" /></SelectTrigger><SelectContent className="bg-zinc-900 text-white">{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <Select onValueChange={v => setForm({...form, ing: v})}><SelectTrigger className="h-12 bg-black uppercase font-bold"><SelectValue placeholder="ВЫБЕРИТЕ ТОВАР" /></SelectTrigger><SelectContent className="bg-zinc-900 text-white">{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
        <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} className="h-12 bg-black text-center text-xl font-black" placeholder="0.000" />
        <Button onClick={handleTransfer} className="w-full h-12 bg-blue-600 hover:bg-blue-500 font-black">ВЫПОЛНИТЬ ПЕРЕНОС</Button>
      </div>
    </div>
  );
}
