import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Store, Calendar, Box, ArrowDownLeft, ArrowUpRight, Calculator } from "lucide-react";

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
    <div className="p-6 bg-[#09090b] min-h-screen text-zinc-100 font-sans">
      {/* ВЕРХНЯЯ ПАНЕЛЬ С ГЛЯНЦЕВЫМ ЭФФЕКТОМ */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Box size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-white">Складской Хаб</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
              Мониторинг остатков и трафика
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-zinc-500 uppercase ml-1">Локация</span>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs font-bold rounded-lg h-10 px-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-zinc-500 uppercase ml-1">Период</span>
            <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 h-10 px-2">
              <input
                type="date"
                value={dates.from}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                className="bg-transparent text-xs font-bold outline-none text-zinc-300"
              />
              <span className="mx-2 text-zinc-600">—</span>
              <input
                type="date"
                value={dates.to}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                className="bg-transparent text-xs font-bold outline-none text-zinc-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-zinc-500 uppercase ml-1">Поиск</span>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-zinc-500" size={14} />
              <input
                placeholder="Найти товар..."
                className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-xs font-bold rounded-lg h-10 w-44 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ТАБЛИЦА СТЕКЛЯННАЯ */}
      <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-700">
              <th className="text-left p-4 text-[11px] font-black uppercase text-zinc-400 tracking-widest">
                Номенклатура
              </th>
              <th className="text-right p-4 text-[11px] font-black uppercase text-emerald-500 tracking-widest">
                Приход
              </th>
              <th className="text-right p-4 text-[11px] font-black uppercase text-red-500 tracking-widest">Расход</th>
              <th className="text-right p-4 text-[11px] font-black uppercase text-amber-500 tracking-widest underline underline-offset-8">
                Фактический Остаток
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors group h-14">
                <td className="p-4 uppercase">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-500 transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-black tracking-tighter">SKU-ING-{i + 100}</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center gap-1.5 text-emerald-500 font-mono text-xs font-bold bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">
                    <ArrowUpRight size={12} /> {item.received}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center gap-1.5 text-red-500 font-mono text-xs font-bold bg-red-500/5 px-2 py-1 rounded-md border border-red-500/10">
                    <ArrowDownLeft size={12} /> {item.sold}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="text-lg font-mono font-black text-white bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700 shadow-inner">
                    {item.current} <span className="text-[10px] text-zinc-500 ml-1">{item.unit}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ФУТЕР-ИНФО */}
      <div className="mt-6 flex items-center justify-between px-2">
        <div className="flex items-center gap-4 text-zinc-600">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Система синхронизирована</span>
          </div>
        </div>
        <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em]">Smart Inventory Pro v2.0</p>
      </div>
    </div>
  );
}
