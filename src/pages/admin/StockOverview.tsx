import { useState, useEffect, useMemo } from "react";
import { Box, Search, RefreshCcw, Database, ArrowUpDown } from "lucide-react";
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    const { data: inv } = await supabase.from("inventory").select(`
      id, 
      quantity, 
      location_id,
      ingredient:ingredients(name, unit:units(abbreviation)), 
      location:locations(name)
    `);
    
    setLocations(locs || []);
    setInventory(inv || []);
    setLoading(false);
  };

  // Фильтрация данных
  const filteredData = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLoc = selectedLoc === "all" || item.location_id === selectedLoc;
      return matchesSearch && matchesLoc;
    });
  }, [inventory, searchTerm, selectedLoc]);

  return (
    <div className="min-h-screen bg-black text-white font-mono uppercase p-6">
      {/* HEADER SAP STYLE */}
      <div className="flex justify-between items-center bg-zinc-900 p-6 border-b-4 border-indigo-600 mb-8 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <Database className="text-indigo-500" size={32} />
            <h1 className="text-4xl font-black tracking-tighter italic">MMBE: STOCK OVERVIEW</h1>
          </div>
          <p className="text-zinc-500 text-sm mt-2 font-bold tracking-[0.2em]">Обзор запасов материалов | SAP HANA Cloud</p>
        </div>
        <Button 
          onClick={fetchData} 
          variant="outline" 
          className="h-16 px-8 border-2 border-zinc-700 hover:bg-zinc-800 rounded-none text-xl font-bold"
        >
          <RefreshCcw className={`mr-4 ${loading ? 'animate-spin' : ''}`} /> ОБНОВИТЬ (F5)
        </Button>
      </div>

      {/* FILTERS AREA */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        <div className="col-span-8 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={24} />
          <Input 
            placeholder="ПОИСК МАТЕРИАЛА (НАЗВАНИЕ / КОД)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-20 pl-16 bg-zinc-900 border-2 border-zinc-800 text-2xl font-black rounded-none focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="col-span-4">
          <Select value={selectedLoc} onValueChange={setSelectedLoc}>
            <SelectTrigger className="h-20 bg-zinc-900 border-2 border-zinc-800 text-xl font-black rounded-none text-indigo-400">
              <SelectValue placeholder="ВСЕ СКЛАДЫ" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
              <SelectItem value="all" className="text-xl font-bold">ВСЕ ЛОКАЦИИ</SelectItem>
              {locations.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-xl font-bold uppercase">{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border-2 border-zinc-800 bg-[#0a0a0a] shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900">
            <TableRow className="border-b-2 border-zinc-800 h-16">
              <TableHead className="text-zinc-400 font-black text-lg pl-8">МАТЕРИАЛ (MATERIAL DESCRIPTION)</TableHead>
              <TableHead className="text-zinc-400 font-black text-lg text-center">СВОБОДНЫЙ ЗАПАС</TableHead>
              <TableHead className="text-zinc-400 font-black text-lg text-center">ЕД. ИЗМ.</TableHead>
              <TableHead className="text-zinc-400 font-black text-lg text-center">СКЛАД (S-LOC)</TableHead>
              <TableHead className="text-zinc-400 font-black text-lg text-right pr-8">СТАТУС</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? filteredData.map((item, idx) => (
              <TableRow key={idx} className="border-b border-zinc-900 h-24 hover:bg-zinc-900/30 transition-colors">
                <TableCell className="pl-8">
                  <div className="text-2xl font-black text-zinc-100">{item.ingredient?.name}</div>
                  <div className="text-xs text-zinc-600 mt-1">ID: {item.id.split('-')[0]}</div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-4xl font-black ${item.quantity <= 0 ? 'text-red-600' : 'text-emerald-500'}`}>
                    {Number(item.quantity).toFixed(3)}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xl font-bold text-zinc-500 uppercase italic">
                  {item.ingredient?.unit?.abbreviation}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-indigo-900/40 text-indigo-400 border-2 border-indigo-900/50 px-4 py-2 text-lg rounded-none font-black italic">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <div className={`h-4 w-4 rounded-full ml-auto ${item.quantity > 5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-600 animate-pulse'}`} />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center text-zinc-700 text-2xl font-black italic">
                  МАТЕРИАЛЫ НЕ НАЙДЕНЫ / СКЛАД ПУСТ
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* FOOTER STATS */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-zinc-900 p-6 border-l-4 border-emerald-500">
          <p className="text-zinc-500 text-xs font-bold">ВСЕГО ПОЗИЦИЙ</p>
          <p className="text-3xl font-black">{filteredData.length}</p>
        </div>
        <div className="bg-zinc-900 p-6 border-l-4 border-indigo-500">
          <p className="text-zinc-500 text-xs font-bold">СКЛАДОВ АКТИВНО</p>
          <p className="text-3xl font-black">{locations.length}</p>
        </div>
      </div>
    </div>
  );
}
