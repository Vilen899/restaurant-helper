import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Eye, Trash2, Loader2, RefreshCcw, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const fetchStocktakings = async () => {
    setLoading(true);
    try {
      // ИСПРАВЛЕНО: Убрана опечатка в запросе
      const { data, error } = await (supabase.from("stocktaking_docs" as any) as any)
        .select(`*, location:locations(name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStocktakings(data || []);
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (doc: any) => {
    try {
      const { data, error } = await (supabase.from("stocktaking_items" as any) as any)
        .select(`*, ingredient:ingredients(name, unit)`)
        .eq("stocktaking_id", doc.id);

      if (error) throw error;
      setItems(data || []);
      setSelectedDoc(doc);
      setDetailsOpen(true);
    } catch (error: any) {
      toast.error("ОШИБКА ЗАГРУЗКИ ДЕТАЛЕЙ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот документ?")) return;
    try {
      await (supabase.from("stocktaking_docs" as any) as any).delete().eq("id", id);
      toast.success("Документ удален");
      fetchStocktakings();
    } catch (e: any) {
      toast.error("Ошибка удаления");
    }
  };

  return (
    <div className="p-4 bg-zinc-50 min-h-screen text-zinc-900 font-sans">
      {/* HEADER - Сделан компактнее */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 border rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-2 rounded-md">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase text-zinc-800">Журнал инвентаризаций (MI07)</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">История складских правок</p>
          </div>
        </div>
        <Button onClick={fetchStocktakings} variant="outline" size="sm" className="h-9 gap-2">
          <RefreshCcw size={14} /> Обновить
        </Button>
      </div>

      {/* TABLE - Компактные строки и средние шрифты */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="w-[180px] text-xs font-bold uppercase">Дата и время</TableHead>
              <TableHead className="text-xs font-bold uppercase">Склад / Локация</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Позиций</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Общая разница</TableHead>
              <TableHead className="text-center text-xs font-bold uppercase w-[120px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="animate-spin mx-auto text-zinc-400" />
                </TableCell>
              </TableRow>
            ) : stocktakings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-400 text-sm">
                  История пуста
                </TableCell>
              </TableRow>
            ) : (
              stocktakings.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-zinc-50 transition-colors">
                  <TableCell className="text-xs font-medium text-zinc-600">
                    {new Date(doc.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-bold text-zinc-800 uppercase text-sm">
                    {doc.location?.name || "Основной склад"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-zinc-700">{doc.total_items}</TableCell>
                  <TableCell
                    className={`text-right font-bold text-sm ${doc.total_difference >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {doc.total_difference > 0 ? `+${doc.total_difference}` : doc.total_difference}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-zinc-600"
                        onClick={() => loadDetails(doc)}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DETAILS DIALOG - Аккуратный средний размер */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-lg">
          <DialogHeader className="p-4 bg-zinc-900 text-white">
            <DialogTitle className="text-md font-bold uppercase flex items-center gap-2">
              <Calculator size={18} /> Детали подсчета: {selectedDoc?.location?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto p-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase">Материал</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Система</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Факт</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id} className="h-10">
                    <TableCell className="text-xs font-bold uppercase">{item.ingredient?.name}</TableCell>
                    <TableCell className="text-right text-xs text-zinc-500">{item.system_qty}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{item.fact_qty}</TableCell>
                    <TableCell
                      className={`text-right text-xs font-bold ${item.difference >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t bg-zinc-50 flex justify-end">
            <Button size="sm" onClick={() => setDetailsOpen(false)} className="h-9 px-6 bg-zinc-800">
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
