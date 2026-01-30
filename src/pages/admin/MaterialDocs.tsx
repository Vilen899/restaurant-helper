import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Package, Receipt, AlertCircle, Loader2, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
// Вставь это в начало MaterialDocs.tsx (внутри return, над заголовком)
<div className="flex gap-4 mb-8 bg-zinc-900/50 p-4 border border-white/10">
  <Button onClick={() => navigate("/admin/migo")} className="bg-emerald-600 text-[10px] font-black">
    + ПРИХОД (MIGO)
  </Button>
  <Button onClick={() => navigate("/admin/transfer")} className="bg-blue-600 text-[10px] font-black">
    ↔ ПЕРЕМЕЩЕНИЕ
  </Button>
  <Button onClick={() => navigate("/admin/inventory-check")} className="bg-amber-600 text-[10px] font-black">
    ! ИНВЕНТАРКА
  </Button>
</div>;
export default function MaterialDocs() {
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("material_documents")
        .select("*, location:locations(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error: any) {
      console.error("Ошибка запроса:", error);
      toast.error("ОШИБКА БАЗЫ ДАННЫХ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (doc: any) => {
    try {
      const { data, error } = await (supabase as any)
        .from("material_document_items")
        .select(`*, ingredient:ingredients(name)`)
        .eq("doc_id", doc.id);

      if (error) throw error;
      setSelectedDoc({ ...doc, items: data });
    } catch (error: any) {
      toast.error("ОШИБКА ЗАГРУЗКИ ПОЗИЦИЙ: " + error.message);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      // Удаляем позиции документа
      await (supabase as any).from("material_document_items").delete().eq("doc_id", docId);

      // Удаляем документ
      await (supabase as any).from("material_documents").delete().eq("id", docId);

      toast.success("ДОКУМЕНТ УДАЛЁН");
      setSelectedDoc(null);
      fetchDocs();
    } catch (error: any) {
      toast.error("ОШИБКА УДАЛЕНИЯ: " + error.message);
    }
  };

  return (
    <div className="p-6 bg-[#050505] min-h-screen text-zinc-300 font-sans uppercase">
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Receipt className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter">АРХИВ ДОКУМЕНТОВ</h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em]">СИСТЕМА УЧЕТА ДВИЖЕНИЯ ТОВАРА</p>
          </div>
        </div>
        <button
          onClick={fetchDocs}
          className="text-[10px] border border-white/10 px-4 py-2 hover:bg-white/5 transition-colors font-black"
        >
          ОБНОВИТЬ ДАННЫЕ
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ЛЕВАЯ ЧАСТЬ: СПИСОК ФАКТУР */}
        <div className="col-span-5 space-y-3 overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center py-20 text-zinc-600 gap-3">
              <Loader2 className="animate-spin" size={30} />
              <p className="text-[10px] font-black">СИНХРОНИЗАЦИЯ С БАЗОЙ...</p>
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center py-20 border border-dashed border-white/10 text-zinc-500 gap-4">
              <AlertCircle size={40} strokeWidth={1} />
              <div className="text-center">
                <p className="text-xs font-black">В ТАБЛИЦЕ MATERIAL_DOCUMENTS ПУСТО</p>
                <p className="text-[9px] mt-1 opacity-50">ПРОВЕДИТЕ ПРИХОД ЧЕРЕЗ MIGO</p>
              </div>
            </div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => loadDetails(doc)}
                className={`p-5 border transition-all cursor-pointer relative overflow-hidden group ${
                  selectedDoc?.id === doc.id
                    ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30"
                    : "bg-zinc-900/40 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-sm ${
                      doc.type === "MIGO_101" ? "bg-blue-600 text-white" : "bg-amber-600 text-white"
                    }`}
                  >
                    {doc.type}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(doc.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-base font-black text-white italic tracking-tight">
                      № {doc.doc_number || "Б/Н"}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">ИНН: {doc.vendor_inn || "---"}</p>
                    {doc.supplier_name && <p className="text-[10px] text-emerald-500 font-bold">{doc.supplier_name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-600 mb-1">ИТОГО</p>
                    <p className="text-lg font-black text-emerald-500 tabular-nums">
                      {Number(doc.total_amount).toLocaleString()} ₸
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ПРАВАЯ ЧАСТЬ: ДЕТАЛИЗАЦИЯ */}
        <div className="col-span-7">
          {selectedDoc ? (
            <Card className="bg-zinc-900/20 border-white/10 rounded-none overflow-hidden border-t-2 border-t-emerald-500">
              <CardHeader className="bg-zinc-900/80 p-6 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Package className="text-emerald-500" size={20} />
                    <CardTitle className="text-sm font-black text-white italic">СОДЕРЖАНИЕ ДОКУМЕНТА</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8 text-[10px] font-black">
                          <Trash2 size={14} className="mr-1" /> УДАЛИТЬ
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-900 border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Удалить документ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Документ и все его позиции будут удалены. Это действие необратимо.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-zinc-800 border-white/10">Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDoc(selectedDoc.id)}
                            className="bg-red-600 hover:bg-red-500"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-b border-white/5 h-12">
                      <TableHead className="text-[10px] font-black text-zinc-400 pl-6">НАИМЕНОВАНИЕ</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-zinc-400">КОЛ-ВО</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-zinc-400">ЦЕНА</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-zinc-400 pr-6">СУММА</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDoc.items?.map((item: any) => (
                      <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-5 pl-6 text-[11px] font-black text-white uppercase italic">
                          {item.ingredient?.name || "МАТЕРИАЛ УДАЛЕН"}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-emerald-400">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-500 text-[11px]">
                          {Number(item.price).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-black text-white">
                          {(item.quantity * item.price).toLocaleString()} ₸
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* ФИНАЛЬНЫЙ ИТОГ В КАРТОЧКЕ */}
                <div className="p-8 bg-emerald-500/5 flex justify-between items-center border-t border-white/5">
                  <div>
                    <p className="text-[9px] font-black text-zinc-500">СТАТУС ПРОВОДКИ</p>
                    <p className="text-xs font-black text-emerald-500 uppercase">ПОДТВЕРЖДЕНО В БД</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-500 mb-1">ОБЩАЯ СУММА К ОПЛАТЕ</p>
                    <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">
                      {Number(selectedDoc.total_amount).toLocaleString()} ₸
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[60vh] border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-800 bg-zinc-900/5">
              <FileText size={60} strokeWidth={1} className="mb-4 opacity-10 text-white" />
              <p className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-500 animate-pulse text-center leading-relaxed">
                ОЖИДАНИЕ ВЫБОРА ДОКУМЕНТА
                <br />
                ДЛЯ ДЕТАЛИЗАЦИИ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
