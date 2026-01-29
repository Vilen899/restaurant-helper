import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Package, Calendar, Landmark, ArrowRight } from "lucide-react";

export default function MaterialDocs() {
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    // Тянем заголовки документов и название склада
    const { data } = await supabase
      .from("material_documents")
      .select(`*, location:locations(name)`)
      .order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const loadDetails = async (doc: any) => {
    // Тянем позиции внутри конкретного документа + название товара
    const { data } = await supabase
      .from("material_document_items")
      .select(`*, ingredient:ingredients(name)`)
      .eq("doc_id", doc.id);
    setSelectedDoc({ ...doc, items: data });
  };

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen text-zinc-300 font-sans uppercase">
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
        <div className="bg-emerald-500/10 p-3 rounded-lg">
          <FileText className="text-emerald-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter">АРХИВ ДОКУМЕНТОВ</h1>
          <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em]">ПРОСМОТР ВСЕХ ОПЕРАЦИЙ (MIGO / MI01)</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* ЛЕВАЯ ЧАСТЬ: СПИСОК ДОКУМЕНТОВ */}
        <div className="col-span-5 space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
          {docs.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => loadDetails(doc)}
              className={`p-4 border transition-all duration-200 cursor-pointer group ${
                selectedDoc?.id === doc.id 
                ? 'bg-emerald-600/10 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                : 'bg-zinc-900/40 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] px-2 py-0.5 font-black rounded ${
                  doc.type === 'MIGO_101' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {doc.type}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">
                  {new Date(doc.created_at).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight underline decoration-white/10 underline-offset-4">
                    № {doc.doc_number || 'БЕЗ НОМЕРА'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-bold">СКЛАД: {doc.location?.name}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] text-zinc-500 font-black">СУММА:</p>
                   <p className="text-sm font-black text-emerald-500">{doc.total_amount?.toLocaleString() || 0} ₸</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ПРАВАЯ ЧАСТЬ: СОДЕРЖИМОЕ ПАПКИ */}
        <div className="col-span-7">
          {selectedDoc ? (
            <Card className="bg-zinc-900/30 border-white/10 rounded-none shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-zinc-900/60 p-6">
                <div className="flex justify-between items-center">
                   <CardTitle className="text-lg font-black italic text-white flex items-center gap-3">
                     <Landmark size={20} className="text-emerald-500" /> ДЕТАЛИЗАЦИЯ ПРОВОДКИ
                   </CardTitle>
                   <div className="text-right">
                     <p className="text-[9px] text-zinc-500">ПОСТАВЩИК (ИНН)</p>
                     <p className="text-xs font-black text-white">{selectedDoc.vendor_inn || "---"}</p>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black text-zinc-400 h-12">МАТЕРИАЛ / ИНГРЕДИЕНТ</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-zinc-400 h-12">КОЛ-ВО</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-zinc-400 h-12">ЦЕНА</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-zinc-400 h-12 pr-6">ИТОГО</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDoc.items?.map((item: any) => (
                      <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-5 text-xs font-black text-white uppercase tracking-tighter">
                          {item.ingredient?.name}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-emerald-400">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-400 text-xs">
                          {item.price?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-black text-white">
                          {(item.quantity * item.price).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="p-8 bg-emerald-500/5 flex justify-between items-center border-t border-white/5 mt-4">
                   <div>
                     <p className="text-[9px] font-black text-zinc-500 mb-1">ОБЩЕЕ КОЛ-ВО ПОЗИЦИЙ</p>
                     <p className="text-2xl font-black text-white italic tracking-tighter">{selectedDoc.items?.length || 0}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[9px] font-black text-emerald-500/70 mb-1 tracking-widest">ИТОГО К ВЫПЛАТЕ</p>
                     <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">{selectedDoc.total_amount?.toLocaleString() || 0} ₸</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[60vh] border border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-700 gap-4 bg-zinc-900/10">
              <div className="p-6 rounded-full bg-zinc-900/50 border border-white/5">
                <Package size={60} strokeWidth={1} />
              </div>
              <p className="text-[11px] font-black tracking-[0.3em] animate-pulse uppercase">ВЫБЕРИТЕ ДОКУМЕНТ ДЛЯ ИНСПЕКЦИИ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
