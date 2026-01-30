import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Eye, Trash2, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
      const { data, error } = await supabase
        .from("stocktakings")
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
      const { data, error } = await supabase
        .from("stocktaking_items")
        .select(`*, ingredient:ingredients(name, unit:units(abbreviation))`)
        .eq("stocktaking_id", doc.id);

      if (error) throw error;
      setItems(data || []);
      setSelectedDoc(doc);
      setDetailsOpen(true);
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await supabase
        .from("stocktaking_items")
        .delete()
        .eq("stocktaking_id", docId);

      await supabase
        .from("stocktakings")
        .delete()
        .eq("id", docId);

      toast.success("ИНВЕНТАРИЗАЦИЯ УДАЛЕНА");
      setDetailsOpen(false);
      fetchStocktakings();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  // Фильтруем позиции
  const plusItems = items.filter(i => i.difference > 0);
  const minusItems = items.filter(i => i.difference < 0);
  const zeroItems = items.filter(i => i.difference === 0);

  return (
    <div className="p-6 bg-[#050505] min-h-screen text-zinc-300 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-amber-600 p-3">
            <Calculator className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              ДОКУМЕНТЫ ИНВЕНТАРИЗАЦИИ
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-widest">MI07 • РЕЗУЛЬТАТЫ ПОДСЧЁТОВ</p>
          </div>
        </div>
        <Button onClick={fetchStocktakings} variant="outline" size="sm" className="font-black text-[10px]">
          ОБНОВИТЬ
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-lg">
          <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Всего инвентаризаций</p>
          <p className="text-3xl font-black text-white">{stocktakings.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
          <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">С излишками</p>
          <p className="text-3xl font-black text-emerald-400">
            {stocktakings.filter(s => s.surplus_count > 0).length}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
          <p className="text-[10px] text-red-400 uppercase font-bold mb-1">С недостачей</p>
          <p className="text-3xl font-black text-red-400">
            {stocktakings.filter(s => s.shortage_count > 0).length}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-b border-white/10">
              <TableHead className="text-[10px] font-black text-zinc-400 pl-4 uppercase">Дата</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">Склад</TableHead>
              <TableHead className="text-center text-[10px] font-black text-zinc-400 uppercase">Позиций</TableHead>
              <TableHead className="text-center text-[10px] font-black text-emerald-400 uppercase">Излишки</TableHead>
              <TableHead className="text-center text-[10px] font-black text-red-400 uppercase">Недостача</TableHead>
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
            ) : stocktakings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  НЕТ ДОКУМЕНТОВ ИНВЕНТАРИЗАЦИИ
                </TableCell>
              </TableRow>
            ) : (
              stocktakings.map(doc => (
                <TableRow key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                  <TableCell className="pl-4 text-[11px] font-mono text-zinc-400">
                    {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="font-bold text-white">{doc.location?.name}</TableCell>
                  <TableCell className="text-center font-mono text-zinc-400">{doc.total_items}</TableCell>
                  <TableCell className="text-center">
                    {doc.surplus_count > 0 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        <TrendingUp size={12} className="mr-1" /> +{doc.surplus_count}
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {doc.shortage_count > 0 ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                        <TrendingDown size={12} className="mr-1" /> -{doc.shortage_count}
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                      {doc.status === 'completed' ? 'ПРОВЕДЁН' : doc.status}
                    </Badge>
                  </TableCell>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-400">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить инвентаризацию?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Документ и все его позиции будут удалены.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-red-600">
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
        <DialogContent className="bg-zinc-900 border-white/10 max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white uppercase font-black">
              <Calculator className="text-amber-500" />
              Инвентаризация: {selectedDoc?.location?.name}
              <span className="text-zinc-500 font-mono text-sm ml-2">
                {selectedDoc && new Date(selectedDoc.created_at).toLocaleDateString('ru-RU')}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-4 my-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
              <TrendingUp className="mx-auto text-emerald-400 mb-1" size={20} />
              <p className="text-2xl font-black text-emerald-400">{plusItems.length}</p>
              <p className="text-[10px] uppercase text-emerald-400/70">Излишки</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
              <TrendingDown className="mx-auto text-red-400 mb-1" size={20} />
              <p className="text-2xl font-black text-red-400">{minusItems.length}</p>
              <p className="text-[10px] uppercase text-red-400/70">Недостача</p>
            </div>
            <div className="bg-zinc-800 border border-white/10 p-3 rounded-lg text-center">
              <Minus className="mx-auto text-zinc-400 mb-1" size={20} />
              <p className="text-2xl font-black text-zinc-400">{zeroItems.length}</p>
              <p className="text-[10px] uppercase text-zinc-500">Без расхождений</p>
            </div>
          </div>

          {/* MINUS ITEMS */}
          {minusItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-black text-red-400 uppercase mb-2 flex items-center gap-2">
                <TrendingDown size={16} /> Недостача ({minusItems.length})
              </h3>
              <div className="border border-red-500/20 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-red-500/10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase">Товар</TableHead>
                      <TableHead className="text-center text-[10px] uppercase">Система</TableHead>
                      <TableHead className="text-center text-[10px] uppercase">Факт</TableHead>
                      <TableHead className="text-right text-[10px] uppercase">Разница</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {minusItems.map(item => (
                      <TableRow key={item.id} className="border-b border-red-500/10">
                        <TableCell className="font-bold text-white">
                          {item.ingredient?.name}
                          <span className="text-zinc-500 text-[10px] ml-2">{item.ingredient?.unit?.abbreviation}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-400">{item.system_quantity}</TableCell>
                        <TableCell className="text-center font-mono text-white">{item.actual_quantity}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-400">{item.difference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* PLUS ITEMS */}
          {plusItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-black text-emerald-400 uppercase mb-2 flex items-center gap-2">
                <TrendingUp size={16} /> Излишки ({plusItems.length})
              </h3>
              <div className="border border-emerald-500/20 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-emerald-500/10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase">Товар</TableHead>
                      <TableHead className="text-center text-[10px] uppercase">Система</TableHead>
                      <TableHead className="text-center text-[10px] uppercase">Факт</TableHead>
                      <TableHead className="text-right text-[10px] uppercase">Разница</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plusItems.map(item => (
                      <TableRow key={item.id} className="border-b border-emerald-500/10">
                        <TableCell className="font-bold text-white">
                          {item.ingredient?.name}
                          <span className="text-zinc-500 text-[10px] ml-2">{item.ingredient?.unit?.abbreviation}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-400">{item.system_quantity}</TableCell>
                        <TableCell className="text-center font-mono text-white">{item.actual_quantity}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-400">+{item.difference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ZERO ITEMS */}
          {zeroItems.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-zinc-400 uppercase mb-2 flex items-center gap-2">
                <Minus size={16} /> Без расхождений ({zeroItems.length})
              </h3>
              <div className="border border-white/10 rounded-lg overflow-hidden max-h-40 overflow-auto">
                <Table>
                  <TableBody>
                    {zeroItems.map(item => (
                      <TableRow key={item.id} className="border-b border-white/5">
                        <TableCell className="text-zinc-400 text-sm">
                          {item.ingredient?.name}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-500">
                          {item.actual_quantity} {item.ingredient?.unit?.abbreviation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}