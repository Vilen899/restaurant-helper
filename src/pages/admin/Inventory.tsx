import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, History, RefreshCcw, PackagePlus, ArrowLeftRight, ClipboardCheck } from "lucide-react";
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
      const { data, error } = await (supabase as any).from("inventory").select(`
          quantity,
          location:locations(name),
          ingredient:ingredients(name, unit)
        `);

      if (error) throw error;
      setStock(data || []);
    } catch (error: any) {
      console.error("ОШИБКА ЗАГРУЗКИ:", error);
      toast.error("ОШИБКА ПОДКЛЮЧЕНИЯ К СКЛАДУ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ГЛАВНЫЙ БЛОК УПРАВЛЕНИЯ СКЛАДОМ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-emerald-900 flex flex-col gap-1"
        >
          <PackagePlus size={24} />
          <span>ПРИХОД (MIGO)</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-blue-900 flex flex-col gap-1"
        >
          <ArrowLeftRight size={24} />
          <span>ПЕРЕМЕЩЕНИЕ</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/physical-inventory")}
          className="bg-amber-600 hover:bg-amber-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-amber-900 flex flex-col gap-1"
        >
          <ClipboardCheck size={24} />
          <span>ИНВЕНТАРИЗАЦИЯ</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 hover:bg-zinc-700 text-[12px] font-black h-20 rounded-none italic border-b-4 border-zinc-950 flex flex-col gap-1"
        >
          <History size={24} />
          <span>АРХИВ ДОКУМЕНТОВ</span>
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 text-black">
            <Package size={28} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter">МОНИТОРИНГ СКЛАДА (MMBE)</h1>
        </div>

        <Button
          variant="outline"
          onClick={fetchStock}
          className="border-white bg-transparent h-12 px-6 text-[10px] font-black hover:bg-white hover:text-black transition-all"
        >
          <RefreshCcw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} /> ОБНОВИТЬ ОСТАТКИ
        </Button>
      </div>

      {/* ТАБЛИЦА ОСТАТКОВ */}
      <div className="border-2 border-white rounded-none overflow-hidden bg-zinc-900/10">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="h-12 hover:bg-white">
              <TableHead className="text-[12px] font-black text-black pl-6 uppercase">Складская ячейка</TableHead>
              <TableHead className="text-[12px] font-black text-black uppercase">Материал</TableHead>
              <TableHead className="text-right text-[12px] font-black text-black pr-6 uppercase">
                Фактический остаток
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-40 text-center text-zinc-500 text-[14px] font-black italic uppercase"
                >
                  Получение данных из базы...
                </TableCell>
              </TableRow>
            ) : stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-zinc-500 text-[14px] font-black uppercase">
                  Материалы не найдены. Выполните MIGO.
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item, idx) => (
                <TableRow key={idx} className="border-b border-white/10 hover:bg-white/5 h-16 transition-colors">
                  <TableCell className="text-[12px] font-bold text-zinc-400 pl-6 uppercase">
                    {item.location?.name || "STOCK_MAIN"}
                  </TableCell>
                  <TableCell className="text-lg font-black text-white italic uppercase tracking-tighter">
                    {item.ingredient?.name}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-black text-xl pr-6 ${
                      Number(item.quantity) <= 0 ? "text-red-600" : "text-emerald-400"
                    }`}
                  >
                    {Number(item.quantity).toLocaleString()} {item.ingredient?.unit}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ФУТЕР */}
      <div className="mt-10 p-4 border border-zinc-800 flex justify-between items-center text-[10px] font-black text-zinc-600">
        <div className="flex gap-8">
          <p>SYSTEM: ONLINE</p>
          <p>STATIONS ACTIVE: 01</p>
        </div>
        <p>© WAREHOUSE TERMINAL v2.0</p>
      </div>
    </div>
  );
}
