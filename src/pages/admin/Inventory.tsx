import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, ExternalLink, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function InventoryDashboard() {
  const [stock, setStock] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    const { data } = await supabase.from("inventory").select(`
        quantity,
        location:locations(name),
        ingredient:ingredients(name, unit)
      `);
    setStock(data || []);
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h1 className="text-xl font-black italic flex items-center gap-3">
          <Package className="text-blue-500" /> ТЕКУЩИЕ ОСТАТКИ (MMBE)
        </h1>
        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-900 border border-white/10 hover:bg-white/5 text-[10px] font-black"
        >
          <History className="mr-2" size={14} /> ВЕСЬ АРХИВ ДОКУМЕНТОВ
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Карточки быстрой статистики */}
        <div className="bg-zinc-900/50 p-4 border border-white/5">
          <p className="text-[9px] text-zinc-500 font-black">ВСЕГО ПОЗИЦИЙ</p>
          <p className="text-2xl font-black italic text-white">{stock.length}</p>
        </div>
      </div>

      <div className="border border-white/10">
        <Table>
          <TableHeader className="bg-zinc-900">
            <TableRow>
              <TableHead className="text-[10px] font-black">СКЛАД</TableHead>
              <TableHead className="text-[10px] font-black">МАТЕРИАЛ</TableHead>
              <TableHead className="text-right text-[10px] font-black">ОСТАТОК</TableHead>
              <TableHead className="text-right text-[10px] font-black">ДЕЙСТВИЯ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((item, idx) => (
              <TableRow key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="text-[10px] font-bold text-zinc-400">{item.location?.name}</TableCell>
                <TableCell className="text-xs font-black text-white">{item.ingredient?.name}</TableCell>
                <TableCell
                  className={`text-right font-mono font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                >
                  {item.quantity} {item.ingredient?.unit}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin/material-log")}
                    className="h-7 text-[9px] font-black hover:text-blue-400"
                  >
                    ИСТОРИЯ <ExternalLink size={10} className="ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
