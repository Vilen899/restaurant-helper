import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackagePlus, History, Calculator, Save, Trash2, ClipboardCheck, ArrowLeftRight } from "lucide-react";
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
    if (!locId) return;
    setSelectedLocation(locId);
    setLoading(true);
    try {
      const { data } = await (supabase.from("inventory" as any) as any)
        .select(`quantity, ingredient_id, ingredient:ingredients(name, unit)`)
        .eq("location_id", locId);

      const formatted = (data || []).map((item: any) => ({
        id: item.ingredient_id,
        name: item.ingredient?.name || "НЕИЗВЕСТНО",
        unit: item.ingredient?.unit || "шт",
        systemQty: Number(item.quantity) || 0,
        factQty: Number(item.quantity) || 0,
      }));
      setStockData(formatted);
    } finally {
      setLoading(false);
    }
  };

  const handleFactChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStockData((prev) => prev.map((item) => (item.id === id ? { ...item, factQty: val } : item)));
  };

  const handlePostDifferences = async () => {
    if (!selectedLocation || stockData.length === 0) return toast.error("ПУСТО");
    setLoading(true);
    try {
      // 1. Создаем шапку документа
      const { data: doc, error: docError } = await (supabase.from("stocktaking_docs" as any) as any)
        .insert([
          {
            location_id: selectedLocation,
            status: "completed",
            total_items: stockData.length,
            total_difference: stockData.reduce((acc, item) => acc + (item.factQty - item.systemQty), 0),
          },
        ])
        .select()
        .single();

      if (docError) throw docError;

      // 2. Создаем позиции документа
      const itemsToInsert = stockData.map((item) => ({
        stocktaking_id: doc.id,
        ingredient_id: item.id,
        system_qty: item.systemQty,
        fact_qty: item.factQty,
        difference: item.factQty - item.systemQty,
      }));

      await (supabase.from("stocktaking_items" as any) as any).insert(itemsToInsert);

      // 3. Обновляем склад (UPSERT)
      for (const item of stockData) {
        await (supabase.from("inventory" as any) as any).upsert(
          {
            location_id: selectedLocation,
            ingredient_id: item.id,
            quantity: item.factQty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "location_id,ingredient_id" },
        );
      }

      toast.success("ПРОВЕДЕНО УСПЕШНО");
      setStockData([]);
      setSelectedLocation("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Button
          onClick={() => navigate("/admin/migo")}
          className="bg-emerald-600 h-16 rounded-none font-black border-b-4 border-emerald-900 italic"
        >
          <PackagePlus className="mr-2" /> ПРИХОД
        </Button>
        <Button
          onClick={() => navigate("/admin/material-docs")}
          className="bg-zinc-800 h-16 rounded-none font-black border-b-4 border-zinc-950 italic"
        >
          <History className="mr-2" /> ЖУРНАЛ
        </Button>
      </div>

      <div className="bg-zinc-900/50 border-2 border-white p-6">
        <h1 className="text-3xl font-black italic mb-6 flex items-center gap-3">
          <ClipboardCheck className="text-amber-500" /> MI01: ИНВЕНТАРИЗАЦИЯ
        </h1>

        <div className="mb-6 w-full md:w-1/3">
          <label className="text-[10px] font-black mb-1 block">ВЫБЕРИТЕ СКЛАД:</label>
          <Select value={selectedLocation} onValueChange={loadStockForLocation}>
            <SelectTrigger className="bg-white text-black font-black rounded-none h-12">
              <SelectValue placeholder="ВЫБРАТЬ..." />
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

        <Table>
          <TableHeader className="bg-white">
            <TableRow className="hover:bg-white border-none h-12">
              <TableHead className="text-black font-black">МАТЕРИАЛ</TableHead>
              <TableHead className="text-black font-black text-right">СИСТЕМА</TableHead>
              <TableHead className="text-black font-black text-right">ФАКТ</TableHead>
              <TableHead className="text-black font-black text-right">РАЗНИЦА</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockData.map((item) => (
              <TableRow key={item.id} className="border-b border-white/10 h-14">
                <TableCell className="font-black italic uppercase">{item.name}</TableCell>
                <TableCell className="text-right font-mono text-zinc-400">{item.systemQty.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-24 ml-auto bg-white text-black font-black text-right rounded-none h-8"
                    value={item.factQty}
                    onChange={(e) => handleFactChange(item.id, e.target.value)}
                  />
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-black ${item.factQty - item.systemQty >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(item.factQty - item.systemQty).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-8 flex justify-end">
          <Button
            disabled={loading || !selectedLocation}
            onClick={handlePostDifferences}
            className="bg-white text-black hover:bg-zinc-200 px-12 h-14 font-black rounded-none italic border-b-4 border-zinc-400"
          >
            <Save className="mr-2" /> СОХРАНИТЬ РЕЗУЛЬТАТЫ
          </Button>
        </div>
      </div>
    </div>
  );
}
