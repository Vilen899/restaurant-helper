import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Store, Calendar, Box } from "lucide-react";

export default function InventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dates, setDates] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

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
    if (selectedLoc) loadData();
  }, [selectedLoc, dates]);

  const loadData = async () => {
    // 1. Текущий остаток
    const { data: inv } = await supabase
      .from("inventory")
      .select(`quantity, ingredient:ingredients(id, name, unit)`)
      .eq("location_id", selectedLoc);

    // 2. Движение за период (Приходы и Продажи)
    const { data: moves } = await supabase
      .from("material_docs")
      .select("*")
      .eq("location_id", selectedLoc)
      .gte("created_at", dates.from)
      .lte("created_at", dates.to + "T23:59:59");

    const combined = inv?.map((item: any) => {
      const id = item.ingredient?.id;
      const received =
        moves
          ?.filter((m) => m.ingredient_id === id && m.type === "receipt")
          .reduce((sum, m) => sum + Number(m.quantity), 0) || 0;
      const sold =
        moves
          ?.filter((m) => m.ingredient_id === id && m.type === "sale")
          .reduce((sum, m) => sum + Number(m.quantity), 0) || 0;

      return {
        name: item.ingredient?.name,
        unit: item.ingredient?.unit,
        received,
        sold,
        current: item.quantity,
      };
    });
    setStock(combined || []);
  };

  const filtered = stock.filter((item) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 bg-white min-h-screen text-zinc-800 font-sans">
      {/* ПАНЕЛЬ ФИЛЬТРОВ */}
      <div className="flex flex-wrap items-center gap-4 mb-6 border-b pb-4">
        <div className="flex items-center gap-2">
          <Box size={18} className="text-zinc-900" />
          <h1 className="text-sm font-black uppercase tracking-tighter">Складской учет</h1>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Точка:</span>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="text-xs border rounded h-8 px-2 bg-zinc-50 font-bold"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">С:</span>
            <input
              type="date"
              value={dates.from}
              onChange={(e) => setDates({ ...dates, from: e.target.value })}
              className="text-xs border rounded h-8 px-2 bg-zinc-50 font-bold"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">По:</span>
            <input
              type="date"
              value={dates.to}
              onChange={(e) => setDates({ ...dates, to: e.target.value })}
              className="text-xs border rounded h-8 px-2 bg-zinc-50 font-bold"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
            <input
              placeholder="Поиск..."
              className="pl-8 text-xs border rounded h-8 w-40 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ТАБЛИЦА */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-900 text-white">
            <th className="text-left p-2 text-[10px] font-bold uppercase tracking-widest">Товар</th>
            <th className="text-right p-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Приход (+)
            </th>
            <th className="text-right p-2 text-[10px] font-bold uppercase tracking-widest text-red-400">Расход (-)</th>
            <th className="text-right p-2 text-[10px] font-bold uppercase tracking-widest underline">
              Текущий остаток
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
            <tr key={i} className="border-b hover:bg-zinc-50 h-10 transition-colors">
              <td className="p-2 text-xs font-bold uppercase text-zinc-700">{item.name}</td>
              <td className="p-2 text-right text-xs font-bold text-emerald-600">
                {item.received > 0 ? `+${item.received}` : "0"}{" "}
                <span className="text-[9px] text-zinc-400">{item.unit}</span>
              </td>
              <td className="p-2 text-right text-xs font-bold text-red-500">
                {item.sold > 0 ? `-${item.sold}` : "0"} <span className="text-[9px] text-zinc-400">{item.unit}</span>
              </td>
              <td className="p-2 text-right">
                <span className="font-mono font-black text-sm bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  {item.current} {item.unit}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
