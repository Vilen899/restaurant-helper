
import { useState, useEffect } from "react";
import { ArrowDownToLine, Plus, Trash2, Save, Truck, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GoodsReceipt() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [header, setHeader] = useState({ vendor: "", inn: "", doc_num: "", loc_id: "" });
  const [items, setItems] = useState([{ ing_id: "", qty: "", price: "" }]);

  useEffect(() => {
    const load = async () => {
      const { data: ings } = await supabase.from("ingredients").select("*").eq("is_active", true);
      const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
      setIngredients(ings || []);
      setLocations(locs || []);
    };
    load();
  }, []);

  const handlePost = async () => {
    if (!header.loc_id || !header.inn || items[0].ing_id === "") {
      return toast.error("ЗАПОЛНИТЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ: СКЛАД, ИНН И ТОВАР");
    }

    try {
      for (const item of items) {
        if (!item.ing_id || !item.qty) continue;
        const qtyNum = parseFloat(item.qty);

        // 1. Обновление остатка (Inventory)
        const { data: exist } = await supabase.from("inventory").select("id, quantity")
          .eq("location_id", header.loc_id).eq("ingredient_id", item.ing_id).maybeSingle();

        if (exist) {
          await supabase.from("inventory").update({ quantity: Number(exist.quantity) + qtyNum }).eq("id", exist.id);
        } else {
          await supabase.from("inventory").insert({ location_id: header.loc_id, ingredient_id: item.ing_id, quantity: qtyNum });
        }

        // 2. Запись в журнал (Movement)
        await (supabase.from("stock_movements" as any) as any).insert({
          ingredient_id: item.ing_id,
          location_id: header.loc_id,
          quantity: qtyNum,
          type: "MIGO_101",
          reference: header.doc_num || "БЕЗ НОМЕРА",
          vendor_inn: header.inn
        });
      }
      toast.success("ДОКУМЕНТ 101 ПРОВЕДЕН УСПЕШНО");
      setItems([{ ing_id: "", qty: "", price: "" }]);
      setHeader({ ...header, doc_num: "" });
    } catch (e) {
      toast.error("ОШИБКА ПРИ СОХРАНЕНИИ");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 p-4 font-sans">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-md"><ArrowDownToLine className="text-white" size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-white uppercase italic">MIGO: Поступление материала</h1>
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Movement Type: 101 (Goods Receipt)</p>
          </div>
        </div>
        <Button onClick={handlePost} className="h-10 bg-indigo-600 hover:bg-indigo-500 font-bold px-8 rounded-sm">ПРОВЕСТИ (POST)</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 bg-zinc-900/40 p-4 border border-white/5 rounded-lg">
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 font-bold uppercase">ИНН Поставщика</label>
          <Input value={header.inn} onChange={e => setHeader({...header, inn: e.target.value})} className="h-9 bg-black border-white/10 text-sm" placeholder="02646829" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 font-bold uppercase">№ Накладной</label>
          <Input value={header.doc_num} onChange={e => setHeader({...header, doc_num: e.target.value})} className="h-9 bg-black border-white/10 text-sm uppercase" placeholder="A00000000" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 font-bold uppercase">Склад приемки</label>
          <Select onValueChange={v => setHeader({...header, loc_id: v})}>
            <SelectTrigger className="h-9 bg-black border-white/10 text-sm uppercase font-bold text-indigo-400">
              <SelectValue placeholder="ВЫБЕРИТЕ СКЛАД" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white border-white/10">
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="h-10 border-b border-white/10">
              <TableHead className="text-[10px] uppercase font-bold pl-4">Материал</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-center w-32">Кол-во</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-center w-32">Цена (ед.)</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right pr-4 w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx} className="h-12 border-b border-white/5 hover:bg-white/5">
                <TableCell className="pl-4">
                  <Select onValueChange={v => { const n = [...items]; n[idx].ing_id = v; setItems(n); }}>
                    <SelectTrigger className="h-8 bg-transparent border-none text-sm p-0 focus:ring-0 uppercase font-medium">
                      <SelectValue placeholder="Выбрать материал..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-white border-white/10">
                      {ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input type="number" value={item.qty} onChange={e => { const n = [...items]; n[idx].qty = e.target.value; setItems(n); }} className="h-8 bg-black border-white/10 text-center font-bold text-indigo-400" /></TableCell>
                <TableCell><Input type="number" value={item.price} onChange={e => { const n = [...items]; n[idx].price = e.target.value; setItems(n); }} className="h-8 bg-black border-white/10 text-center font-bold text-emerald-500" /></TableCell>
                <TableCell className="text-right pr-4">
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="h-8 w-8 text-zinc-600 hover:text-red-500"><Trash2 size={14}/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={() => setItems([...items, {ing_id: "", qty: "", price: "" }])} variant="ghost" className="w-full h-10 text-[10px] uppercase text-zinc-500 hover:bg-white/5">+ Добавить позицию</Button>
      </div>
    </div>
  );
}
