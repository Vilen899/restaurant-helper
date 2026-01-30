import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package,
  History,
  RefreshCcw,
  PackagePlus,
  ArrowLeftRight,
  ClipboardCheck,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InventoryDashboard() {
  const [fullStock, setFullStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllIngredientsWithStock();
  }, []);

  const fetchAllIngredientsWithStock = async () => {
    setLoading(true);
    setErrorDetails(null);
    try {
      // 1. Берем ВСЕ ингредиенты из справочника (используем as any для обхода ошибки unit)
      const { data: ingredientsData, error: ingError } = await (supabase
        .from("ingredients")
        .select("id, name, unit") as any);

      if (ingError) throw ingError;
      const ingredients = (ingredientsData || []) as any[];

      // 2. Берем текущие остатки из таблицы inventory
      const { data: inventoryData, error: invError } = await (supabase
        .from("inventory")
        .select("quantity, ingredient_id, location:locations(name)") as any);

      if (invError) throw invError;
      const inventory = (inventoryData || []) as any[];

      // 3. Соединяем данные, чтобы видеть даже товары с 0 остатком
      const combined = ingredients.map((ing) => {
        // Фильтруем остатки для конкретного ингредиента
        const stockItems = inventory.filter((inv) => inv.ingredient_id === ing.id);

        // Суммируем количество по всем складам
        const totalQty = stockItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);

        // Собираем названия складов, где лежит товар
        const locations = stockItems
          .map((si) => si.location?.name)
          .filter(Boolean)
          .join(", ");

        return {
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          quantity: totalQty,
          locationName: locations || "НЕТ НА ОСТАТКЕ",
        };
      });

      setFullStock(combined);
    } catch (error: any) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА БАЗЫ:", error);
      setErrorDetails(error.message);
      toast.error("СБОЙ ЗАГРУЗКИ СКЛАДА");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ СКЛАДОМ (MIGO / TRANSFER / INV) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-emerald-900 flex flex-col gap-1 shadow-[4px_4px_0px_rgba(16,185,129,0.2)] transition-all active:translate-y-1 active:border-b-0"
        >
          <PackagePlus size={24} />
          <span>ПРИХОД (MIGO)</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-blue-900 flex flex-col gap-1 shadow-[4px_4px_0px_rgba(37,99,235,0.2)] transition-all active:translate-y-1 active:border-b-0"
        >
          <ArrowLeftRight size={24} />
          <span>ПЕРЕМЕЩЕНИЕ</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/physical-inventory")}
          className="bg-amber-600 hover:bg-amber-500 text-[12px] font-black h-20 rounded-none italic border-b-4 border-amber-900 flex flex-col gap-1 shadow-[4px_4px_0px_rgba(217,119,6,0.2)] transition-all active:translate-y-1 active:border-b-0"
        >
          <ClipboardCheck size={24} />
          <span>ИНВЕНТАРИЗАЦИЯ</span>
        </Button>

        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 hover:bg-zinc-700 text-[12px] font-black h-20 rounded-none italic border-b-4 border-zinc-950 flex flex-col gap-1 transition-all active:translate-y-1 active:border-b-0"
        >
          <History size={24} />
          <span>АРХИВ ДОКУМЕНТОВ</span>
        </Button>
      </div>

      {/* ОТОБРАЖЕНИЕ ТЕХНИЧЕСКИХ ОШИБОК */}
      {errorDetails && (
        <div className="mb-6 p-4 border-2 border-red-600 bg-red-900/10 text-red-500 flex items-center gap-3">
          <AlertCircle size={24} />
          <div className="text-[10px] font-mono">
            <p className="font-black">ОШИБКА СТРУКТУРЫ ДАННЫХ (TS-ERROR):</p>
            <p>{errorDetails}</p>
          </div>
        </div>
      )}

      {/* ЗАГОЛОВОК И ОБНОВЛЕНИЕ */}
      <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 text-black font-black">
            <Package size={28} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">ОПЕРАТИВНЫЕ ОСТАТКИ (MMBE)</h1>
        </div>
        <Button
          variant="outline"
          onClick={fetchAllIngredientsWithStock}
          className="border-white bg-transparent h-12 px-6 text-[10px] font-black hover:bg-white hover:text-black transition-all"
        >
          <RefreshCcw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} /> ОБНОВИТЬ ДАННЫЕ
        </Button>
      </div>

      {/* ОСНОВНАЯ ТАБЛИЦА СКЛАДА */}
      <div className="border-2 border-white rounded-none overflow-hidden bg-zinc-900/10 shadow-[8px_8px_0px_rgba(255,255,255,0.05)]">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="h-12 hover:bg-white border-none">
              <TableHead className="text-[12px] font-black text-black pl-6 uppercase tracking-tighter">
                Склад / Площадка
              </TableHead>
              <TableHead className="text-[12px] font-black text-black uppercase tracking-tighter">
                Наименование материала
              </TableHead>
              <TableHead className="text-right text-[12px] font-black text-black pr-6 uppercase tracking-tighter">
                Текущий запас
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-40 text-center text-zinc-600 font-black italic uppercase animate-pulse"
                >
                  Считывание регистров склада...
                </TableCell>
              </TableRow>
            ) : fullStock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-zinc-600 font-black uppercase italic">
                  Справочник материалов пуст. Добавьте ингредиенты.
                </TableCell>
              </TableRow>
            ) : (
              fullStock.map((item) => (
                <TableRow
                  key={item.id}
                  className={`border-b border-white/10 h-16 transition-colors hover:bg-white/5 ${item.quantity === 0 ? "opacity-50" : ""}`}
                >
                  <TableCell className="text-[11px] font-bold text-zinc-500 pl-6 uppercase font-mono">
                    {item.locationName}
                  </TableCell>
                  <TableCell className="text-lg font-black text-white italic uppercase tracking-tighter">
                    {item.name}
                    {item.quantity === 0 && (
                      <span className="ml-3 text-[9px] bg-red-900/20 px-2 py-0.5 text-red-500 border border-red-900/30 not-italic font-black">
                        OUT OF STOCK
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-black text-xl pr-6 ${
                      item.quantity > 0 ? "text-emerald-400" : "text-zinc-800"
                    }`}
                  >
                    {Number(item.quantity).toLocaleString()} {item.unit || "ЕД"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* НИЖНЯЯ ПАНЕЛЬ ССЫЛОК */}
      <div className="mt-8 flex flex-wrap gap-6 border-t border-white/5 pt-6">
        <Button
          onClick={() => navigate("/admin/ingredients")}
          variant="ghost"
          className="text-zinc-500 hover:text-white text-[11px] font-black italic p-0 h-auto"
        >
          <PlusCircle size={14} className="mr-2" /> РЕДАКТИРОВАТЬ СПРАВОЧНИК МАТЕРИАЛОВ
        </Button>
        <div className="ml-auto text-[10px] text-zinc-700 font-black italic">
          TERMINAL ID: WH-01 // DATABASE: SUPABASE_REALTIME
        </div>
      </div>
    </div>
  );
}
