import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, RefreshCcw, PackagePlus, ArrowLeftRight, ClipboardCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InventoryDashboard() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // Пытаемся получить данные. Если упадет — значит структура БД не совпадает
      const { data, error } = await supabase.from("inventory").select(`
          quantity,
          location:locations(name),
          ingredient:ingredients(name, unit)
        `);

      if (error) throw error;
      setStock(data || []);
    } catch (error: any) {
      console.error("DEBUG ERROR:", error);
      setDbError(error.message);
      toast.error("ОШИБКА БАЗЫ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* КНОПКИ ДЕЙСТВИЯ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-emerald-900 flex flex-col gap-1 shadow-[4px_4px_0px_rgba(16,185,129,0.2)]"
        >
          <PackagePlus size={24} />
          <span>ПРИХОД (MIGO)</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-blue-900 flex flex-col gap-1 shadow-[4px_4px_0px_rgba(37,99,235,0.2)]"
        >
          <ArrowLeftRight size={24} />
          <span>ПЕРЕМЕЩЕНИЕ</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/physical-inventory")}
          className="bg-zinc-800 hover:bg-zinc-700 text-[12px] font-black h-20 rounded-none italic border-b-4 border-zinc-950 flex flex-col gap-1"
        >
          <ClipboardCheck size={24} />
          <span>ИНВЕНТАРИЗАЦИЯ</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-900 hover:bg-zinc-800 text-[12px] font-black h-20 rounded-none italic border-b-4 border-black flex flex-col gap-1"
        >
          <History size={24} />
          <span>АРХИВ ДОКУМЕНТОВ</span>
        </Button>
      </div>

      {/* ЗАГОЛОВОК */}
      <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 text-black font-black">
            <Package size={28} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">СКЛАДСКИЕ ОСТАТКИ</h1>
        </div>
        <Button
          variant="outline"
          onClick={fetchStock}
          className="border-white bg-transparent h-12 px-6 text-[10px] font-black hover:bg-white hover:text-black transition-all"
        >
          <RefreshCcw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} /> ОБНОВИТЬ СТАТУС
        </Button>
      </div>

      {/* БЛОК ОШИБКИ ДЛЯ ТЕБЯ */}
      {dbError && (
        <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-600 text-red-500 flex items-center gap-4">
          <AlertTriangle size={24} />
          <div>
            <p className="font-black text-xs uppercase">ОБНАРУЖЕНА ТЕХНИЧЕСКАЯ ОШИБКА БАЗЫ:</p>
            <p className="font-mono text-[10px] leading-tight">{dbError}</p>
          </div>
        </div>
      )}

      {/* ТАБЛИЦА */}
      <div className="border-2 border-white rounded-none overflow-hidden bg-zinc-900/10">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="h-12">
              <TableHead className="text-[12px] font-black text-black pl-6 uppercase tracking-tighter">
                ЛОКАЦИЯ
              </TableHead>
              <TableHead className="text-[12px] font-black text-black uppercase tracking-tighter">МАТЕРИАЛ</TableHead>
              <TableHead className="text-right text-[12px] font-black text-black pr-6 uppercase tracking-tighter">
                ТЕКУЩИЙ ЗАПАС
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-zinc-600 font-black italic uppercase">
                  Загрузка данных...
                </TableCell>
              </TableRow>
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-zinc-600 font-black uppercase italic">
                  Склад пуст. Проведите приход через MIGO.
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item, idx) => (
                <TableRow
                  key={idx}
                  className="border-b border-white/10 hover:bg-white/5 h-16 transition-colors font-sans"
                >
                  <TableCell className="text-[11px] font-bold text-zinc-400 pl-6 uppercase">
                    {item.location?.name || "STOCK_A"}
                  </TableCell>
                  <TableCell className="text-lg font-black text-white italic uppercase tracking-tighter">
                    {item.ingredient?.name || "НЕИЗВЕСТНО"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-xl pr-6 text-emerald-400">
                    {Number(item.quantity).toLocaleString()} {item.ingredient?.unit || ""}
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
