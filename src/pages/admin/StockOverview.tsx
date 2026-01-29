import { useState, useEffect, useMemo } from "react";
import { Box, Search, RefreshCcw, Database, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StockOverview() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<string>("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    const { data: inv } = await supabase.from("inventory").select(`
      id, quantity, location_id,
      ingredient:ingredients(name, unit:units(abbreviation)), 
      location:locations(name)
    `);
    setLocations(locs || []);
    setInventory(inv || []);
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLoc = selectedLoc === "all" || item.location_id === selectedLoc;
      return matchesSearch && matchesLoc;
    });
  }, [inventory, searchTerm, selectedLoc]);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 font-sans p-4">
      {/* КОМПАКТНЫЙ ХЕДЕР */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-md">
            <Database className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight uppercase">MMBE: Обзор запасов</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Plant: ARM1 / Storage: ALL</p>
          </div>
        </div>
        <Button 
          onClick={fetchData} 
          variant="outline" 
          className="h-9 px-4 border-white/10 hover:bg-white/5 text-xs font-semibold rounded-md"
          disabled={loading}
        >
          <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> 
          ОБНОВИТЬ
        </Button>
      </div>

      {/* ПАНЕЛЬ ФИЛЬТРОВ */}
      <div className="flex gap-3 mb-6 bg-zinc-900/30 p-3 border border-white/5 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input 
            placeholder="Поиск материала по названию..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-10 bg-zinc-900/50 border-white/10 text-sm focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="w-64 h-10 bg-zinc-900/50 border-white/10 text-sm">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-zinc-500" />
              <SelectValue placeholder="Все склады" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">ВСЕ СКЛАДЫ</SelectItem>
            {locations.map(l => (
              <SelectItem key={l.id} value={l.id} className="uppercase text-xs">{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ТАБЛИЦА */}
      <div className="rounded-lg border border-white/10 bg-zinc-900/20 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-b border-white/10 h-10 hover:bg-transparent">
              <TableHead className="text-zinc-500 font-bold text-[11px] uppercase pl-4">Материал</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[11px] uppercase text-right">Свободный запас</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[11px] uppercase text-center">Ед. изм.</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[11px] uppercase text-center">Склад</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[11px] uppercase text-right pr-4 italic">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? filteredData.map((item, idx) => (
              <TableRow key={idx} className="border-b border-white/5 h-12 hover:bg-white/5 transition-colors">
                <TableCell className="pl-4">
                  <span className="text-sm font-semibold text-zinc-100">{item.ingredient?.name}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`text-sm font-mono font-bold ${item.quantity <= 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                    {Number(item.quantity).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{item.ingredient?.unit?.abbreviation}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-[9px] font-medium border-white/10 text-indigo-400 rounded-sm py-0 h-5">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className={`h-2 w-2 rounded-full ml-auto ${item.quantity > 5 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-600 text-sm italic">
                  Нет данных для отображения
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
