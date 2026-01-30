import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, ExternalLink, RefreshCcw, PackagePlus, ArrowLeftRight, ClipboardCheck } from "lucide-react";
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
      // Используем (supabase as any) и уточняем связи через двоеточие для корректной работы
      const { data, error } = await (supabase as any).from("inventory").select(`
          quantity,
          location:locations (
            name
          ),
          ingredient:ingredients (
            name,
            unit
          )
        `);

      if (error) {
        console.error("Детали ошибки Supabase:", error);
        throw error;
      }

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
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ (БЫСТРЫЕ КНОПКИ) */}
      <div className="flex flex-wrap gap-3 mb-8 bg-zinc-900/30 p-4 border border-white/10 rounded-sm">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black h-10 px-6 rounded-none italic shadow-[4px_4px_0px_rgba(0,0,0,1)]"
        >
          <PackagePlus className="mr-2" size={16} /> ПРИХОД (MIGO)
        </Button>
        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black h-10 px-6 rounded-none italic shadow-[4px_4px_0px_rgba(0,0,0,1)]"
        >
          <ArrowLeftRight className="mr-2" size={16} /> ПЕРЕМЕЩЕНИЕ
        </Button>
        <Button
          onClick={() => navigate("/admin/inventory-check")}
          className="bg-zinc-100 text-black hover:bg-white text-[10px] font-black h-10 px-6 rounded-none italic shadow-[4px_4px_0px_rgba(0,0,0,1)]"
        >
          <ClipboardCheck className="mr-2" size={16} /> ИНВЕНТАРИЗАЦИЯ
        </Button>
      </div>

      {/* ЗАГОЛОВОК СЕКЦИИ */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter leading-none">ТЕКУЩИЕ ОСТАТКИ (MMBE)</h1>
            <p className="text-[9px] text-zinc-500 mt-1 font-bold">ОПЕРАТИВНЫЙ УЧЕТ МАТЕРИАЛОВ</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchStock}
            className="border-white/10 bg-transparent h-9 text-[10px] font-black hover:bg-white/5"
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

      {/* КАРТОЧКА СТАТИСТИКИ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/40 p-5 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <p className="text-[9px] text-zinc-500 font-black tracking-widest mb-1">ВСЕГО ПОЗИЦИЙ НА СКЛАДЕ</p>
          <p className="text-3xl font-black italic text-white leading-none tracking-tighter">
            {stock.length.toString().padStart(3, "0")}
          </p>
        </div>
      </div>

      {/* ТАБЛИЦА */}
      <div className="border border-white/5 rounded-sm overflow-hidden bg-zinc-900/20 shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-b border-white/10 h-12">
              <TableHead className="text-[10px] font-black text-zinc-400 pl-6 tracking-widest uppercase">
                СКЛАД / ЛОКАЦИЯ
              </TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">МАТЕРИАЛ</TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400 tracking-widest uppercase">
                ОСТАТОК
              </TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400 pr-6 tracking-widest uppercase">
                АНАЛИТИКА
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 text-[10px] font-black italic">
                  СКАНИРОВАНИЕ БАЗЫ ДАННЫХ В ПРОЦЕССЕ...
                </TableCell>
              </TableRow>
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 text-[10px] font-black">
                  СКЛАД ПУСТ. ПРОВЕДИТЕ MIGO_101 ДЛЯ ПОПОЛНЕНИЯ
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item, idx) => (
                <TableRow key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="text-[10px] font-bold text-zinc-400 pl-6">
                    {item.location?.name || "ОСНОВНОЙ СКЛАД"}
                  </TableCell>
                  <TableCell className="text-xs font-black text-white italic group-hover:text-blue-400 transition-colors uppercase">
                    {item.ingredient?.name || "НЕИЗВЕСТНЫЙ МАТЕРИАЛ"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-black text-sm ${
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
                      className="h-7 text-[9px] font-black hover:bg-blue-600 hover:text-white border border-white/5 hover:border-blue-400 transition-all"
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
