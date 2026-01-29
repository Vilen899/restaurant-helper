import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Package, Landmark, Receipt } from "lucide-react";
import { toast } from "sonner";

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
      // Прямой запрос заголовков документов
      const { data, error } = await supabase
        .from("material_documents")
        .select('*')
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error: any) {
      toast.error("ОШИБКА ЗАГРУЗКИ СПИСКА: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (doc: any) => {
    try {
      // Загружаем товары внутри документа + название из таблицы ingredients
      const { data, error } = await supabase
        .from("material_document_items")
        .select(`*, ingredient:ingredients(name)`)
        .eq("doc_id", doc.id);

      if (error) throw error;
      setSelectedDoc({ ...doc, items: data });
    } catch (error: any) {
      toast.error("ОШИБКА ЗАГРУЗКИ ДЕТАЛЕЙ: " + error.message);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-zinc-300 font-sans uppercase">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
        <div className="bg-emerald-600 p-3 rounded-none">
          <Receipt className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter">АРХИВ ДОКУМЕНТОВ</h1>
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest">БАЗА ДАННЫХ ПРОВОДОК (MIGO / MI01)</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ЛЕВАЯ КОЛОНКА: СПИСОК ФАКТУР */}
        <div className="col-span-5 space-y-3 overflow-y-auto max-h-[70vh] pr-2">
          {docs.length === 0 && !loading && (
            <div className="text-center py-10 border border-dashed border-white/10 text-zinc-600 text-xs">
              ДОКУМЕНТОВ НЕ НАЙДЕНО
            </div>
          )}
          
          {docs.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => loadDetails(doc)}
              className={`p-4 border transition-all cursor-pointer ${
                selectedDoc?.id === doc.id 
                ? 'bg-emerald-500/10 border-emerald-500' 
                : 'bg-zinc-900/40 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5">
                  {doc.type}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-black text-white italic">№ {doc.doc_number}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">ИНН: {doc.vendor_inn || '---'}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-white leading-none">
                     {Number(doc.total_amount).toLocaleString()} ₸
                   </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ПРАВАЯ КОЛОНКА: ДЕТАЛИ */}
        <div className="col-span-7">
          {selectedDoc ? (
            <div className="bg-zinc-900/20 border border-white/10 p-0">
              <div className="p-6 border-b border-white/10 bg-zinc-900/50 flex justify-between items-center">
                <h2 className="text-sm font-black text-white italic">СОСТАВ ДОКУМЕНТА № {selectedDoc.doc_number}</h2>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 block">ИТОГО ПО ЧЕКУ:</span>
                  <span className="text-xl font-black text-emerald-500 italic">
                    {Number(selectedDoc.total_amount).toLocaleString()} ₸
                  </span>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-b border-white/5">
                    <TableHead className="text-[10px] font-black h-12">МАТЕРИАЛ</TableHead>
                    <TableHead className="text-center text-[10px] font-black h-12">КОЛ-ВО</TableHead>
                    <TableHead className="text-right text-[10px] font-black h-12 pr-6">СУММА</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDoc.items?.map((item: any) => (
                    <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/5">
                      <TableCell className="py-4 text-xs font-bold text-white uppercase">
                        {item.ingredient?.name || "НЕИЗВЕСТНО"}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-400">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-mono font-black text-white">
                        {(item.quantity * item.price).toLocaleString()} ₸
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/10">
              <Package size={40} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black tracking-widest uppercase">ВЫБЕРИТЕ ДОКУМЕНТ СЛЕВА</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
