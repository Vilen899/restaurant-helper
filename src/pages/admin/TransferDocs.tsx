import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Eye, Trash2, Loader2, RotateCcw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TransferDocs() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transfers")
        .select(`*, from_location:locations!transfers_from_location_id_fkey(name), to_location:locations!transfers_to_location_id_fkey(name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (doc: any) => {
    try {
      const { data, error } = await supabase
        .from("transfer_items")
        .select(`*, ingredient:ingredients(name, unit:units(abbreviation))`)
        .eq("transfer_id", doc.id);

      if (error) throw error;
      setItems(data || []);
      setSelectedDoc(doc);
      setDetailsOpen(true);
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleDeleteWithRollback = async (doc: any) => {
    try {
      // Получаем позиции для отката
      const { data: transferItems } = await supabase
        .from("transfer_items")
        .select("*")
        .eq("transfer_id", doc.id);

      // Откатываем остатки: возвращаем на исходный склад, снимаем с целевого
      for (const item of transferItems || []) {
        // Вернуть на from_location
        await (supabase as any).rpc('increment_inventory', {
          loc_id: doc.from_location_id,
          ing_id: item.ingredient_id,
          val: item.quantity
        });
        // Снять с to_location
        await (supabase as any).rpc('increment_inventory', {
          loc_id: doc.to_location_id,
          ing_id: item.ingredient_id,
          val: -item.quantity
        });
      }

      // Удаляем позиции
      await supabase
        .from("transfer_items")
        .delete()
        .eq("transfer_id", doc.id);

      // Удаляем документ
      await supabase
        .from("transfers")
        .delete()
        .eq("id", doc.id);

      // Удаляем записи из stock_movements
      await (supabase as any)
        .from("stock_movements")
        .delete()
        .eq("reference", `TO_${doc.to_location?.name || doc.to_location_id}`);

      toast.success("ПЕРЕМЕЩЕНИЕ ОТМЕНЕНО, ОСТАТКИ ВОССТАНОВЛЕНЫ");
      setDetailsOpen(false);
      fetchTransfers();
    } catch (error: any) {
      toast.error("ОШИБКА ОТКАТА: " + error.message);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (filterStatus === "all") return true;
    return t.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ВЫПОЛНЕН</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">ОЖИДАЕТ</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">В ПУТИ</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">ОТМЕНЁН</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6 bg-[#050505] min-h-screen text-zinc-300 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3">
            <ArrowRightLeft className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              ДОКУМЕНТЫ ПЕРЕМЕЩЕНИЙ
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-widest">MB1B_311 • МЕЖСКЛАДСКИЕ ПЕРЕНОСЫ</p>
          </div>
        </div>
        <Button onClick={fetchTransfers} variant="outline" size="sm" className="font-black text-[10px]">
          ОБНОВИТЬ
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-zinc-900 border-white/10 font-bold uppercase">
            <SelectValue placeholder="ВСЕ СТАТУСЫ" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            <SelectItem value="all">ВСЕ СТАТУСЫ</SelectItem>
            <SelectItem value="completed">ВЫПОЛНЕН</SelectItem>
            <SelectItem value="pending">ОЖИДАЕТ</SelectItem>
            <SelectItem value="in_transit">В ПУТИ</SelectItem>
            <SelectItem value="cancelled">ОТМЕНЁН</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 text-right text-zinc-500 text-sm font-bold self-center">
          Найдено: <span className="text-blue-400">{filteredTransfers.length}</span> документов
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-b border-white/10">
              <TableHead className="text-[10px] font-black text-zinc-400 pl-4 uppercase">Дата</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">Откуда</TableHead>
              <TableHead className="text-center text-[10px] font-black text-zinc-400 uppercase"></TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">Куда</TableHead>
              <TableHead className="text-center text-[10px] font-black text-zinc-400 uppercase">Позиций</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">Статус</TableHead>
              <TableHead className="text-center text-[10px] font-black text-zinc-400 uppercase pr-4">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="animate-spin mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  НЕТ ДОКУМЕНТОВ ПЕРЕМЕЩЕНИЙ
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map(doc => (
                <TableRow key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                  <TableCell className="pl-4 text-[11px] font-mono text-zinc-400">
                    {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="font-bold text-red-400">{doc.from_location?.name}</TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="text-zinc-600" size={16} />
                  </TableCell>
                  <TableCell className="font-bold text-emerald-400">{doc.to_location?.name}</TableCell>
                  <TableCell className="text-center font-mono text-zinc-400">—</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell className="text-center pr-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadDetails(doc)}
                        className="h-7 w-7 p-0"
                      >
                        <Eye size={14} />
                      </Button>
                      {doc.status === 'completed' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-500 hover:text-amber-400">
                              <RotateCcw size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-white/10">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Отменить перемещение?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Документ будет удалён, а остатки вернутся на исходный склад.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteWithRollback(doc)} className="bg-amber-600">
                                Откатить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-400">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить без отката?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Документ будет удалён БЕЗ возврата остатков. Используйте откат (⟲) для восстановления.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              await supabase.from("transfer_items").delete().eq("transfer_id", doc.id);
                              await supabase.from("transfers").delete().eq("id", doc.id);
                              toast.success("УДАЛЕНО");
                              fetchTransfers();
                            }} className="bg-red-600">
                              Удалить
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
        <DialogContent className="bg-zinc-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white uppercase font-black">
              <ArrowRightLeft className="text-blue-500" />
              Детали перемещения
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-zinc-800/50 rounded-lg">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Откуда</p>
              <p className="text-red-400 font-bold text-lg">{selectedDoc?.from_location?.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Куда</p>
              <p className="text-emerald-400 font-bold text-lg">{selectedDoc?.to_location?.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Дата создания</p>
              <p className="text-white font-mono">{selectedDoc && new Date(selectedDoc.created_at).toLocaleString('ru-RU')}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Статус</p>
              {selectedDoc && getStatusBadge(selectedDoc.status)}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10">
                <TableHead className="text-[10px] uppercase">Товар</TableHead>
                <TableHead className="text-right text-[10px] uppercase">Количество</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} className="border-b border-white/5">
                  <TableCell className="font-bold text-white uppercase">
                    {item.ingredient?.name}
                    <span className="text-zinc-500 text-[10px] ml-2">{item.ingredient?.unit?.abbreviation}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-blue-400">
                    {item.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedDoc?.notes && (
            <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Примечание</p>
              <p className="text-zinc-300 text-sm">{selectedDoc.notes}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}