import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackagePlus, Save, Plus, Trash2, Loader2, FileText, Truck, Search } from "lucide-react";

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

      toast.success("ДОКУМЕНТ ПРОВЕДЕН: " + doc.doc_number);
      setHeader({ doc_num: "", inn: "", loc_id: "", supplier_name: "" });
      setItems([{ ingredient_id: "", quantity: 0, price: 0 }]);
    } catch (e: any) {
      toast.error("СБОЙ ПРОВОДКИ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-[#0c0c0e] min-h-screen text-zinc-300 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* ЗАГОЛОВОК СТРАНИЦЫ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <PackagePlus size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Приход товара</h1>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter italic">Операция: MIGO_101</p>
            </div>
          </div>

          <button
            disabled={loading}
            onClick={handlePost}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-black px-4 h-9 rounded transition-all shadow-lg uppercase tracking-widest"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Провести документ
          </button>
        </div>

        {/* ШАПКА ДОКУМЕНТА (ИНФОРМАЦИЯ) */}
        <div className="grid grid-cols-4 gap-3 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 mb-4 shadow-xl">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <Store size={10} /> Склад получатель
            </label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold text-zinc-200 rounded outline-none focus:border-emerald-500/50"
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
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold text-zinc-200 rounded outline-none focus:border-emerald-500/50"
              value={header.doc_num}
              onChange={(e) => setHeader({ ...header, doc_num: e.target.value })}
              placeholder="000000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <Truck size={10} /> Поставщик (Имя)
            </label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold text-zinc-200 rounded outline-none focus:border-emerald-500/50"
              value={header.supplier_name}
              onChange={(e) => setHeader({ ...header, supplier_name: e.target.value })}
              placeholder="Наименование ТОО"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase">ИНН Поставщика</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 h-8 px-2 text-[11px] font-bold text-zinc-200 rounded outline-none focus:border-emerald-500/50"
              value={header.inn}
              onChange={(e) => setHeader({ ...header, inn: e.target.value })}
              placeholder="12 цифр"
            />
          </div>
        </div>

        {/* ТАБЛИЧНАЯ ЧАСТЬ */}
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 shadow-md overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/80 border-b border-zinc-700">
              <tr>
                <th className="p-2.5 text-[9px] font-black uppercase text-zinc-500 tracking-wider">Материал / Товар</th>
                <th className="p-2.5 text-[9px] font-black uppercase text-zinc-500 tracking-wider w-32">Количество</th>
                <th className="p-2.5 text-[9px] font-black uppercase text-zinc-500 tracking-wider w-32">Цена за ед.</th>
                <th className="p-2.5 text-[9px] font-black uppercase text-zinc-500 tracking-wider w-40 text-right">
                  Сумма
                </th>
                <th className="p-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-2">
                    <select
                      className="w-full bg-transparent border-none text-[11px] font-bold text-emerald-400 outline-none cursor-pointer"
                      value={item.ingredient_id}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].ingredient_id = e.target.value;
                        setItems(newItems);
                      }}
                    >
                      <option value="" className="bg-zinc-900 text-white">
                        ВЫБЕРИТЕ ТОВАР...
                      </option>
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id} className="bg-zinc-900 text-white uppercase">
                          {i.name} ({i.unit?.abbreviation || ""})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded h-7 px-2 font-mono text-xs text-white outline-none focus:border-emerald-500/30 text-right"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].quantity = Number(e.target.value);
                        setItems(newItems);
                      }}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded h-7 px-2 font-mono text-xs text-emerald-500 outline-none focus:border-emerald-500/30 text-right"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].price = Number(e.target.value);
                        setItems(newItems);
                      }}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <span className="text-xs font-mono font-black text-zinc-400">
                      {(item.quantity * item.price).toLocaleString()} ₸
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addItem}
            className="w-full py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 text-[10px] font-black flex items-center justify-center gap-2 tracking-widest transition-all border-t border-zinc-800"
          >
            <Plus size={12} /> Добавить позицию в накладную
          </button>
        </div>

        {/* ИТОГОВАЯ СУММА */}
        <div className="mt-4 flex justify-end">
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex items-center gap-6">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Итого к начислению:</span>
            <span className="text-xl font-mono font-black text-white">
              {items.reduce((sum, i) => sum + i.quantity * i.price, 0).toLocaleString()}{" "}
              <span className="text-[10px] text-zinc-500 font-normal">₸</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
