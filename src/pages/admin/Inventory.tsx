import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, ExternalLink, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InventoryDashboard() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Используем (supabase as any), чтобы обойти ошибки типов в Lovable
      const { data, error } = await (supabase as any).from("inventory").select(`
          quantity,
          location:locations(name),
          ingredient:ingredients(name, unit)
        `);

      if (error) throw error;
      setStock(data || []);
    } catch (error: any) {
      console.error("ОШИБКА:", error);
      toast.error("НЕ УДАЛОСЬ ЗАГРУЗИТЬ ОСТАТКИ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2">
            <Package size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">ТЕКУЩИЕ ОСТАТКИ (MMBE)</h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchStock}
            className="border-white/10 bg-transparent h-9 text-[10px] font-black"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            onClick={() => navigate("/admin/material-docs")}
            className="bg-zinc-900 border border-white/10 hover:bg-white/5 text-[10px] font-black h-9 px-4"
          >
            <History className="mr-2" size={14} /> АРХИВ ДОКУМЕНТОВ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/40 p-5 border border-white/5">
          <p className="text-[9px] text-zinc-500 font-black tracking-widest mb-1">ВСЕГО ПОЗИЦИЙ НА СКЛАДЕ</p>
          <p className="text-3xl font-black italic text-white leading-none">{stock.length}</p>
        </div>
      </div>

      <div className="border border-white/5 rounded-sm overflow-hidden bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-b border-white/10 h-12">
              <TableHead className="text-[10px] font-black text-zinc-400 pl-6">СКЛАД / ЛОКАЦИЯ</TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400">МАТЕРИАЛ</TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400">ОСТАТОК</TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400 pr-6">АНАЛИТИКА</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 text-[10px] font-black">
                  СКАНИРОВАНИЕ БАЗЫ ДАННЫХ...
                </TableCell>
              </TableRow>
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 text-[10px] font-black">
                  СКЛАД ПУСТ. ПРОВЕДИТЕ MIGO_101
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item, idx) => (
                <TableRow key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="text-[10px] font-bold text-zinc-400 pl-6">
                    {item.location?.name || "ОСНОВНОЙ СКЛАД"}
                  </TableCell>
                  <TableCell className="text-xs font-black text-white italic group-hover:text-blue-400 transition-colors">
                    {item.ingredient?.name}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                  >
                    {Number(item.quantity).toLocaleString()} {item.ingredient?.unit}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/admin/material-log")}
                      className="h-7 text-[9px] font-black hover:bg-blue-600 hover:text-white border border-transparent hover:border-blue-400"
                    >
                      ИСТОРИЯ <ExternalLink size={10} className="ml-1 text-blue-500 group-hover:text-white" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
