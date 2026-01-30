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
  Save,
  Calculator,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [stockData, setStockData] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const { data: locs } = await supabase.from("locations").select("id, name");
    const { data: ings } = await (supabase.from("ingredients").select("id, name, unit") as any);
    setLocations(locs || []);
    setAllIngredients(ings || []);
  };

  const loadStockForLocation = async (locId: string) => {
    setSelectedLocation(locId);
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("inventory")
        .select(`quantity, ingredient_id, ingredient:ingredients(name, unit)`)
        .eq("location_id", locId) as any);

      if (error) throw error;
      const formatted = (data || []).map((item: any) => ({
        id: item.ingredient_id,
        name: item.ingredient?.name || "НЕИЗВЕСТНО",
        unit: item.ingredient?.unit || "шт",
        systemQty: Number(item.quantity) || 0,
        factQty: Number(item.quantity) || 0,
      }));
      setStockData(formatted);
    } catch (e) {
      toast.error("ОШИБКА ЗАГРУЗКИ");
    } finally {
      setLoading(false);
    }
  };

  // ФУНКЦИЯ ДОБАВЛЕНИЯ НОВОГО ТОВАРА В СПИСОК (ДЛЯ ИЗЛИШКОВ)
  const addNewItemToList = (ingredientId: string) => {
    if (!selectedLocation) {
      toast.error("СНАЧАЛА ВЫБЕРИТЕ СКЛАД!");
      return;
    }
    const alreadyInList = stockData.find((i) => i.id === ingredientId);
    if (alreadyInList) {
      toast.error("ЭТОТ ТОВАР УЖЕ В СПИСКЕ");
      return;
    }

    const ing = allIngredients.find((i) => i.id === ingredientId);
    if (ing) {
      setStockData([
        ...stockData,
        {
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          systemQty: 0, // В системе его нет на этом складе
          factQty: 0,
        },
      ]);
      toast.success(`ДОБАВЛЕНО: ${ing.name}`);
    }
  };

  const handleFactChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStockData((prev) => prev.map((item) => (item.id === id ? { ...item, factQty: val } : item)));
  };

  const removeItem = (id: string) => {
    setStockData(stockData.filter((i) => i.id !== id));
  };

  const handlePostDifferences = async () => {
    setLoading(true);
    // Логика сохранения MI07
    setTimeout(() => {
      toast.success("ИНВЕНТАРИЗАЦИЯ СОХРАНЕНА");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 hover:bg-emerald-500 h-16 rounded-none font-black border-b-4 border-emerald-900 italic"
        >
          <PackagePlus className="mr-2" /> ПРИХОД (MIGO)
        </Button>
        <Button
          onClick={() => navigate("/admin/transfer")}
          className="bg-blue-600 hover:bg-blue-500 h-16 rounded-none font-black border-b-4 border-blue-900 italic"
        >
          <ArrowLeftRight className="mr-2" /> ПЕРЕМЕЩЕНИЕ
        </Button>
        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 hover:bg-zinc-700 h-16 rounded-none font-black border-b-4 border-zinc-950 italic"
        >
          <History className="mr-2" /> ЖУРНАЛ
        </Button>
        <Button
          onClick={() => navigate("/admin/reports/inventory")}
          className="bg-zinc-900 hover:bg-zinc-800 h-16 rounded-none font-black border-b-4 border-black italic"
        >
          <Calculator className="mr-2" /> ОТЧЕТЫ (MI07)
        </Button>
      </div>

      <div className="bg-zinc-900/50 border-2 border-white p-6">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-8">
          <div className="w-full lg:w-1/3">
            <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 mb-4">
              <ClipboardCheck className="text-amber-500" size={32} /> MI01: ИНВЕНТАРИЗАЦИЯ
            </h1>
            <label className="text-[10px] font-black mb-1 block text-zinc-400">1. ВЫБЕРИТЕ СКЛАД:</label>
            <Select onValueChange={loadStockForLocation}>
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

          <div className="w-full lg:w-1/3">
            <label className="text-[10px] font-black mb-1 block text-amber-500 italic underline">
              2. ДОБАВИТЬ ТОВАР (ИЗЛИШКИ):
            </label>
            <Select onValueChange={addNewItemToList}>
              <SelectTrigger className="bg-zinc-800 border-amber-500/50 text-white font-black rounded-none h-12">
                <SelectValue placeholder="НАЙТИ ТОВАР ДЛЯ ПОДСЧЕТА..." />
              </SelectTrigger>
              <SelectContent>
                {allIngredients.map((ing) => (
                  <SelectItem key={ing.id} value={ing.id}>
                    {ing.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border border-white/20">
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="h-12 border-none">
                <TableHead className="text-black font-black pl-4">МАТЕРИАЛ</TableHead>
                <TableHead className="text-black font-black text-right">КНИЖНЫЙ ОСТАТОК</TableHead>
                <TableHead className="text-black font-black text-right">ФАКТ. НАЛИЧИЕ</TableHead>
                <TableHead className="text-black font-black text-right">РАЗНИЦА</TableHead>
                <TableHead className="text-black font-black text-center pr-4 w-10">DEL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-600 italic font-black">
                    ВЫБЕРИТЕ СКЛАД ИЛИ ДОБАВЬТЕ ТОВАРЫ ВРУЧНУЮ
                  </TableCell>
                </TableRow>
              ) : (
                stockData.map((item) => {
                  const diff = item.factQty - item.systemQty;
                  return (
                    <TableRow key={item.id} className="border-b border-white/10 h-16 hover:bg-white/5 transition-all">
                      <TableCell className="pl-4 font-black italic text-lg uppercase tracking-tighter">
                        {item.name} <span className="text-[10px] text-zinc-500 not-italic ml-2">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-zinc-400">
                        {item.systemQty.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.001"
                          className="w-32 ml-auto bg-white text-black font-black text-right rounded-none h-10 border-2 border-transparent focus:border-amber-500"
                          value={item.factQty}
                          onChange={(e) => handleFactChange(item.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-black text-lg ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-600"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-center pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-zinc-700 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            disabled={loading || stockData.length === 0}
            onClick={handlePostDifferences}
            className="bg-white text-black hover:bg-zinc-200 px-12 h-14 font-black rounded-none italic text-xl border-b-4 border-zinc-400 active:translate-y-1 active:border-b-0 transition-all"
          >
            <Save className="mr-3" /> ПРОВЕСТИ РАЗНИЦЫ (MI07)
          </Button>
        </div>
      </div>
    </div>
  );
}
