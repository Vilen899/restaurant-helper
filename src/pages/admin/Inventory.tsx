import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, ExternalLink, RefreshCcw, PackagePlus, ArrowLeftRight, Database } from "lucide-react";
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
      // ПОПЫТКА 1: ЗАГРУЗКА СО ВСЕМИ СВЯЗЯМИ (ИДЕАЛЬНЫЙ ВАРИАНТ)
      const { data, error } = await (supabase as any).from("inventory").select(`
          quantity,
          location_id,
          ingredient_id,
          location:locations (name),
          ingredient:ingredients (name, unit)
        `);

      if (error) {
        console.warn("Сложный запрос не прошел, пробуем упрощенный поиск...", error);

        // ПОПЫТКА 2: РЕЗЕРВНАЯ ЗАГРУЗКА (ЕСЛИ СВЯЗИ В БД СЛОМАНЫ)
        const { data: simpleData, error: simpleError } = await (supabase as any)
          .from("inventory")
          .select("quantity, location_id, ingredient_id");

        if (simpleError) throw simpleError;

        // Если получили простые данные, пытаемся вручную сопоставить их
        setStock(simpleData || []);
        toast.warning("ДАННЫЕ ЗАГРУЖЕНЫ БЕЗ НАЗВАНИЙ (ПРОВЕРЬТЕ СВЯЗИ В БД)");
      } else {
        setStock(data || []);
      }
    } catch (error: any) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА:", error);
      toast.error("СБОЙ БАЗЫ ДАННЫХ: ТАБЛИЦА INVENTORY НЕДОСТУПНА");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ПАНЕЛЬ БЫСТРОГО ДОСТУПА (КНОПКИ НАВИГАЦИИ) */}
      <div className="flex flex-wrap gap-3 mb-8 bg-zinc-900/30 p-4 border border-white/10 rounded-none shadow-[4px_4px_0px_rgba(30,30,30,1)]">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black h-10 px-6 rounded-none italic border-b-2 border-emerald-900"
        >
          <PackagePlus className="mr-2" size={16} /> ПРИХОД (MIGO)
        </Button>
        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black h-10 px-6 rounded-none italic border-b-2 border-blue-900"
        >
          <ArrowLeftRight className="mr-2" size={16} /> ПЕРЕМЕЩЕНИЕ (MB1B)
        </Button>
        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black h-10 px-6 rounded-none italic border-b-2 border-zinc-950"
        >
          <History className="mr-2" size={16} /> АРХИВ ДОКУМЕНТОВ
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter leading-none">ТЕКУЩИЕ ОСТАТКИ (MMBE)</h1>
            <p className="text-[9px] text-zinc-500 mt-1 font-bold tracking-widest">GLOBAL STOCK OVERVIEW</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchStock}
            className="border-white/10 bg-transparent h-9 text-[10px] font-black hover:bg-white/5"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> ОБНОВИТЬ СТАТУС
          </Button>
        </div>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/40 p-5 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <p className="text-[9px] text-zinc-500 font-black tracking-widest mb-1 uppercase">ВСЕГО АКТИВНЫХ ПОЗИЦИЙ</p>
          <p className="text-3xl font-black italic text-white leading-none tracking-tighter">
            {stock.length.toString().padStart(3, "0")}
          </p>
        </div>
        <div className="bg-zinc-900/40 p-5 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
          <p className="text-[9px] text-zinc-500 font-black tracking-widest mb-1 uppercase">СТАТУС ПОДКЛЮЧЕНИЯ</p>
          <p className="text-3xl font-black italic text-emerald-500 leading-none tracking-tighter italic">ONLINE</p>
        </div>
      </div>

      {/* ОСНОВНАЯ ТАБЛИЦА */}
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
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-zinc-600 text-[10px] font-black italic tracking-[0.2em]"
                >
                  ИДЕТ СКАНИРОВАНИЕ РЕГИСТРОВ...
                </TableCell>
              </TableRow>
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 text-[10px] font-black">
                  ИНФОРМАЦИЯ ОТСУТСТВУЕТ. ПРОВЕДИТЕ ПОСТУПЛЕНИЕ (MIGO)
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item, idx) => (
                <TableRow key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="text-[10px] font-bold text-zinc-400 pl-6 uppercase">
                    {item.location?.name || `LOC_ID: ${item.location_id?.substring(0, 8) || "000"}`}
                  </TableCell>
                  <TableCell className="text-xs font-black text-white italic group-hover:text-blue-400 transition-colors uppercase">
                    {item.ingredient?.name || `ID: ${item.ingredient_id?.substring(0, 8) || "МАТЕРИАЛ"}`}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-black text-sm ${
                      Number(item.quantity) <= 0 ? "text-red-500" : "text-emerald-400"
                    }`}
                  >
                    {Number(item.quantity).toLocaleString()} {item.ingredient?.unit || "ед."}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/admin/material-log")}
                      className="h-7 text-[9px] font-black hover:bg-blue-600 hover:text-white border border-white/5 hover:border-blue-400 transition-all uppercase"
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

      {/* ФУТЕР */}
      <div className="mt-6 flex justify-between items-center text-[9px] text-zinc-600 font-black tracking-tighter border-t border-white/5 pt-4">
        <p>TERMINAL: ADMIN_V1</p>
        <p className="flex gap-4">
          <span>ITEMS: {stock.length}</span>
          <span className="text-emerald-900">SYSTEM READY</span>
        </p>
      </div>
    </div>
  );
}
