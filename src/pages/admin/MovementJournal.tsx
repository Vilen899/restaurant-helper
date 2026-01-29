import { useState, useEffect } from "react";
import { History, FileText, Calculator, ArrowRightLeft, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MovementJournal() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMovements(); }, []);

  const fetchMovements = async () => {
    const { data } = await supabase
      .from("stock_movements" as any)
      .select(`*, ingredient:ingredients(name), location:locations(name)`)
      .order("created_at", { ascending: false });
    setMovements(data || []);
    setLoading(false);
  };

  // Фильтрация по типам документов
  const invoices = movements.filter(m => m.type === "MIGO_101"); // Приходы по фактурам
  const inventoryDox = movements.filter(m => m.type === "MI07_COUNT"); // Инвентаризация
  const transfers = movements.filter(m => m.type === "MB1B_311"); // Перемещения

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 p-4 font-sans uppercase">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <History className="text-amber-500" size={24} />
        <h1 className="text-xl font-black text-white italic">MB51: Журнал документов</h1>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 p-1 mb-6">
          <TabsTrigger value="all" className="text-[10px] font-bold">ВСЕ ОПЕРАЦИИ</TabsTrigger>
          <TabsTrigger value="invoices" className="text-[10px] font-bold flex gap-2">
            <FileText size={14}/> ФАКТУРЫ (MIGO)
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-[10px] font-bold flex gap-2">
            <Calculator size={14}/> ИНВЕНТАРИЗАЦИИ
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-[10px] font-bold flex gap-2">
            <ArrowRightLeft size={14}/> ПЕРЕМЕЩЕНИЯ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">{renderTable(movements)}</TabsContent>
        <TabsContent value="invoices">{renderTable(invoices)}</TabsContent>
        <TabsContent value="inventory">{renderTable(inventoryDox)}</TabsContent>
        <TabsContent value="transfers">{renderTable(transfers)}</TabsContent>
      </Tabs>
    </div>
  );

  function renderTable(data: any[]) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-b border-white/10">
              <TableHead className="text-[10px] font-bold pl-4">Дата / Время</TableHead>
              <TableHead className="text-[10px] font-bold">Материал</TableHead>
              <TableHead className="text-[10px] font-bold text-right">Количество</TableHead>
              <TableHead className="text-[10px] font-bold text-center">Склад</TableHead>
              <TableHead className="text-[10px] font-bold pr-4">Документ / ИНН</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((m, idx) => (
              <TableRow key={idx} className="border-b border-white/5 h-12 hover:bg-white/5">
                <TableCell className="pl-4 text-[10px] font-mono text-zinc-500">
                  {new Date(m.created_at).toLocaleString('ru-RU')}
                </TableCell>
                <TableCell className="text-sm font-bold text-white uppercase italic">
                  {m.ingredient?.name}
                </TableCell>
                <TableCell className={`text-right font-mono font-bold ${m.quantity > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </TableCell>
                <TableCell className="text-center text-[10px] text-zinc-400 font-bold uppercase">
                  {m.location?.name}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="text-[11px] text-zinc-300 font-bold">{m.reference}</div>
                  {m.vendor_inn && <div className="text-[9px] text-indigo-400 font-black">ИНН: {m.vendor_inn}</div>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
