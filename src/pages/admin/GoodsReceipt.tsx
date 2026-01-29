import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PackagePlus, Save, Plus, Trash2, Loader2 } from "lucide-react";

export default function GoodsReceipt() {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  const [header, setHeader] = useState({ doc_num: "", inn: "", loc_id: "" });
  const [items, setItems] = useState([{ ingredient_id: "", quantity: 0, price: 0 }]);

  // 1. Загружаем справочники при входе на страницу
  useEffect(() => {
    const loadRefs = async () => {
      const { data: locs } = await supabase.from("locations").select("id, name");
      const { data: ings } = await supabase.from("ingredients").select("id, name, unit");
      setLocations(locs || []);
      setIngredients(ings || []);
    };
    loadRefs();
  }, []);

  const addItem = () => setItems([...items, { ingredient_id: "", quantity: 0, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (!header.loc_id || items.some(i => !i.ingredient_id)) {
      toast.error("ЗАПОЛНИТЕ СКЛАД И ВСЕ ТОВАРЫ");
      return;
    }

    setLoading(true);
    try {
      // 2. Создаем заголовок (MIGO)
      const { data: doc, error: docError } = await (supabase as any)
        .from("material_documents")
        .insert([{
          type: "MIGO_101",
          doc_number: header.doc_num,
          vendor_inn: header.inn,
          location_id: header.loc_id,
          total_amount: items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
        }] as any)
        .select().single();

      if (docError) throw docError;

      // 3. Создаем позиции и обновляем остатки
      for (const item of items) {
        await (supabase as any).from("material_document_items").insert([{
          doc_id: doc.id,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          price: item.price
        }] as any);

        await (supabase as any).rpc('increment_inventory', {
          loc_id: header.loc_id,
          ing_id: item.ingredient_id,
          val: item.quantity
        });
      }

      toast.success("ДОКУМЕНТ ПРОВЕДЕН: " + doc.doc_number);
      setHeader({ doc_num: "", inn: "", loc_id: "" });
      setItems([{ ingredient_id: "", quantity: 0, price: 0 }]);
    } catch (e: any) {
      toast.error("СБОЙ ПРОВОДКИ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#050505] min-h-screen text-zinc-300 font-sans uppercase">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black mb-8 flex items-center gap-3 italic text-white tracking-tighter">
          <PackagePlus className="text-emerald-500" size={32} /> ПРИХОД ТОВАРА (MIGO)
        </h1>

        {/* ШАПКА ДОКУМЕНТА */}
        <div className="grid grid-cols-3 gap-4 bg-zinc-900/50 p-6 border border-white/10 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500">СКЛАД ПОЛУЧАТЕЛЬ</label>
            <select 
              className="w-full bg-black border border-white/10 p-2 text-xs font-bold focus:border-emerald-500 outline-none"
              value={header.loc_id}
              onChange={e => setHeader({...header, loc_id: e.target.value})}
            >
              <option value="">ВЫБЕРИТЕ СКЛАД...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500">№ НАКЛАДНОЙ</label>
            <Input className="bg-black border-white/10 h-9 rounded-none" value={header.doc_num} onChange={e => setHeader({...header, doc_num: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500">ИНН ПОСТАВЩИКА</label>
            <Input className="bg-black border-white/10 h-9 rounded-none" value={header.inn} onChange={e => setHeader({...header, inn: e.target.value})} />
          </div>
        </div>

        {/* ТАБЛИЧНАЯ ЧАСТЬ */}
        <div className="bg-zinc-900/20 border border-white/10 overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-zinc-500 font-black">
              <tr>
                <th className="p-4">МАТЕРИАЛ</th>
                <th className="p-4 w-32">КОЛ-ВО</th>
                <th className="p-4 w-32">ЦЕНА</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-2">
                    <select 
                      className="w-full bg-transparent border-none p-2 font-bold text-emerald-500 outline-none"
                      value={item.ingredient_id}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx].ingredient_id = e.target.value;
                        setItems(newItems);
                      }}
                    >
                      <option value="" className="bg-black text-white">ВЫБЕРИТЕ ТОВАР...</option>
                      {ingredients.map(i => <option key={i.id} value={i.id} className="bg-black text-white">{i.name} ({i.unit})</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full bg-black border border-white/5 p-2 font-mono" value={item.quantity} onChange={e => {
                      const newItems = [...items];
                      newItems[idx].quantity = Number(e.target.value);
                      setItems(newItems);
                    }} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full bg-black border border-white/5 p-2 font-mono text-emerald-500" value={item.price} onChange={e => {
                      const newItems = [...items];
                      newItems[idx].price = Number(e.target.value);
                      setItems(newItems);
                    }} />
                  </td>
                  <td className="p-2 text-center">
                    <button onClick={() => removeItem(idx)} className="text-zinc-600 hover:text-red-500"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addItem} className="w-full py-3 border-t border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black flex items-center justify-center gap-2 tracking-widest">
            <Plus size={14} /> ДОБАВИТЬ СТРОКУ
          </button>
        </div>

        <Button 
          disabled={loading}
          onClick={handlePost} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-8 text-lg rounded-none shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-3" />}
          ПОДТВЕРДИТЬ И ПРОВЕСТИ (POST)
        </Button>
      </div>
    </div>
  );
}
