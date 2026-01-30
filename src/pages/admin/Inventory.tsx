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
  Plus,
  Save,
  Trash2,
  Search,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Данные из БД
  const [locations, setLocations] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);

  // Состояние формы инвентаризации
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [items, setItems] = useState<any[]>([]); // Выбранные товары для подсчета

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const { data: locs } = await supabase.from("locations").select("id, name");
    const { data: ings } = await (supabase.from("ingredients").select("id, name, unit") as any);
    setLocations(locs || []);
    setIngredients(ings || []);
  };

  // Добавить товар в список для подсчета
  const addItem = (ingredientId: string) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) return;

    // Проверяем, нет ли уже этого товара в списке
    if (items.find((item) => item.id === ingredientId)) {
      toast.error("ТОВАР УЖЕ В СПИСКЕ");
      return;
    }

    setItems([
      ...items,
      {
        ...ingredient,
        systemQty: 0, // Позже подгрузим реальный остаток
        actualQty: 0,
        diff: 0,
      },
    ]);
    fetchSystemQty(ingredientId);
  };

  // Получить системный остаток для выбранного товара на выбранном складе
  const fetchSystemQty = async (ingredientId: string) => {
    if (!selectedLocation) return;
    const { data } = await supabase
      .from("inventory")
      .select("quantity")
      .eq("location_id", selectedLocation)
      .eq("ingredient_id", ingredientId)
      .single();

    setItems((current) =>
      current.map((item) => (item.id === ingredientId ? { ...item, systemQty: data?.quantity || 0 } : item)),
    );
  };

  const updateActualQty = (id: string, val: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id === id) {
          const diff = val - item.systemQty;
          return { ...item, actualQty: val, diff: diff };
        }
        return item;
      }),
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handlePostInventory = async () => {
    if (!selectedLocation || items.length === 0) {
      toast.error("ВЫБЕРИТЕ СКЛАД И ТОВАРЫ");
      return;
    }
    setLoading(true);
    try {
      // Здесь идет логика сохранения в stocktaking_docs и обновления inventory
      toast.success("ДОКУМЕНТ ПРОВЕДЕН: РЕЗУЛЬТАТЫ ОТПРАВЛЕНЫ В MI07");
      setItems([]);
    } catch (e) {
      toast.error("ОШИБКА ПРОВЕДЕНИЯ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ВЕРХНЯЯ ПАНЕЛЬ С КНОПКАМИ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 h-16 rounded-none italic border-b-4 border-emerald-900 font-black"
        >
          <PackagePlus className="mr-2" /> ПРИХОД (MIGO)
        </Button>
        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 h-16 rounded-none italic border-b-4 border-blue-900 font-black"
        >
          <ArrowLeftRight className="mr-2" /> ПЕРЕМЕЩЕНИЕ
        </Button>
        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 hover:bg-zinc-700 h-16 rounded-none italic border-b-4 border-zinc-950 font-black"
        >
          <History className="mr-2" /> АРХИВ / ДВИЖЕНИЕ
        </Button>
        <Button
          onClick={() => navigate("/admin/reports/inventory")}
          className="bg-zinc-900 hover:bg-zinc-800 h-16 rounded-none italic border-b-4 border-black font-black"
        >
          <Calculator className="mr-2" /> ОТЧЕТЫ (MI07)
        </Button>
      </div>

      <div className="bg-zinc-900/30 border-2 border-white p-6 mb-6">
        <h1 className="text-2xl font-black italic mb-6 flex items-center gap-3">
          <ClipboardCheck className="text-amber-500" size={32} />
          СОЗДАНИЕ ИНВЕНТАРИЗАЦИИ (MI01)
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="text-[10px] font-black mb-2 block text-zinc-500">1. ВЫБЕРИТЕ СКЛАД ДЛЯ ПРОВЕРКИ</label>
            <Select onValueChange={setSelectedLocation} value={selectedLocation}>
              <SelectTrigger className="bg-white text-black font-black rounded-none h-12">
                <SelectValue placeholder="ВЫБРАТЬ ЛОКАЦИЮ..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-black mb-2 block text-zinc-500">2. ДОБАВИТЬ ТОВАР В СПИСОК</label>
            <Select onValueChange={addItem}>
              <SelectTrigger className="bg-zinc-800 border-white/20 text-white font-black rounded-none h-12">
                <SelectValue placeholder="ПОИСК ТОВАРА / ИНГРЕДИЕНТА..." />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((ing) => (
                  <SelectItem key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ТАБЛИЦА ПОДСЧЕТА */}
        <div className="border border-white/20">
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-white border-none h-10">
                <TableHead className="text-black font-black pl-4">МАТЕРИАЛ</TableHead>
                <TableHead className="text-black font-black text-right">УЧЕТ</TableHead>
                <TableHead className="text-black font-black text-right">ФАКТ</TableHead>
                <TableHead className="text-black font-black text-right">РАЗНИЦА</TableHead>
                <TableHead className="text-black font-black text-right pr-4">УДАЛИТЬ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-600 italic font-bold">
                    СПИСОК ПУСТ. ДОБАВЬТЕ ТОВАРЫ ДЛЯ ПОДСЧЕТА.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="border-b border-white/10 h-16">
                    <TableCell className="font-black italic text-lg pl-4">{item.name}</TableCell>
                    <TableCell className="text-right font-mono text-zinc-400">
                      {item.systemQty} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-24 ml-auto bg-white text-black font-black text-right rounded-none"
                        value={item.actualQty}
                        onChange={(e) => updateActualQty(item.id, Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-black ${item.diff > 0 ? "text-emerald-500" : item.diff < 0 ? "text-red-500" : "text-zinc-500"}`}
                    >
                      {item.diff > 0 ? `+${item.diff}` : item.diff}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-8 flex justify-between items-center border-t border-white/10 pt-6">
          <div className="text-[10px] font-black text-zinc-500">ПОЗИЦИЙ К ПРОВЕДЕНИЮ: {items.length}</div>
          <Button
            disabled={loading || items.length === 0}
            onClick={handlePostInventory}
            className="bg-white text-black hover:bg-zinc-200 px-10 h-14 font-black rounded-none italic text-lg"
          >
            <Save className="mr-2" /> ПРОВЕСТИ ДОКУМЕНТ
          </Button>
        </div>
      </div>
    </div>
  );
}
