import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Package,
  ArrowRightLeft,
  TrendingDown,
  AlertTriangle,
  Plus,
  Database,
  ClipboardCheck,
  CalendarIcon,
  X,
  Trash2,
  RefreshCcw,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { TablePagination } from "@/components/admin/TablePagination";
import { SortableTableHead } from "@/components/admin/SortableTableHead";
import { useTableSort } from "@/hooks/useTableSort";

/* --- Типизация остается прежней --- */
type Inventory = Tables<"inventory">;
type Ingredient = Tables<"ingredients">;
type Location = Tables<"locations">;
type Unit = Tables<"units">;
type Supply = Tables<"supplies">;
type Transfer = Tables<"transfers">;
type Stocktaking = Tables<"stocktakings">;
type StocktakingItem = Tables<"stocktaking_items">;

interface InventoryItem extends Inventory {
  ingredient?: Ingredient & { unit?: Unit };
  location?: Location;
}

interface SupplyWithLocation extends Supply {
  location?: Location;
}

interface TransferWithLocations extends Transfer {
  from_location?: Location;
  to_location?: Location;
}

interface StocktakingWithLocation extends Stocktaking {
  location?: Location;
}

interface StocktakingItemWithIngredient extends StocktakingItem {
  ingredient?: Ingredient & { unit?: Unit };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<(Ingredient & { unit?: Unit })[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [supplies, setSupplies] = useState<SupplyWithLocation[]>([]);
  const [transfers, setTransfers] = useState<TransferWithLocations[]>([]);
  const [stocktakings, setStocktakings] = useState<StocktakingWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Дополнительные состояния для диалогов
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [locationToReset, setLocationToReset] = useState<string>("");

  /* --- Фильтры и Пагинация (оставляем твою логику) --- */
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(25);
  // ... (остальные состояния пагинации такие же)

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: inv }, { data: ings }, { data: locs }, { data: sups }, { data: trans }, { data: stocks }] =
        await Promise.all([
          supabase.from("inventory").select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)"),
          supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true).order("name"),
          supabase.from("locations").select("*").eq("is_active", true).order("name"),
          supabase
            .from("supplies")
            .select("*, location:locations(*)")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("transfers")
            .select(
              "*, from_location:locations!transfers_from_location_id_fkey(*), to_location:locations!transfers_to_location_id_fkey(*)",
            )
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("stocktakings")
            .select("*, location:locations(*)")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      setInventory((inv as InventoryItem[]) || []);
      setIngredients((ings as any) || []);
      setLocations(locs || []);
      setSupplies((sups as SupplyWithLocation[]) || []);
      setTransfers((trans as TransferWithLocations[]) || []);
      setStocktakings((stocks as StocktakingWithLocation[]) || []);
    } catch (error) {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  /* ================== ФУНКЦИЯ ОБНУЛЕНИЯ СКЛАДА ================== */
  const handleResetStock = async () => {
    if (!locationToReset) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", locationToReset);

      if (error) throw error;

      // Логируем обнуление
      await supabase.from("inventory_movements").insert({
        location_id: locationToReset,
        movement_type: "adjustment",
        quantity: 0,
        notes: "ПОЛНОЕ ОБНУЛЕНИЕ СКЛАДА АДМИНИСТРАТОРОМ",
      });

      toast.success("Склад успешно обнулен");
      setResetDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Ошибка при обнулении");
    } finally {
      setLoading(false);
    }
  };

  /* --- Логика фильтрации и сортировки (оставляем твою) --- */
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = selectedLocation === "all" || item.location_id === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [inventory, searchTerm, selectedLocation]);

  const {
    sortedData: sortedInventory,
    sortConfig: inventorySortConfig,
    handleSort: handleInventorySort,
  } = useTableSort(filteredInventory);

  /* --- JSX РЕНДЕРИНГ --- */
  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-500" />
            СКЛАД
          </h1>
          <p className="text-muted-foreground">Управление остатками и движением товара</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* НОВАЯ КНОПКА ОБНУЛЕНИЯ */}
          <Button
            variant="destructive"
            onClick={() => {
              setLocationToReset(selectedLocation === "all" ? locations[0]?.id : selectedLocation);
              setResetDialogOpen(true);
            }}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Обнулить
          </Button>

          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={() => {
              /* твоя логика открытия поставки */
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      {/* Low stock warning */}
      {inventory.filter((i) => i.ingredient?.min_stock && Number(i.quantity) < Number(i.ingredient.min_stock)).length >
        0 && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
          <AlertTriangle className="text-red-500 h-6 w-6" />
          <div>
            <p className="text-red-500 font-bold text-sm">Критический уровень остатков!</p>
            <p className="text-red-400/80 text-xs">Некоторые позиции почти закончились.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-4">
          <TabsTrigger value="inventory" className="rounded-lg">
            Остатки
          </TabsTrigger>
          <TabsTrigger value="stocktakings" className="rounded-lg">
            Инвентаризация
          </TabsTrigger>
          <TabsTrigger value="supplies" className="rounded-lg">
            Поставки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск товара..."
                className="pl-10 bg-white/5 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
                <SelectValue placeholder="Все точки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все точки</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead className="font-bold">Ингредиент</TableHead>
                  <TableHead className="font-bold text-center">Остаток</TableHead>
                  <TableHead className="font-bold">Точка</TableHead>
                  <TableHead className="font-bold">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInventory.length > 0 ? (
                  sortedInventory.map((item) => (
                    <TableRow key={item.id} className="hover:bg-white/[0.04] transition-colors">
                      <TableCell className="font-medium text-white">{item.ingredient?.name || "Незвестно"}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-3 py-1 rounded-lg font-mono text-lg ${Number(item.quantity) <= (item.ingredient?.min_stock || 0) ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"}`}
                        >
                          {Number(item.quantity).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1 uppercase">
                          {item.ingredient?.unit?.abbreviation}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/5">
                          {item.location?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(item.quantity) <= (item.ingredient?.min_stock || 0) ? (
                          <Badge className="bg-red-500/20 text-red-400 border-none">Заказать!</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-none">В норме</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Нет данных для отображения
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ДИАЛОГ ПОДТВЕРЖДЕНИЯ ОБНУЛЕНИЯ */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-500 flex items-center gap-2">
              <AlertTriangle /> ВНИМАНИЕ!
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-4">
              Вы собираетесь обнулить все остатки на точке{" "}
              <b className="text-white">"{locations.find((l) => l.id === locationToReset)?.name}"</b>. Это действие
              нельзя отменить. Все цифры станут 0.00.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-6">
            <Button variant="ghost" onClick={() => setResetDialogOpen(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleResetStock} className="rounded-xl font-bold">
              ДА, ОБНУЛИТЬ ВСЁ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
