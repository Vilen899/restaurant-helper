import { useState, useEffect } from "react";
import { Calculator, Save, Search, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface InventoryItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  system_qty: number;
  actual_qty: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit?: { abbreviation: string } | null;
}

export default function PhysicalInventory() {
  const [locations, setLocations] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>("");
  const [stockItems, setStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryStarted, setInventoryStarted] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: locs }, { data: ings }] = await Promise.all([
      supabase.from("locations").select("*").eq("is_active", true),
      supabase.from("ingredients").select("id, name, unit:units(abbreviation)").eq("is_active", true).order("name"),
    ]);
    setLocations(locs || []);
    setIngredients((ings as Ingredient[]) || []);
  };

  // Load inventory for selected location
  const startInventory = async () => {
    if (!selectedLoc) return toast.error("ВЫБЕРИТЕ СКЛАД");
    setLoading(true);

    const { data: inv } = await supabase
      .from("inventory")
      .select("id, ingredient_id, quantity, ingredient:ingredients(name, unit:units(abbreviation))")
      .eq("location_id", selectedLoc);

    const itemsForCount: InventoryItem[] = (inv || []).map((i: any) => ({
      id: i.id,
      ingredient_id: i.ingredient_id,
      ingredient_name: i.ingredient?.name || "НЕИЗВЕСТНО",
      unit: i.ingredient?.unit?.abbreviation || "шт",
      system_qty: Number(i.quantity),
      actual_qty: "",
    }));

    setStockItems(itemsForCount);
    setInventoryStarted(true);
    setLoading(false);
  };

  // Add ingredient to inventory count
  const addIngredient = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;

    if (stockItems.some((item) => item.ingredient_id === ingredientId)) {
      toast.error("ТОВАР УЖЕ ДОБАВЛЕН");
      return;
    }

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      ingredient_id: ingredientId,
      ingredient_name: ing.name,
      unit: ing.unit?.abbreviation || "шт",
      system_qty: 0,
      actual_qty: "",
    };

    setStockItems((prev) => [...prev, newItem]);
    setSearchTerm("");
  };

  // Remove ingredient from inventory count
  const removeItem = (id: string) => {
    setStockItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update actual quantity
  const updateActualQty = (id: string, value: string) => {
    setStockItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, actual_qty: value } : item
      )
    );
  };

  // Post inventory differences
  const handlePostInventory = async () => {
    if (!selectedLoc) return toast.error("СКЛАД НЕ ВЫБРАН");
    
    const itemsToPost = stockItems.filter((item) => item.actual_qty !== "");
    if (itemsToPost.length === 0) {
      return toast.error("ВВЕДИТЕ КОЛИЧЕСТВО ХОТЯ БЫ ДЛЯ ОДНОГО ТОВАРА");
    }

    setSaving(true);
    try {
      // Calculate totals
      let totalDifference = 0;
      let surplusCount = 0;
      let shortageCount = 0;

      for (const item of itemsToPost) {
        const actual = Number(item.actual_qty);
        const diff = actual - item.system_qty;
        totalDifference += diff;
        if (diff > 0) surplusCount++;
        if (diff < 0) shortageCount++;
      }

      // Create stocktaking document
      const { data: stocktaking, error: stocktakingError } = await supabase
        .from("stocktakings")
        .insert({
          location_id: selectedLoc,
          status: "completed",
          total_items: itemsToPost.length,
          items_with_difference: itemsToPost.filter((i) => Number(i.actual_qty) !== i.system_qty).length,
          surplus_count: surplusCount,
          shortage_count: shortageCount,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (stocktakingError) throw stocktakingError;

      // Create stocktaking items
      const stocktakingItems = itemsToPost.map((item) => ({
        stocktaking_id: stocktaking.id,
        ingredient_id: item.ingredient_id,
        system_quantity: item.system_qty,
        actual_quantity: Number(item.actual_qty),
        difference: Number(item.actual_qty) - item.system_qty,
      }));

      const { error: itemsError } = await supabase
        .from("stocktaking_items")
        .insert(stocktakingItems);

      if (itemsError) throw itemsError;

      // Update inventory and create stock movements
      for (const item of itemsToPost) {
        const actual = Number(item.actual_qty);
        const diff = actual - item.system_qty;

        // Update inventory
        await supabase.rpc("increment_inventory", {
          loc_id: selectedLoc,
          ing_id: item.ingredient_id,
          val: diff,
        });

        // Create stock movement record
        if (diff !== 0) {
          await supabase.from("stock_movements").insert({
            ingredient_id: item.ingredient_id,
            location_id: selectedLoc,
            quantity: diff,
            type: "MI07_COUNT",
            reference: `INV_${new Date().toISOString().slice(0, 10)}`,
          });
        }
      }

      toast.success("ИНВЕНТАРИЗАЦИЯ ПРОВЕДЕНА УСПЕШНО");
      setStockItems([]);
      setInventoryStarted(false);
      setSelectedLoc("");
    } catch (e: any) {
      toast.error("ОШИБКА ПРОВОДКИ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter ingredients for search
  const filteredIngredients = ingredients.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !stockItems.some((item) => item.ingredient_id === ing.id)
  );

  // Calculate summary
  const summary = stockItems.reduce(
    (acc, item) => {
      if (item.actual_qty !== "") {
        const diff = Number(item.actual_qty) - item.system_qty;
        acc.counted++;
        if (diff > 0) acc.surplus++;
        if (diff < 0) acc.shortage++;
      }
      return acc;
    },
    { counted: 0, surplus: 0, shortage: 0 }
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-md shadow-lg">
            <Calculator className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase">MI01: Инвентаризация</h1>
            <p className="text-xs text-muted-foreground uppercase">
              Физический подсчёт товаров / Physical Inventory
            </p>
          </div>
        </div>
        {inventoryStarted && stockItems.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 font-bold uppercase">
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                Провести (MI07)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Провести инвентаризацию?</AlertDialogTitle>
                <AlertDialogDescription>
                  Будет обновлено {summary.counted} позиций. Излишки: {summary.surplus}, Недостачи: {summary.shortage}. 
                  Остатки на складе будут скорректированы.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handlePostInventory} className="bg-emerald-600">
                  Провести
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Location Selection */}
      {!inventoryStarted && (
        <Card className="max-w-lg mx-auto mt-10">
          <CardHeader>
            <CardTitle className="text-center uppercase text-sm">Выберите склад для инвентаризации</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedLoc} onValueChange={setSelectedLoc}>
              <SelectTrigger className="h-12 font-bold uppercase">
                <SelectValue placeholder="--- ВЫБОР СКЛАДА ---" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={startInventory}
              disabled={!selectedLoc || loading}
              className="w-full h-12 font-bold uppercase"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Начать подсчёт"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Inventory Form */}
      {inventoryStarted && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{stockItems.length}</div>
                <div className="text-xs text-muted-foreground uppercase">Товаров в списке</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/50">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-emerald-500">+{summary.surplus}</div>
                <div className="text-xs text-muted-foreground uppercase">Излишки</div>
              </CardContent>
            </Card>
            <Card className="border-red-500/50">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-500">-{summary.shortage}</div>
                <div className="text-xs text-muted-foreground uppercase">Недостачи</div>
              </CardContent>
            </Card>
          </div>

          {/* Add Ingredient */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Добавить товар в подсчёт..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && filteredIngredients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredIngredients.slice(0, 10).map((ing) => (
                        <div
                          key={ing.id}
                          className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                          onClick={() => addIngredient(ing.id)}
                        >
                          <span className="font-medium">{ing.name}</span>
                          <span className="text-xs text-muted-foreground">{ing.unit?.abbreviation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold uppercase text-xs">Материал</TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs w-32">Книжный</TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs w-40">Факт</TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs w-32">Разница</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Добавьте товары для подсчёта
                    </TableCell>
                  </TableRow>
                ) : (
                  stockItems.map((item) => {
                    const diff = item.actual_qty !== "" ? Number(item.actual_qty) - item.system_qty : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-bold uppercase">{item.ingredient_name}</div>
                          <div className="text-xs text-muted-foreground">{item.unit}</div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {item.system_qty.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            step="0.001"
                            className="h-10 text-center font-bold"
                            value={item.actual_qty}
                            onChange={(e) => updateActualQty(item.id, e.target.value)}
                            placeholder="0.000"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {diff !== null ? (
                            <Badge
                              className={
                                diff === 0
                                  ? "bg-muted text-muted-foreground"
                                  : diff > 0
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-red-500/20 text-red-500"
                              }
                            >
                              {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">---</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                            onClick={() => removeItem(item.id)}
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
          </Card>

          {/* Cancel Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setInventoryStarted(false);
                setStockItems([]);
                setSelectedLoc("");
              }}
            >
              Отменить инвентаризацию
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
