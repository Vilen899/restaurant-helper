import { useState, useEffect } from "react";
import { Calculator, Save, Search, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PhysicalInventory() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>("");
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*").eq("is_active", true);
    setLocations(data || []);
  };

  // Загрузка товаров выбранного склада для подсчета
  const startInventory = async () => {
    if (!selectedLoc) return toast.error("ВЫБЕРИТЕ СКЛАД");
    setLoading(true);
    
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(name, unit:units(abbreviation))")
      .eq("location_id", selectedLoc);

    const itemsForCount = (inv || []).map(i => ({
      inv_id: i.id,
      ing_id: i.ingredient_id,
      name: i.ingredient?.name,
      unit: i.ingredient?.unit?.abbreviation,
      system_qty: Number(i.quantity),
      actual_qty: "", // Оставляем пустым для ввода
      expiry_date: "", // Из твоего файла XLSX
      price: 0 // Для расчета суммы разницы
    }));

    setStockItems(itemsForCount);
    setLoading(false);
  };

  const handlePostInventory = async () => {
    try {
      for (const item of stockItems) {
        if (item.actual_qty === "") continue; // Пропускаем не подсчитанные

        const actual = Number(item.actual_qty);
        const diff = actual - item.system_qty;

        // 1. Обновляем физический остаток в таблице inventory
        await supabase
          .from("inventory")
          .update({ quantity: actual })
          .eq("id", item.inv_id);

        // 2. Регистрируем документ разницы в журнале (MB51)
        await (supabase.from("stock_movements" as any) as any).insert({
          ingredient_id: item.ing_id,
          location_id: selectedLoc,
          quantity: diff,
          type: "MI07_COUNT",
          reference: "PHYS_INV_" + new Date().toISOString().slice(0,10),
          expiry_date: item.expiry_date || null
        });
      }
      toast.success("MI07: РЕЗУЛЬТАТЫ ПОДСЧЕТА ПРОВЕДЕНЫ");
      setStockItems([]);
    } catch (e) {
      toast.error("ОШИБКА ПРОВОДКИ ДОКУМЕНТА");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 font-sans p-4">
      {/* HEADER MI01 */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-md shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <Calculator className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight uppercase">MI01: Инвентаризация (Подсчет)</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Physical Inventory / Difference List</p>
          </div>
        </div>
        {stockItems.length > 0 && (
          <Button onClick={handlePostInventory} className="h-10 bg-emerald-600 hover:bg-emerald-500 font-bold px-6 rounded-md uppercase text-xs">
            Провести разницы (MI07)
          </Button>
        )}
      </div>

      {/* SELECT LOCATION */}
      {stockItems.length === 0 && (
        <div className="max-w-md mx-auto mt-20 p-8 border border-white/10 bg-zinc-900/50 rounded-xl text-center">
          <label className="block text-[10px] uppercase font-black text-zinc-500 mb-4 tracking-widest">Выберите склад для инвентаризации</label>
          <Select onValueChange={setSelectedLoc}>
            <SelectTrigger className="h-12 bg-black border-white/10 text-lg font-bold mb-6 uppercase">
              <SelectValue placeholder="--- ВЫБОР СКЛАДА ---" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white border-white/10">
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={startInventory} disabled={!selectedLoc || loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-tighter">
            Начать подсчет
          </Button>
        </div>
      )}

      {/* COUNTING TABLE */}
      {stockItems.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-zinc-900/20 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="border-b border-white/10 h-10">
                <TableHead className="text-zinc-500 font-bold text-[10px] uppercase pl-4">Материал</TableHead>
                <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-center w-32">Книжный остаток</TableHead>
                <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-center w-40">Факт. наличие</TableHead>
                <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-center w-32">Разница</TableHead>
                <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-center w-48">Срок годности</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.map((item, idx) => {
                const diff = item.actual_qty !== "" ? Number(item.actual_qty) - item.system_qty : 0;
                return (
                  <TableRow key={idx} className="border-b border-white/5 h-14 hover:bg-white/5 transition-colors">
                    <TableCell className="pl-4">
                      <div className="text-sm font-semibold text-zinc-100 uppercase">{item.name}</div>
                      <div className="text-[10px] text-zinc-600 uppercase italic">{item.unit}</div>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-zinc-500">
                      {item.system_qty.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input 
                        type="number"
                        className="h-10 bg-black border-white/10 text-center font-bold text-indigo-400 focus:border-indigo-500"
                        value={item.actual_qty}
                        onChange={(e) => {
                          const n = [...stockItems];
                          n[idx].actual_qty = e.target.value;
                          setStockItems(n);
                        }}
                      />
                    </TableCell>
                    <TableCell className={`text-center font-mono font-bold ${diff === 0 ? 'text-zinc-700' : diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.actual_qty !== "" ? (diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)) : "---"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                        <Input 
                          type="date"
                          className="h-10 pl-10 bg-zinc-900 border-white/5 text-xs uppercase"
                          value={item.expiry_date}
                          onChange={(e) => {
                            const n = [...stockItems];
                            n[idx].expiry_date = e.target.value;
                            setStockItems(n);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
