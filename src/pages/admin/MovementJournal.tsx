import { useState, useEffect } from "react";
import { History, FileText, Calculator, ArrowRightLeft, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function MovementJournal() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMovements(); }, []);

  const fetchMovements = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("stock_movements")
      .select(`*, ingredient:ingredients(name), location:locations(name)`)
      .order("created_at", { ascending: false });
    setMovements(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any)
        .from("stock_movements")
        .delete()
        .eq("id", id);
      toast.success("ЗАПИСЬ УДАЛЕНА");
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleClearAll = async () => {
    try {
      await (supabase as any)
        .from("stock_movements")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      toast.success("ЖУРНАЛ ОЧИЩЕН");
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  // Фильтрация по типам документов
  const invoices = movements.filter(m => m.type === "MIGO_101"); // Приходы по фактурам
  const inventoryDox = movements.filter(m => m.type === "MI07_COUNT"); // Инвентаризация
  const transfers = movements.filter(m => m.type === "MB1B_311"); // Перемещения

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "MIGO_101":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ПРИХОД</Badge>;
      case "MI07_COUNT":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">ИНВЕНТАРИЗАЦИЯ</Badge>;
      case "MB1B_311":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">ПЕРЕМЕЩЕНИЕ</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 p-4 font-sans uppercase">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <History className="text-amber-500" size={24} />
          <h1 className="text-xl font-black text-white italic">MB51: Журнал документов</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchMovements} variant="outline" size="sm" className="font-black text-[10px]">
            ОБНОВИТЬ
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-black text-[10px]">
                <Trash2 size={14} className="mr-1" /> ОЧИСТИТЬ ВСЁ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Очистить весь журнал?</AlertDialogTitle>
                <AlertDialogDescription>
                  Все записи будут удалены. Это действие необратимо.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-red-600">
                  Очистить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 p-1 mb-6">
          <TabsTrigger value="all" className="text-[10px] font-bold">ВСЕ ОПЕРАЦИИ ({movements.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="text-[10px] font-bold flex gap-2">
            <FileText size={14}/> ПРИХОДЫ ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-[10px] font-bold flex gap-2">
            <Calculator size={14}/> ИНВЕНТАРИЗАЦИИ ({inventoryDox.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-[10px] font-bold flex gap-2">
            <ArrowRightLeft size={14}/> ПЕРЕМЕЩЕНИЯ ({transfers.length})
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
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-20 text-zinc-500">
          НЕТ ЗАПИСЕЙ
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-b border-white/10">
              <TableHead className="text-[10px] font-bold pl-4">Дата / Время</TableHead>
              <TableHead className="text-[10px] font-bold">Материал</TableHead>
              <TableHead className="text-right text-[10px] font-bold">Количество</TableHead>
              <TableHead className="text-center text-[10px] font-bold">Склад</TableHead>
              <TableHead className="text-[10px] font-bold">Тип</TableHead>
              <TableHead className="text-[10px] font-bold">Документ / ИНН</TableHead>
              <TableHead className="text-center text-[10px] font-bold pr-4">Действия</TableHead>
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
                <TableCell>{getTypeBadge(m.type)}</TableCell>
                <TableCell className="pr-4">
                  <div className="text-[11px] text-zinc-300 font-bold">{m.reference}</div>
                  {m.vendor_inn && <div className="text-[9px] text-indigo-400 font-black">ИНН: {m.vendor_inn}</div>}
                </TableCell>
                <TableCell className="text-center pr-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Запись будет удалена из журнала.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-red-600">
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}