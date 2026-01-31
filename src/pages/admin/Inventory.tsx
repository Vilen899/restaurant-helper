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
    // Используем any для обхода ошибки "excessively deep"
    const { data: inv } = await (supabase as any)
      .from("inventory")
      .select(`quantity, ingredient:ingredients(id, name, unit)`)
      .eq("location_id", selectedLoc);

    const { data: moves } = await (supabase as any)
      .from("material_docs")
      .select("*")
      .eq("location_id", selectedLoc)
      .gte("created_at", dates.from)
      .lte("created_at", dates.to + "T23:59:59");

    const combined = inv?.map((item: any) => {
      const id = item.ingredient?.id;
      // Явная типизация m: any чтобы не было ошибок Property does not exist
      const received =
        moves
          ?.filter((m: any) => m.ingredient_id === id && m.type === "receipt")
          .reduce((sum: number, m: any) => sum + Number(m.quantity), 0) || 0;
      const sold =
        moves
          ?.filter((m: any) => m.ingredient_id === id && m.type === "sale")
          .reduce((sum: number, m: any) => sum + Number(m.quantity), 0) || 0;

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-1.5 rounded">
            <Box size={16} className="text-black" />
          </div>
          <h1 className="text-xs font-black uppercase tracking-widest text-white">Склад</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Точка:</span>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 text-[11px] font-bold rounded h-8 px-2 outline-none focus:border-amber-500/50 cursor-pointer"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

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
              <th className="text-right p-2.5 text-[9px] font-black uppercase text-amber-500 tracking-wider font-bold underline underline-offset-4">
                Остаток
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-white/[0.03] transition-colors group h-9">
                <td className="p-2 px-3 uppercase text-[11px] font-bold text-zinc-200 group-hover:text-amber-500">
                  {item.name}
                </td>
                <td className="p-2 text-right text-emerald-500 font-mono text-[11px] font-bold">+{item.received}</td>
                <td className="p-2 text-right text-red-500 font-mono text-[11px] font-bold">-{item.sold}</td>
                <td className="p-2 text-right px-3 font-mono font-black text-white text-xs">
                  {item.current} <span className="text-[9px] text-zinc-500 font-normal uppercase">{item.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
