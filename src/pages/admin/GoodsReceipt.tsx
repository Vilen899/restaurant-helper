import { useState, useEffect } from "react";
import { ArrowDownToLine, Plus, Trash2 } from "lucide-react";
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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price) || 0), 0);
  };

  const handlePost = async () => {
    try {
      // 1. СОЗДАЕМ ЗАГОЛОВОК С СУММОЙ
      const { data: doc, error: docError } = await supabase
        .from("material_documents")
        .insert([{
          type: "MIGO_101",
          doc_number: header.doc_num,
          vendor_inn: header.inn,
          location_id: header.loc_id,
          total_amount: calculateTotal() // СОХРАНЯЕМ ОБЩУЮ СУММУ
        }])
        .select().single();

      if (docError) throw docError;

      for (const item of items) {
        // 2. СОХРАНЯЕМ ПОЗИЦИИ С ЦЕНОЙ
        await supabase.from("material_document_items").insert({
          doc_id: doc.id,
          ingredient_id: item.ing_id,
          quantity: Number(item.qty),
          price: Number(item.price)
        });

        // 3. ОБНОВЛЯЕМ СКЛАД
        await supabase.rpc('increment_inventory', { 
          loc_id: header.loc_id, 
          ing_id: item.ing_id, 
          val: Number(item.qty) 
        });
      }

      toast.success("ПРОВЕДЕНО НА СУММУ: " + calculateTotal().toLocaleString());
      setItems([{ ing_id: "", qty: "", price: "" }]);
    } catch (e: any) {
      toast.error("ОШИБКА: " + e.message);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black italic">MIGO: ПРИХОД ТОВАРА</h1>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500">ИТОГО К ПРОВОДКЕ:</p>
          <p className="text-2xl font-black text-emerald-500">{calculateTotal().toLocaleString()} ₸</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 bg-zinc-900/50 p-4 border border-white/10">
        <Input placeholder="ИНН ПОСТАВЩИКА" value={header.inn} onChange={e => setHeader({...header, inn: e.target.value})} className="bg-black border-white/20" />
        <Input placeholder="№ НАКЛАДНОЙ" value={header.doc_num} onChange={e => setHeader({...header, doc_num: e.target.value})} className="bg-black border-white/20" />
        <Select onValueChange={v => setHeader({...header, loc_id: v})}>
          <SelectTrigger className="bg-black border-white/20"><SelectValue placeholder="СКЛАД" /></SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white">
            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead>ТОВАР</TableHead>
            <TableHead className="w-32">КОЛ-ВО</TableHead>
            <TableHead className="w-32">ЦЕНА</TableHead>
            <TableHead className="w-32 text-right">СУММА</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={idx} className="border-white/5">
              <TableCell>
                <Select onValueChange={v => { const n = [...items]; n[idx].ing_id = v; setItems(n); }}>
                  <SelectTrigger className="bg-transparent border-none"><SelectValue placeholder="ВЫБРАТЬ..." /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white">
                    {ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Input type="number" value={item.qty} onChange={e => { const n = [...items]; n[idx].qty = e.target.value; setItems(n); }} className="bg-black border-white/10 text-center" /></TableCell>
              <TableCell><Input type="number" value={item.price} onChange={e => { const n = [...items]; n[idx].price = e.target.value; setItems(n); }} className="bg-black border-white/10 text-center" /></TableCell>
              <TableCell className="text-right font-bold text-emerald-400">{(Number(item.qty) * Number(item.price) || 0).toLocaleString()}</TableCell>
              <TableCell><Button variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={16}/></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Button onClick={() => setItems([...items, {ing_id: "", qty: "", price: "" }])} variant="outline" className="w-full mt-4 border-dashed border-white/20 text-zinc-500">+ ДОБАВИТЬ СТРОКУ</Button>
      
      <Button onClick={handlePost} className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 h-14 text-lg font-black">ПОДТВЕРДИТЬ И ПРОВЕСТИ</Button>
    </div>
  );
}
