import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Store, Calendar, Box, ArrowDownLeft, ArrowUpRight } from "lucide-react";

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
    const { data: inv } = await supabase
      .from("inventory")
      .select(`quantity, ingredient:ingredients(id, name, unit)`)
      .eq("location_id", selectedLoc);

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
    <div className="p-4 bg-[#0c0c0e] min-h-screen text-zinc-300 font-sans">
      {/* КОМПАКТНАЯ ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-1.5 rounded">
            <Box size={16} className="text-black" />
          </div>
          <h1 className="text-xs font-black uppercase tracking-widest text-white">Склад</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Селектор - СРЕДНИЙ */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Точка:</span>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 text-[11px] font-bold rounded h-8 px-2 outline-none focus:border-amber-500/50 transition-all cursor-pointer"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Даты - СРЕДНИЕ */}
          <div className="flex items-center gap-2 border-l border-zinc-700 pl-3">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Период:</span>
            <input
              type="date"
              value={dates.from}
              onChange={(e) => setDates({ ...dates, from: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-[11px] font-bold rounded h-8 px-2 outline-none text-zinc-300 w-28"
            />
            <input
              type="date"
              value={dates.to}
              onChange={(e) => setDates({ ...dates, to: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-[11px] font-bold rounded h-8 px-2 outline-none text-zinc-300 w-28"
            />
          </div>

          {/* Поиск - СРЕДНИЙ */}
          <div className="relative border-l border-zinc-700 pl-3">
            <Search className="absolute left-5 top-2.5 text-zinc-500" size={12} />
            <input
              placeholder="Поиск..."
              className="pl-8 bg-zinc-800 border-zinc-700 text-zinc-200 text-[11px] font-bold rounded h-8 w-36 outline-none focus:border-amber-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ТАБЛИЦА КОМПАКТНАЯ */}
      <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 shadow-md overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-800/60 border-b border-zinc-700">
              <th className="text-left p-2.5 text-[9px] font-black uppercase text-zinc-500 tracking-wider">Товар</th>
              <th className="text-right p-2.5 text-[9px] font-black uppercase text-emerald-500 tracking-wider">
                Приход (+)
              </th>
              <th className="text-right p-2.5 text-[9px] font-black uppercase text-red-500 tracking-wider">
                Расход (-)
              </th>
              <th className="text-right p-2.5 text-[9px] font-black uppercase text-amber-500 tracking-wider font-bold underline decoration-amber-500/30 underline-offset-4">
                Остаток
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-white/[0.03] transition-colors group h-9">
                <td className="p-2 px-3 uppercase">
                  <span className="text-[11px] font-bold text-zinc-200 group-hover:text-amber-500 transition-colors tracking-tight">
                    {item.name}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <div className="inline-flex items-center gap-1 text-emerald-500 font-mono text-[11px] font-bold">
                    <ArrowUpRight size={10} className="opacity-50" /> {item.received}
                  </div>
                </td>
                <td className="p-2 text-right">
                  <div className="inline-flex items-center gap-1 text-red-500 font-mono text-[11px] font-bold">
                    <ArrowDownLeft size={10} className="opacity-50" /> {item.sold}
                  </div>
                </td>
                <td className="p-2 text-right px-3">
                  <span className="text-xs font-mono font-black text-white bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                    {item.current}{" "}
                    <span className="text-[9px] text-zinc-500 ml-0.5 font-normal uppercase">{item.unit}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ФУТЕР */}
      <div className="mt-3 flex items-center justify-between opacity-30 px-1">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Data Sync Active</span>
        <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Inventory Module 2.1</span>
      </div>
    </div>
  );
}
