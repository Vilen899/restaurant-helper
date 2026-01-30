import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Eye, Trash2, Loader2, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
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

  useEffect(() => { fetchStocktakings(); }, []);

  const fetchStocktakings = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase.from("stocktaking_docs" as any) as any)
        .select(`*, location:locations(name)` swan)
        .order("created_at", { ascending: false });
      setStocktakings(data || []);
    } finally { setLoading(false); }
  };

  const loadDetails = async (doc: any) => {
    const { data } = await (supabase.from("stocktaking_items" as any) as any)
      .select(`*, ingredient:ingredients(name, unit)`)
      .eq("stocktaking_id", doc.id);
    setItems(data || []);
    setSelectedDoc(doc);
    setDetailsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("УДАЛИТЬ ДОКУМЕНТ?")) return;
    await (supabase.from("stocktaking_docs" as any) as any).delete().eq("id", id);
    toast.success("УДАЛЕНО");
    fetchStocktakings();
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      <div className="flex items-center justify-between mb-8 border-b-2 border-white pb-6">
        <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3">
          <Calculator className="text-amber-500" /> ЖУРНАЛ MI07
        </h1>
        <Button onClick={fetchStocktakings} className="bg-zinc-800 rounded-none h-10 font-black">
          <RefreshCcw size={16} />
        </Button>
      </div>

      <div className="border border-white/10 bg-zinc-900/20 shadow-2xl">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="hover:bg-white border-none">
              <TableHead className="text-black font-black pl-6 h-12">ДАТА</TableHead>
              <TableHead className="text-black font-black">СКЛАД</TableHead>
              <TableHead className="text-black font-black text-right">РАЗНИЦА</TableHead>
              <TableHead className="text-black font-black text-center">ДЕЙСТВИЯ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="h-40 text-center animate-pulse">ЗАГРУЗКА...</TableCell></TableRow> :
              stocktakings.map(doc => (
                <TableRow key={doc.id} className="border-b border-white/5 h-14 hover:bg-white/5">
                  <TableCell className="pl-6 font-mono text-zinc-500 text-xs">
                    {new Date(doc.created_at).toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell className="font-black italic uppercase text-lg">{doc.location?.name}</TableCell>
                  <TableCell className={`text-right font-mono font-black ${doc.total_difference >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {doc.total_difference > 0 ? `+${doc.total_difference}` : doc.total_difference}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-none border-white/20" onClick={() => loadDetails(doc)}><Eye size={14} /></Button>
                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0 rounded-none" onClick={() => handleDelete(doc.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-zinc-950 border border-white text-white max-w-2xl rounded-none">
          <DialogHeader><DialogTitle className="font-black italic uppercase text-xl border-b border-white/10 pb-2">
            ДЕТАЛИ СКЛАДА: {selectedDoc?.location?.name}
          </DialogTitle></DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="bg-zinc-900"><TableRow>
                <TableHead className="text-white text-[10px]">МАТЕРИАЛ</TableHead>
                <TableHead className="text-right text-white text-[10px]">ФАКТ</TableHead>
                <TableHead className="text-right text-white text-[10px]">РАЗНИЦА</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id} className="border-white/5">
                    <TableCell className="font-bold text-xs uppercase italic">{item.ingredient?.name}</TableCell>
                    <TableCell className="text-right font-mono text-white">{item.fact_qty}</TableCell>
                    <TableCell className={`text-right font-mono font-black ${item.difference >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}