import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackagePlus, Save, Plus, Trash2, Loader2, FileText, Truck, Store } from "lucide-react";

export default function GoodsReceipt() {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);

  const [header, setHeader] = useState({
    doc_num: "",
    inn: "",
    loc_id: "",
    supplier_name: "",
  });
  const [items, setItems] = useState([{ ingredient_id: "", quantity: 0, price: 0 }]);

  useEffect(() => {
    const loadRefs = async () => {
      const { data: locs } = await supabase.from("locations").select("id, name");
      const { data: ings } = await (supabase as any).from("ingredients").select("id, name, unit:units(abbreviation)");
      setLocations(locs || []);
      setIngredients(ings || []);
    };
    loadRefs();
  }, []);

  const addItem = () => setItems([...items, { ingredient_id: "", quantity: 0, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (!header.loc_id || items.some((i) => !i.ingredient_id)) {
      toast.error("ЗАПОЛНИТЕ СКЛАД И ВСЕ ТОВАРЫ");
      return;
    }
    setLoading(true);
    try {
      const { data: doc, error: docError } = await (supabase as any)
        .from("material_documents")
        .insert([
          {
            type: "MIGO_101",
            doc_number: header.doc_num,
            vendor_inn: header.inn,
            supplier_name: header.supplier_name,
            location_id: header.loc_id,
            total_amount: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
          },
        ])
        .select()
        .single();

      if (docError) throw docError;

      for (const item of items) {
        await (supabase as any).from("material_document_items").insert([
          {
            doc_id: doc.id,
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            price: item.price,
          },
        ]);

        await (supabase as any).rpc("increment_inventory", {
          loc_id: header.loc_id,
          ing_id: item.ingredient_id,
          val: item.quantity,
        });
      }

      toast.success("ДОКУМЕНТ ПРОВЕДЕН");
      setHeader({ doc_num: "", inn: "", loc_id: "", supplier_name: "" });
      setItems([{ ingredient_id: "", quantity: 0, price: 0 }]);
    } catch (e: any) {
      toast.error("ОШИБКА: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-[#0c0c0e] min-h-screen text-zinc-300 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <PackagePlus size={18} className="text-black" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Приход товара</h1>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">MIGO_101</p>
            </div>
          </div>
          <button
            disabled={loading}
            onClick={handlePost}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black px-4 h-8 rounded transition-all shadow-lg uppercase"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Провести
          </button>
        </div>

        {/* DOC INFO GRID */}
        <div className="grid grid-cols-4 gap-3 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 mb-4 shadow-xl">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <Store size={10} /> Склад
            </label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold rounded outline-none text-zinc-200"
              value={header.loc_id}
              onChange={(e) => setHeader({ ...header, loc_id: e.target.value })}
            >
              <option value="">ВЫБРАТЬ...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <FileText size={10} /> № Накладной
            </label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold rounded outline-none text-zinc-200"
              value={header.doc_num}
              onChange={(e) => setHeader({ ...header, doc_num: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <Truck size={10} /> Поставщик
            </label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold rounded outline-none text-zinc-200"
              value={header.supplier_name}
              onChange={(e) => setHeader({ ...header, supplier_name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase">ИНН</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold rounded outline-none text-zinc-200"
              value={header.inn}
              onChange={(e) => setHeader({ ...header, inn: e.target.value })}
            />
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden shadow-md">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/80 border-b border-zinc-700">
              <tr>
                <th className="p-2 text-[9px] font-black uppercase text-zinc-500 tracking-wider">Материал</th>
                <th className="p-2 text-[9px] font-black uppercase text-zinc-500 tracking-wider w-24 text-right">
                  Кол-во
                </th>
                <th className="p-2 text-[9px] font-black uppercase text-zinc-500 tracking-wider w-24 text-right">
                  Цена
                </th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-zinc-800/50">
                  <td className="p-1 px-2">
                    <select
                      className="w-full bg-transparent text-[11px] font-bold text-emerald-400 outline-none"
                      value={item.ingredient_id}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].ingredient_id = e.target.value;
                        setItems(n);
                      }}
                    >
                      <option value="" className="bg-zinc-900">
                        ВЫБРАТЬ...
                      </option>
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id} className="bg-zinc-900">
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded h-7 px-2 font-mono text-xs text-right text-white"
                      value={item.quantity}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].quantity = Number(e.target.value);
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded h-7 px-2 font-mono text-xs text-right text-emerald-500"
                      value={item.price}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].price = Number(e.target.value);
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-1 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-zinc-600 hover:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addItem}
            className="w-full py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-widest border-t border-zinc-800 transition-all"
          >
            + ДОБАВИТЬ СТРОКУ
          </button>
        </div>
      </div>
    </div>
  );
}
