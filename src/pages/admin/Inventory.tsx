import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Store, Calendar, Box } from "lucide-react";

export default function InventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    supabase
      .from("locations")
      .select("*")
      .then(({ data }) => {
        setLocations(data || []);
        if (data?.length) setSelectedLoc(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (selectedLoc) {
      supabase
        .from("inventory")
        .select(`quantity, ingredient:ingredients(name, unit)`)
        .eq("location_id", selectedLoc)
        .then(({ data }) => setStock(data || []));
    }
  }, [selectedLoc, asOfDate]);

  const filtered = stock.filter((item) => item.ingredient?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 bg-white min-h-screen text-zinc-800">
      {/* МИНИ-ПАНЕЛЬ ФИЛЬТРОВ */}
      <div className="flex flex-wrap items-center gap-4 mb-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Box size={18} className="text-zinc-400" />
          <h1 className="text-sm font-bold uppercase tracking-widest">Складские остатки</h1>
        </div>

        {/* Выбор точки - МАЛЕНЬКИЙ */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">Склад:</span>
          <select
            value={selectedLoc}
            onChange={(e) => setSelectedLoc(e.target.value)}
            className="text-xs font-bold border rounded px-2 py-1 bg-zinc-50 h-8 outline-none focus:border-zinc-400"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Дата - МАЛЕНЬКАЯ */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">Дата:</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="text-xs font-bold border rounded px-2 py-1 bg-zinc-50 h-8 outline-none"
          />
        </div>

        {/* Поиск - МАЛЕНЬКИЙ */}
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
          <input
            placeholder="Поиск товара..."
            className="pl-8 text-xs border rounded px-2 py-1 h-8 w-48 outline-none focus:ring-1 focus:ring-zinc-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ТАБЛИЦА БЕЗ ЛИШНЕГО ДЕКОРА */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-zinc-50">
              <th className="text-left p-2 text-[10px] font-bold uppercase text-zinc-500 tracking-tighter">
                Наименование
              </th>
              <th className="text-right p-2 text-[10px] font-bold uppercase text-zinc-500 tracking-tighter w-24">
                Ед. изм.
              </th>
              <th className="text-right p-2 text-[10px] font-bold uppercase text-zinc-500 tracking-tighter w-32">
                Остаток
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={i} className="border-b hover:bg-zinc-50/50 transition-colors h-9">
                <td className="p-2 text-xs font-bold uppercase text-zinc-700">{item.ingredient?.name}</td>
                <td className="p-2 text-right text-[10px] text-zinc-400 font-medium uppercase">
                  {item.ingredient?.unit}
                </td>
                <td className="p-2 text-right font-mono text-sm font-black text-zinc-900">
                  <span className={item.quantity <= 0 ? "text-red-500" : "text-zinc-900"}>{item.quantity}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
