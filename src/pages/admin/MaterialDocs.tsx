import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, User, Package, ChevronRight } from "lucide-react";

export default function MaterialDocs() {
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    const { data } = await supabase
      .from("material_documents")
      .select(`*, location:locations(name)`)
      .order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const loadDetails = async (doc: any) => {
    const { data } = await supabase
      .from("material_document_items")
      .select(`*, ingredient:ingredients(name)`)
      .eq("doc_id", doc.id);
    setSelectedDoc({ ...doc, items: data });
  };

  return (
    <div className="p-6 bg-[#0c0c0c] min-h-screen text-zinc-300 font-sans uppercase">
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
        <FileText className="text-emerald-500" size={24} />
        <h1 className="text-xl font-black text-white italic">АРХИВ МАТЕРИАЛЬНЫХ ДОКУМЕНТОВ</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* СПИСОК ДОКУМЕНТОВ */}
        <div className="col-span-5 space-y-4">
          <h2 className="text-[10px] font-black text-zinc-500 tracking-widest mb-2">ПОСЛЕДНИЕ ОПЕРАЦИИ</h2>
          {docs.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => loadDetails(doc)}
              className={`p-4 border cursor-pointer transition-all ${
                selectedDoc?.id === doc.id 
                ? 'bg-emerald-600/10 border-emerald-500/50' 
                : 'bg-zinc-900/40 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-white italic">{doc.type} / {doc.doc_number}</span>
                <span className="text-[9px] text-zinc-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span>ИНН: {doc.vendor_inn || "---"}</span>
                <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-300 font-bold">{doc.location?.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ДЕТАЛИ ВЫБРАННОГО ДОКУМЕНТА */}
        <div className="col-span-7">
          {selectedDoc ? (
            <Card className="bg-zinc-900/20 border-white/10 rounded-none">
              <CardHeader className="border-b border-white/5 bg-zinc-900/50">
                <CardTitle className="text-sm font-black italic text-emerald-500">
                  СОСТАВ ДОКУМЕНТА: {selectedDoc.doc_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black py-4">МАТЕРИАЛ</TableHead>
                      <TableHead className="text-right text-[10px] font-black pr-6">КОЛИЧЕСТВО</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDoc.items?.map((item: any) => (
                      <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/5">
                        <TableCell className="py-4 text-xs font-bold text-white uppercase tracking-tight">
                          {item.ingredient?.name}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-bold text-emerald-400">
                          {item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-6 bg-emerald-500/5 flex justify-between items-center">
                   <span className="text-[10px] font-black text-zinc-500 uppercase">ИТОГО ПОЗИЦИЙ:</span>
                   <span className="text-lg font-black text-white italic">{selectedDoc.items?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-600 gap-3">
              <Package size={48} strokeWidth={1} />
              <p className="text-[10px] font-black tracking-[0.2em]">ВЫБЕРИТЕ ДОКУМЕНТ ДЛЯ ПРОСМОТРА</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
