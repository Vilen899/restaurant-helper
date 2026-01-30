import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, ExternalLink, RefreshCcw, PackagePlus, ArrowLeftRight } from "lucide-react";
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
      // Запрашиваем остатки с именами материалов и складов
      const { data, error } = await (supabase as any).from("inventory").select(`
          quantity,
          location_id,
          ingredient_id,
          location:locations(name),
          ingredient:ingredients(name, unit)
        `);

      if (error) throw error;
      setStock(data || []);
    } catch (error: any) {
      console.error("ОШИБКА ЗАГРУЗКИ:", error);
      toast.error("ОШИБКА СИНХРОНИЗАЦИИ СКЛАДА");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ СКЛАДОМ (MIGO / TRANSFER) */}
      <div className="flex flex-wrap gap-3 mb-8 bg-zinc-900/30 p-4 border border-white/10 shadow-[4px_4px_0px_rgba(30,30,30,1)]">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 text-[11px] font-black h-12 px-8 rounded-none italic border-b-4 border-emerald-900 active:translate-y-1 active:border-b-0 transition-all"
        >
          <PackagePlus className="mr-2" size={18} /> ПРИХОД МАТЕРИАЛА (MIGO)
        </Button>

        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 text-[11px] font-black h-12 px-8 rounded-none italic border-b-4 border-blue-900 active:translate-y-1 active:border-b-0 transition-all"
        >
          <ArrowLeftRight className="mr-2" size={18} /> ПЕРЕМЕЩЕНИЕ (MB1B)
        </Button>

        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 hover:bg-zinc-700 text-[11px] font-black h-12 px-8 rounded-none italic border-b-4 border-zinc-950 active:translate-y-1 active:border-b-0 transition-all ml-auto"
        >
          <History className="mr-2" size={18} /> АРХИВ ДОКУМЕНТОВ
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2">
            <Package size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter leading-none">ТЕКУЩИЕ ОСТАТКИ (MMBE)</h1>
            <p className="text-[10px] text-zinc-500 mt-1 font-bold tracking-[0.3em]">STOCK MANAGEMENT TERMINAL</p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={fetchStock}
          className="border-white/10 bg-transparent h-10 text-[10px] font-black hover:bg-white/5 uppercase"
        >
          <RefreshCcw size={14} className={`mr-2 ${loading ? "animate-spin" : ""}`} /> ОБНОВИТЬ ДАННЫЕ
        </Button>
      </div>

      {/* ТАБЛИЦА ОПЕРАТИВНОГО УЧЕТА */}
      <div className="border border-white/10 rounded-none overflow-hidden bg-zinc-900/10">
        <Table>
          <TableHeader className="bg-zinc-900/90">
            <TableRow className="border-b border-white/10 h-14">
              <TableHead className="text-[11px] font-black text-zinc-400 pl-6 tracking-widest">
                СКЛАД / ЛОКАЦИЯ
              </TableHead>
              <TableHead className="text-[11px] font-black text-zinc-400 tracking-widest">
                МАТЕРИАЛ (НАИМЕНОВАНИЕ)
              </TableHead>
              <TableHead className="text-right text-[11px] font-black text-zinc-400 tracking-widest">
                ТЕКУЩИЙ ОСТАТОК
              </TableHead>
              <TableHead className="text-right text-[11px] font-black text-zinc-400 pr-6 tracking-widest">
                ДЕЙСТВИЯ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-64 text-center text-zinc-600 text-[12px] font-black italic tracking-[0.3em]"
                >
                  ЧТЕНИЕ ДАННЫХ ИЗ РЕГИСТРОВ...
                </TableCell>
              </TableRow>
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center text-zinc-600 text-[12px] font-black">
                  СКЛАД ПУСТ. ТРЕБУЕТСЯ ПРОВЕДЕНИЕ ПРИХОДА (MIGO_101)
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item, idx) => (
                <TableRow key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group h-14">
                  <TableCell className="text-[11px] font-bold text-zinc-500 pl-6 uppercase">
                    {item.location?.name || "ОСНОВНОЙ СКЛАД"}
                  </TableCell>
                  <TableCell className="text-sm font-black text-white italic group-hover:text-blue-400 transition-colors uppercase">
                    {item.ingredient?.name || "МАТЕРИАЛ НЕ ОПРЕДЕЛЕН"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-black text-base ${
                      Number(item.quantity) <= 0 ? "text-red-500" : "text-emerald-400"
                    }`}
                  >
                    {Number(item.quantity).toLocaleString()} {item.ingredient?.unit || "ШТ"}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/admin/material-log")}
                      className="h-8 text-[10px] font-black hover:bg-white hover:text-black border border-white/5 transition-all"
                    >
                      ЛОГ ДВИЖЕНИЯ <ExternalLink size={12} className="ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* НИЖНЯЯ ИНФО-ПАНЕЛЬ */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 p-4 border-l-4 border-blue-600">
          <p className="text-[9px] text-zinc-500 font-black mb-1">ВСЕГО ПОЗИЦИЙ</p>
          <p className="text-xl font-black italic">{stock.length}</p>
        </div>
        <div className="bg-zinc-900/50 p-4 border-l-4 border-emerald-600">
          <p className="text-[9px] text-zinc-500 font-black mb-1">СТАТУС СИСТЕМЫ</p>
          <p className="text-xl font-black italic text-emerald-500">READY</p>
        </div>
      </div>
    </div>
  );
}
