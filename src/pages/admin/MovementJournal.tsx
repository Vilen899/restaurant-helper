import { useState, useEffect } from "react";
import { History, Search, Filter, FileText, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MovementJournal() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stock_movements" as any)
      .select(`
        *,
        ingredient:ingredients(name),
        location:locations(name)
      `)
      .order("created_at", { ascending: false });
    
    setMovements(data || []);
    setLoading(false);
  };

  const filtered = movements.filter(m => 
    m.ingredient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.reference?.toLowerCase().includes(search.toLowerCase()) ||
    m.vendor_inn?.includes(search)
  );

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 font-sans p-4">
      {/* HEADER MB51 */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 p-2 rounded-md shadow-[0_0_15px_rgba(217,119,6,0.3)]">
            <History className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight uppercase">MB51: Журнал документов материалов</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Movement List / Audit Trail</p>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex gap-3 mb-6 bg-zinc-900/30 p-3 border border-white/5 rounded-lg items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input 
            placeholder="Поиск по материалу, ИНН или номеру накладной..." 
            value={search}
            onChange={(e) => setSearch(search)}
            className="h-10 pl-10 bg-zinc-900/50 border-white/10 text-sm focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="h-10 border-white/10 text-xs gap-2">
                <Calendar size={14} /> Период
            </Button>
            <Button variant="outline" className="h-10 border-white/10 text-xs gap-2">
                <FileText size={14} /> Экспорт
            </Button>
        </div>
      </div>

      {/* JOURNAL TABLE */}
      <div className="rounded-lg border border-white/10 bg-zinc-900/20 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-b border-white/10 h-10">
              <TableHead className="text-zinc-500 font-bold text-[10px] uppercase pl-4 w-40">Дата / Время</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[10px] uppercase w-24">Вид движ.</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[10px] uppercase">Материал</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-right">Количество</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-center">Склад</TableHead>
              <TableHead className="text-zinc-500 font-bold text-[10px] uppercase pr-4">Документ-ссылка / ИНН</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? filtered.map((m, idx) => (
              <TableRow key={idx} className="border-b border-white/5 h-12 hover:bg-white/5 transition-colors group">
                <TableCell className="pl-4 text-[11px] font-mono text-zinc-400">
                  {new Date(m.created_at).toLocaleString('ru-RU', { 
                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[9px] font-black border-none px-2 rounded-sm ${
                    m.type.includes('MIGO') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                  }`}>
                    {m.type === 'MIGO_101' ? (
                        <span className="flex items-center gap-1"><ArrowDownLeft size={10}/> 101</span>
                    ) : (
                        <span className="flex items-center gap-1"><ArrowUpRight size={10}/> 701</span>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-semibold text-zinc-100 uppercase">{m.ingredient?.name}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`text-sm font-mono font-bold ${m.quantity > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                    {m.quantity > 0 ? `+${Number(m.quantity).toFixed(3)}` : Number(m.quantity).toFixed(3)}
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold text-[10px] text-zinc-500">
                  {m.location?.name}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="text-[11px] text-zinc-400 font-medium">
                    {m.reference || '---'}
                  </div>
                  <div className="text-[9px] text-zinc-600">
                    {m.vendor_inn ? `ИНН: ${m.vendor_inn}` : 'Внутренняя операция'}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-600 text-sm italic">
                  Документы не найдены в базе данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* SUMMARY FOOTER */}
      <div className="mt-4 text-[10px] text-zinc-600 flex justify-between px-2 uppercase font-mono">
        <span>Найдено документов: {filtered.length}</span>
        <span>SAP HANA CLOUD | DATABASE AUDIT LOG</span>
      </div>
    </div>
  );
}
