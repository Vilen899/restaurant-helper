import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Eye, Trash2, Loader2, TrendingUp, TrendingDown, Minus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function StocktakingDocs() {
  const [stocktakings, setStocktakings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchStocktakings();
  }, []);

  // 1. ИСПРАВЛЕНО: Таблица теперь соответствует созданной нами (stocktaking_docs)
  const fetchStocktakings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("stocktaking_docs" as any) as any)
        .select(`*, location:locations(name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStocktakings(data || []);
    } catch (error: any) {
      toast.error("ОШИБКА ЗАГРУЗКИ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. ИСПРАВЛЕНО: Загрузка деталей (если у тебя есть таблица stocktaking_items)
  // Если ты не создавал таблицу ITEMS, этот метод можно упростить или скрыть
  const loadDetails = async (doc: any) => {
    try {
      // Пытаемся загрузить позиции. Если таблицы нет - покажем просто инфо из заголовка
      const { data, error } = await (supabase.from("stocktaking_items" as any) as any)
        .select(`*, ingredient:ingredients(name, unit)`)
        .eq("stocktaking_id", doc.id);

      if (error) {
        console.warn("Позиции не найдены, показываем только заголовок");
        setItems([]);
      } else {
        setItems(data || []);
      }

      setSelectedDoc(doc);
      setDetailsOpen(true);
    } catch (error: any) {
      toast.error("ДЕТАЛИ НЕДОСТУПНЫ");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      // Удаляем связанные позиции (если есть)
      await (supabase.from("stocktaking_items" as any) as any).delete().eq("stocktaking_id", docId);
      // Удаляем сам документ
      const { error } = await (supabase.from("stocktaking_docs" as any) as any).delete().eq("id", docId);

      if (error) throw error;

      toast.success("ИНВЕНТАРИЗАЦИЯ УДАЛЕНА");
      setDetailsOpen(false);
      fetchStocktakings();
    } catch (error: any) {
      toast.error("ОШИБКА УДАЛЕНИЯ: " + error.message);
    }
  };

  // Расчёты для интерфейса
  const plusItems = items.filter((i) => i.difference > 0);
  const minusItems = items.filter((i) => i.difference < 0);

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 border-b-2 border-white pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3">
            <Calculator className="text-black" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter">ЖУРНАЛ MI07</h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em]">АРХИВ ПРОВЕДЁННЫХ ПОДСЧЁТОВ</p>
          </div>
        </div>
        <Button
          onClick={fetchStocktakings}
          className="bg-zinc-800 hover:bg-zinc-700 rounded-none h-12 font-black border-b-4 border-black"
        >
          <RefreshCcw className="mr-2" size={16} /> ОБНОВИТЬ СПИСОК
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CardSimple title="ВСЕГО ДОКУМЕНТОВ" value={stocktakings.length} color="white" />
        <CardSimple
          title="ПОСЛЕДНЯЯ ПРОВЕРКА"
          value={stocktakings[0] ? new Date(stocktakings[0].created_at).toLocaleDateString() : "—"}
          color="amber-500"
        />
        <CardSimple
          title="АКТИВНЫХ СКЛАДОВ"
          value={[...new Set(stocktakings.map((s) => s.location_id))].length}
          color="blue-500"
        />
      </div>

      {/* TABLE */}
      <div className="bg-zinc-900/30 border border-white/10 shadow-2xl">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="hover:bg-white border-none h-12">
              <TableHead className="text-black font-black pl-6">ДАТА</TableHead>
              <TableHead className="text-black font-black">СКЛАД</TableHead>
              <TableHead className="text-black font-black text-center">ПОЗИЦИЙ</TableHead>
              <TableHead className="text-black font-black text-right">РАЗНИЦА (СУММ)</TableHead>
              <TableHead className="text-black font-black text-center">ДЕЙСТВИЯ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center animate-pulse font-black text-zinc-500">
                  ЗАГРУЗКА РЕЕСТРА...
                </TableCell>
              </TableRow>
            ) : stocktakings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center italic text-zinc-600">
                  АРХИВ ПУСТ
                </TableCell>
              </TableRow>
            ) : (
              stocktakings.map((doc) => (
                <TableRow key={doc.id} className="border-b border-white/5 h-16 hover:bg-white/5 transition-all">
                  <TableCell className="pl-6 font-mono text-zinc-400">
                    {new Date(doc.created_at).toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="font-black italic text-lg tracking-tighter uppercase">
                    {doc.location?.name}
                  </TableCell>
                  <TableCell className="text-center font-black text-zinc-300">{doc.total_items}</TableCell>
                  <TableCell
                    className={`text-right font-mono font-black ${doc.total_difference > 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {doc.total_difference > 0 ? `+${doc.total_difference}` : doc.total_difference}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={() => loadDetails(doc)}
                        variant="ghost"
                        className="hover:bg-amber-500 hover:text-black rounded-none"
                      >
                        <Eye size={18} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="hover:bg-red-600 hover:text-white rounded-none">
                            <Trash2 size={18} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-2 border-white text-white rounded-none">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black italic uppercase text-2xl">
                              Удалить документ?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400 uppercase text-[10px] font-bold">
                              Это действие нельзя отменить. Данные о подсчете будут стёрты из истории.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-800 text-white rounded-none border-none">
                              ОТМЕНА
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.id)}
                              className="bg-red-600 text-white rounded-none font-black"
                            >
                              УДАЛИТЬ НАВСЕГДА
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DETAILS DIALOG */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-black border-2 border-white text-white rounded-none max-w-2xl">
          <DialogHeader className="border-b border-white/20 pb-4">
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">
              ДЕТАЛИ: {selectedDoc?.location?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-zinc-900 border border-white/10">
                <p className="text-[10px] font-black text-zinc-500">ОБЩАЯ РАЗНИЦА</p>
                <p className="text-2xl font-black font-mono">{selectedDoc?.total_difference}</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-white/10">
                <p className="text-[10px] font-black text-zinc-500">СТАТУС</p>
                <Badge className="bg-emerald-600 rounded-none">ВЫПОЛНЕНО</Badge>
              </div>
            </div>
            <p className="text-center text-zinc-600 italic text-sm">
              (Для просмотра построчных отклонений убедитесь, что таблица stocktaking_items заполнена)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Мини-компонент для карточек
function CardSimple({ title, value, color }: any) {
  return (
    <div className={`bg-zinc-900 border-l-4 border-${color} p-6 shadow-xl`}>
      <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-1">{title}</p>
      <p className="text-3xl font-black italic text-white tracking-tighter">{value}</p>
    </div>
  );
}
