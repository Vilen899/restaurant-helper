import { useState, useEffect } from "react";
import { ArrowDownToLine, Plus, Trash2, FileCheck } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

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
    if (!header.loc_id || !header.inn || !items[0].ing_id) {
      return toast.error("ЗАПОЛНИТЕ СКЛАД, ИНН И ХОТЯ БЫ ОДИН ТОВАР");
    }

    setLoading(true);
    try {
      // 1. СОЗДАЕМ ЗАГОЛОВОК ДОКУМЕНТА (HEADER)
      const { data: doc, error: docError } = await supabase
        .from("material_documents")
        .insert([{
          type: "MIGO_101",
          doc_number: header.doc_num,
          vendor_inn: header.inn,
          location_id: header.loc_id,
          description: `ПРИХОД ОТ ИНН: ${header.inn}`
        }])
        .select()
        .single();

      if (docError) throw docError;

      // 2. ЦИКЛ ПО ТОВАРАМ (ITEMS)
      for (const item of items) {
        if (!item.ing_id || !item.qty) continue;
        const qtyNum = parseFloat(item.qty);

        // Записываем позицию документа
        await supabase.from("material_document_items").insert({
          doc_id: doc.id,
          ingredient_id: item.ing_id,
          quantity: qtyNum
        });

        // Обновляем остаток на складе через RPC
        await supabase.rpc('increment_inventory', { 
          loc_id: header.loc_id, 
          ing_id: item.ing_id, 
          val: qtyNum 
        });
      }

      toast.success(`ДОКУМЕНТ №${header.doc_num} УСПЕШНО ПРОВЕДЕН`);
      
      // Сброс формы
      setItems([{ ing_id: "", qty: "" }]);
      setHeader({ ...header, doc_num: "" });
    } catch (e: any) {
      console.error(e);
      toast.error("ОШИБКА ПРОВОДКИ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#0c0c0c] min-h-screen text-zinc-300 uppercase font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded shadow-lg shadow-emerald-500/20">
            <ArrowDownToLine className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-black text-white italic tracking-tight">MIGO: ПОСТУПЛЕНИЕ МАТЕРИАЛА</h1>
        </div>
        <Button 
          onClick={handlePost} 
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 font-black px-10 h-12 rounded-none transition-all shadow-lg"
        >
          {loading ? "ПРОВОДКА..." : "ПРОВЕСТИ (F8)"}
        </Button>
      </div>

      {/* ШАПКА ДОКУМЕНТА */}
      <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-zinc-900/30 border border-white/5 rounded-sm">
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-black tracking-widest">ИНН ПОСТАВЩИКА</label>
          <Input value={header.inn} onChange={e => setHeader({...header, inn: e.target.value})} className="h-10 bg-black border-white/10 text-white font-mono" placeholder="00000000" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-black tracking-widest">№ ФАКТУРЫ / НАКЛАДНОЙ</label>
          <Input value={header.doc_num} onChange={e => setHeader({...header, doc_num: e.target.value})} className="h-10 bg-black border-white/10 text-white font-mono" placeholder="A-000000" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-black tracking-widest">СКЛАД ПРИЕМКИ (SLOC)</label>
          <Select onValueChange={v => setHeader({...header, loc_id: v})}>
            <SelectTrigger className="h-10 bg-black border-white/10 font-bold text-emerald-400">
              <SelectValue placeholder="ВЫБЕРИТЕ СКЛАД" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white border-white/10">
              {locations.map(l => <SelectItem key={l.id} value={l.id} className="uppercase font-bold text-xs">{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ТАБЛИЧНАЯ ЧАСТЬ */}
      <div className="bg-zinc-900/20 border border-white/10 rounded-sm">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-[10px] font-black py-4">МАТЕРИАЛ (НАИМЕНОВАНИЕ)</TableHead>
              <TableHead className="w-48 text-center text-[10px] font-black">КОЛИЧЕСТВО</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx} className="border-b border-white/5 hover:bg-white/5">
                <TableCell className="py-3">
                  <Select onValueChange={v => { const n = [...items]; n[idx].ing_id = v; setItems(n); }}>
                    <SelectTrigger className="bg-transparent border-none text-sm font-bold uppercase focus:ring-0">
                      <SelectValue placeholder="ВЫБЕРИТЕ МАТЕРИАЛ..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-white border-white/10 max-h-[300px]">
                      {ingredients.map(i => <SelectItem key={i.id} value={i.id} className="text-xs font-bold uppercase">{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={item.qty} 
                    onChange={e => { const n = [...items]; n[idx].qty = e.target.value; setItems(n); }} 
                    className="h-9 bg-black border-white/10 text-center font-mono font-bold text-emerald-400" 
                    placeholder="0.000"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-zinc-600 hover:text-red-500">
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t border-white/5">
          <Button 
            onClick={() => setItems([...items, {ing_id: "", qty: "" }])} 
            variant="outline" 
            className="w-full border-dashed border-white/10 text-[10px] font-bold text-zinc-500 hover:text-white hover:bg-white/5 uppercase"
          >
            <Plus size={14} className="mr-2" /> ДОБАВИТЬ ПОЗИЦИЮ
          </Button>
        </div>
      </div>
    </div>
  );
}
