import { useState, useEffect } from "react";
import { ArrowDownToLine, Save, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GoodsReceipt() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [header, setHeader] = useState({ inn: "", doc_num: "", loc_id: "" });
  const [items, setItems] = useState([{ ing_id: "", qty: "" }]);

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
    if (!header.loc_id || !header.inn || !items[0].ing_id) return toast.error("ЗАПОЛНИТЕ СКЛАД, ИНН И ТОВАР");

    try {
      for (const item of items) {
        if (!item.ing_id || !item.qty) continue;
        const qtyNum = parseFloat(item.qty);

        // 1. ОБНОВЛЯЕМ ОСТАТКИ (Используем RPC функцию для надежности)
        await supabase.rpc('increment_inventory', { 
          loc_id: header.loc_id, 
          ing_id: item.ing_id, 
          val: qtyNum 
        });

        // 2. ВАЖНО: ЗАПИСЫВАЕМ В ЖУРНАЛ (Чтобы MB51 увидел это)
        await (supabase.from("stock_movements" as any) as any).insert({
          ingredient_id: item.ing_id,
          location_id: header.loc_id,
          quantity: qtyNum,
          type: "MIGO_101",
          reference: header.doc_num || "БЕЗ НОМЕРА",
          vendor_inn: header.inn
        });
      }
      toast.success("ПРИХОД ПРОВЕДЕН. ПРОВЕРЬТЕ MB51");
      setItems([{ ing_id: "", qty: "" }]);
      setHeader({ ...header, doc_num: "" });
    } catch (e) {
      console.error(e);
      toast.error("ОШИБКА ПРОВОДКИ");
    }
  };

  return (
    <div className="p-4 bg-[#0c0c0c] min-h-screen text-zinc-300 uppercase font-sans">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h1 className="text-lg font-black text-white italic">MIGO: ПРИХОД ПО ФАКТУРЕ</h1>
        <Button onClick={handlePost} className="bg-indigo-600 hover:bg-indigo-500 font-bold px-8">ПРОВЕСТИ (F8)</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-zinc-900/40 border border-white/5 rounded-lg">
        <div><label className="text-[10px] text-zinc-500 block font-bold">ИНН ПОСТАВЩИКА</label>
        <Input value={header.inn} onChange={e => setHeader({...header, inn: e.target.value})} className="h-10 bg-black border-white/10" placeholder="02646829" /></div>
        <div><label className="text-[10px] text-zinc-500 block font-bold">№ НАКЛАДНОЙ</label>
        <Input value={header.doc_num} onChange={e => setHeader({...header, doc_num: e.target.value})} className="h-10 bg-black border-white/10" placeholder="A1234567" /></div>
        <div><label className="text-[10px] text-zinc-500 block font-bold">СКЛАД ПРИЕМКИ</label>
        <Select onValueChange={v => setHeader({...header, loc_id: v})}><SelectTrigger className="h-10 bg-black border-white/10 font-bold text-indigo-400"><SelectValue placeholder="ВЫБОР СКЛАДА" /></SelectTrigger><SelectContent className="bg-zinc-900 text-white">{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
      </div>

      <Table className="border border-white/10 bg-zinc-900/20">
        <TableHeader className="bg-zinc-900/50"><TableRow><TableHead>МАТЕРИАЛ</TableHead><TableHead className="w-32 text-center">КОЛ-ВО</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
        <TableBody>{items.map((item, idx) => (
          <TableRow key={idx} className="border-b border-white/5">
            <TableCell><Select onValueChange={v => { const n = [...items]; n[idx].ing_id = v; setItems(n); }}><SelectTrigger className="bg-transparent border-none text-sm uppercase"><SelectValue placeholder="ВЫБОР МАТЕРИАЛА..." /></SelectTrigger><SelectContent className="bg-zinc-900 text-white">{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></TableCell>
            <TableCell><Input type="number" value={item.qty} onChange={e => { const n = [...items]; n[idx].qty = e.target.value; setItems(n); }} className="h-8 bg-black border-white/10 text-center font-bold" /></TableCell>
            <TableCell><Button variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={14} /></Button></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
      <Button onClick={() => setItems([...items, {ing_id: "", qty: "" }])} variant="ghost" className="w-full text-xs text-zinc-500 mt-2">+ ДОБАВИТЬ СТРОКУ</Button>
    </div>
  );
}
