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
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllIngredientsWithStock();
  }, []);

  const fetchAllIngredientsWithStock = async () => {
    setLoading(true);
    try {
      // 1. Сначала берем ВСЕ ингредиенты (чтобы видеть даже те, которых нет на складе)
      const { data: ingredients, error: ingError } = await supabase.from("ingredients").select("id, name, unit");

      if (ingError) throw ingError;

      // 2. Берем текущие остатки из таблицы inventory
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("quantity, ingredient_id, location:locations(name)");

      if (invError) throw invError;

      // 3. Соединяем: каждому ингредиенту сопоставляем его остаток или ставим 0
      const combined = ingredients.map((ing) => {
        const stockItem = inventory?.find((inv) => inv.ingredient_id === ing.id);
        return {
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          quantity: stockItem ? stockItem.quantity : 0,
          locationName: stockItem?.location?.name || "НЕ ОПРЕДЕЛЕНО",
        };
      });

      setFullStock(combined);
    } catch (error: any) {
      console.error("ОШИБКА:", error);
      toast.error("СБОЙ ЗАГРУЗКИ ДАННЫХ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ПАНЕЛЬ КНОПОК */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 h-20 rounded-none italic border-b-4 border-emerald-900 flex flex-col gap-1 font-black"
        >
          <PackagePlus size={24} /> <span>ПРИХОД (MIGO)</span>
        </Button>
        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 h-20 rounded-none italic border-b-4 border-blue-900 flex flex-col gap-1 font-black"
        >
          <ArrowLeftRight size={24} /> <span>ПЕРЕМЕЩЕНИЕ</span>
        </Button>
        <Button
          onClick={() => navigate("/admin/physical-inventory")}
          className="bg-amber-600 hover:bg-amber-500 h-20 rounded-none italic border-b-4 border-amber-900 flex flex-col gap-1 font-black"
        >
          <ClipboardCheck size={24} /> <span>ИНВЕНТАРИЗАЦИЯ</span>
        </Button>
        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-900 hover:bg-zinc-800 h-20 rounded-none italic border-b-4 border-black flex flex-col gap-1 font-black"
        >
          <History size={24} /> <span>АРХИВ</span>
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-4">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">ПОЛНЫЙ ПЕРЕЧЕНЬ И ОСТАТКИ</h1>
        <Button
          variant="outline"
          onClick={fetchAllIngredientsWithStock}
          className="border-white h-12 px-6 font-black hover:bg-white hover:text-black transition-all"
        >
          <RefreshCcw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} /> ОБНОВИТЬ СПИСОК
        </Button>
      </div>

      {/* ТАБЛИЦА */}
      <div className="border-2 border-white rounded-none overflow-hidden bg-zinc-900/10">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="h-12">
              <TableHead className="text-black font-black pl-6">СКЛАД</TableHead>
              <TableHead className="text-black font-black">НАИМЕНОВАНИЕ ТОВАРА</TableHead>
              <TableHead className="text-right text-black font-black pr-6">СИСТЕМНЫЙ ОСТАТОК</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fullStock.map((item) => (
              <TableRow
                key={item.id}
                className={`border-b border-white/10 h-16 ${item.quantity === 0 ? "opacity-60" : ""}`}
              >
                <TableCell className="text-zinc-500 pl-6 font-bold text-[10px]">{item.locationName}</TableCell>
                <TableCell className="text-lg font-black italic">
                  {item.name}
                  {item.quantity === 0 && (
                    <span className="ml-3 text-[9px] bg-zinc-800 px-2 py-1 text-zinc-400 not-italic">
                      НЕТ НА СКЛАДЕ
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-black text-xl pr-6 ${item.quantity > 0 ? "text-emerald-400" : "text-zinc-700"}`}
                >
                  {Number(item.quantity).toLocaleString()} {item.unit || "шт"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex gap-4">
        <Button
          onClick={() => navigate("/admin/ingredients")}
          variant="ghost"
          className="text-zinc-500 hover:text-white text-[10px] font-black italic"
        >
          <PlusCircle size={14} className="mr-2" /> ДОБАВИТЬ НОВУЮ ПОЗИЦИЮ В СПРАВОЧНИК
        </Button>
      </div>
    </div>
  );
}
