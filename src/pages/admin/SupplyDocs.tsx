import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, FileText, Loader2, Trash2, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SupplyDocs() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchInn, setSearchInn] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("material_documents")
        .select('*, location:locations(name)')
        .eq("type", "MIGO_101")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (doc: any) => {
    try {
      const { data, error } = await (supabase as any)
        .from("material_document_items")
        .select(`*, ingredient:ingredients(name, unit:units(abbreviation))`)
        .eq("doc_id", doc.id);

      if (error) throw error;
      setSelectedDoc({ ...doc, items: data });
      setDetailsOpen(true);
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await (supabase as any)
        .from("material_document_items")
        .delete()
        .eq("doc_id", docId);

      await (supabase as any)
        .from("material_documents")
        .delete()
        .eq("id", docId);

      toast.success("ДОКУМЕНТ УДАЛЁН");
      setDetailsOpen(false);
      fetchDocs();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  // Уникальные поставщики
  const suppliers = [...new Set(docs.map(d => d.supplier_name).filter(Boolean))];

  // Фильтрация
  const filteredDocs = docs.filter(doc => {
    const matchInn = !searchInn || (doc.vendor_inn && doc.vendor_inn.includes(searchInn));
    const matchSupplier = filterSupplier === "all" || doc.supplier_name === filterSupplier;
    return matchInn && matchSupplier;
  });

  return (
    <div className="p-6 bg-[#050505] min-h-screen text-zinc-300 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3">
            <Truck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              ДОКУМЕНТЫ ПОСТАВОК
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-widest">MIGO_101 • ПРИХОДЫ ОТ ПОСТАВЩИКОВ</p>
          </div>
        </div>
        <Button onClick={fetchDocs} variant="outline" size="sm" className="font-black text-[10px]">
          ОБНОВИТЬ
        </Button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input
            placeholder="ПОИСК ПО ИНН..."
            value={searchInn}
            onChange={e => setSearchInn(e.target.value)}
            className="pl-10 bg-zinc-900 border-white/10 font-bold uppercase"
          />
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="bg-zinc-900 border-white/10 font-bold uppercase">
            <SelectValue placeholder="ВСЕ ПОСТАВЩИКИ" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            <SelectItem value="all">ВСЕ ПОСТАВЩИКИ</SelectItem>
            {suppliers.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-right text-zinc-500 text-sm font-bold self-center">
          Найдено: <span className="text-emerald-400">{filteredDocs.length}</span> документов
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-b border-white/10">
              <TableHead className="text-[10px] font-black text-zinc-400 pl-4 uppercase">Дата</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">№ Документа</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">ИНН</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">Поставщик</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase">Склад</TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400 uppercase">Сумма</TableHead>
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
            ) : filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  НЕТ ДОКУМЕНТОВ
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map(doc => (
                <TableRow key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                  <TableCell className="pl-4 text-[11px] font-mono text-zinc-400">
                    {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="font-bold text-white">{doc.doc_number || 'Б/Н'}</TableCell>
                  <TableCell className="font-mono text-indigo-400">{doc.vendor_inn || '—'}</TableCell>
                  <TableCell className="text-emerald-400 font-bold">{doc.supplier_name || '—'}</TableCell>
                  <TableCell className="text-zinc-400 text-[11px]">{doc.location?.name}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-white">
                    {Number(doc.total_amount).toLocaleString()} ₸
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
                            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Документ поставки будет удалён. Остатки не будут откатываться автоматически.
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
        <DialogContent className="bg-zinc-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white uppercase font-black">
              <Package className="text-emerald-500" />
              Документ № {selectedDoc?.doc_number || 'Б/Н'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-lg text-sm mb-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">ИНН ПОСТАВЩИКА</p>
              <p className="text-indigo-400 font-mono font-bold">{selectedDoc?.vendor_inn || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">ПОСТАВЩИК</p>
              <p className="text-emerald-400 font-bold">{selectedDoc?.supplier_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">СКЛАД</p>
              <p className="text-white">{selectedDoc?.location?.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">ДАТА</p>
              <p className="text-white font-mono">{selectedDoc && new Date(selectedDoc.created_at).toLocaleString('ru-RU')}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10">
                <TableHead className="text-[10px] uppercase">Товар</TableHead>
                <TableHead className="text-center text-[10px] uppercase">Кол-во</TableHead>
                <TableHead className="text-center text-[10px] uppercase">Цена</TableHead>
                <TableHead className="text-right text-[10px] uppercase">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDoc?.items?.map((item: any) => (
                <TableRow key={item.id} className="border-b border-white/5">
                  <TableCell className="font-bold text-white uppercase">
                    {item.ingredient?.name}
                    <span className="text-zinc-500 text-[10px] ml-2">{item.ingredient?.unit?.abbreviation}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-emerald-400">{item.quantity}</TableCell>
                  <TableCell className="text-center font-mono text-zinc-400">{item.price}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-white">
                    {(item.quantity * item.price).toLocaleString()} ₸
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-lg mt-4">
            <span className="text-zinc-400 uppercase text-sm font-bold">Итого:</span>
            <span className="text-2xl font-black text-emerald-400">
              {Number(selectedDoc?.total_amount || 0).toLocaleString()} ₸
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}