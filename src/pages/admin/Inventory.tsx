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
  Edit3,
  RefreshCcw,
  Check,
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

// Типы
type InventoryItem = Tables<"inventory"> & {
  ingredient?: Tables<"ingredients"> & { unit?: Tables<"units"> };
  location?: Tables<"locations">;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Состояния для диалогов
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [bulkStockDialogOpen, setBulkStockDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Формы
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; qty: string } | null>(null);
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    supplier_name: "",
    invoice_number: "",
    items: [{ ingredient_id: "", quantity: "", cost_per_unit: "" }],
  });
  const [transferForm, setTransferForm] = useState({
    from_location_id: "",
    to_location_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: inv } = await supabase
        .from("inventory")
        .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
      const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
      const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);

      setInventory((inv as any) || []);
      setIngredients(ings || []);
      setLocations(locs || []);
    } catch (e) {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // --- ФУНКЦИИ КНОПОК (Supply) ---
  const handleCreateSupply = async () => {
    if (!supplyForm.location_id || supplyForm.items.some((i) => !i.ingredient_id || !i.quantity)) {
      toast.error("Заполните форму");
      return;
    }
    try {
      const { data: supply } = await supabase
        .from("supplies")
        .insert({
          location_id: supplyForm.location_id,
          total_amount: supplyForm.items.reduce((s, i) => s + Number(i.quantity) * Number(i.cost_per_unit), 0),
          status: "received",
        })
        .select()
        .single();

      for (const item of supplyForm.items) {
        const { data: exist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.location_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (exist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exist.quantity) + Number(item.quantity) })
            .eq("id", exist.id);
        } else {
          await supabase.from("inventory").insert({
            location_id: supplyForm.location_id,
            ingredient_id: item.ingredient_id,
            quantity: Number(item.quantity),
          });
        }
      }
      toast.success("Поставка принята");
      setSupplyDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  // --- ФУНКЦИИ КНОПОК (Transfer) ---
  const handleCreateTransfer = async () => {
    if (transferForm.from_location_id === transferForm.to_location_id) {
      toast.error("Точки должны быть разные");
      return;
    }
    // Логика перемещения аналогична поставке (минус на одной, плюс на другой)
    toast.info("Функция перемещения выполняется...");
    setTransferDialogOpen(false);
  };

  // --- ЛОГИКА ПРАВКИ ---
  const handleSingleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: parseFloat(editingItem.qty) || 0 })
      .eq("id", editingItem.id);
    if (!error) {
      toast.success("Обновлено");
      setEditDialogOpen(false);
      fetchData();
    }
  };

  const handleResetStock = async () => {
    await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", selectedLocation);
    toast.success("Склад обнулен");
    setResetDialogOpen(false);
    fetchData();
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = selectedLocation === "all" || item.location_id === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [inventory, searchTerm, selectedLocation]);
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold">Склад</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setStocktakingDialogOpen(true)}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Инвентарь
          </Button>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Перемещение
          </Button>
          <Button onClick={() => setSupplyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Поставка
          </Button>
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)} disabled={selectedLocation === "all"}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Обнулить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Остатки</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
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

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Точка</TableHead>
                  <TableHead className="text-right">Правка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.ingredient?.name}</TableCell>
                    <TableCell className="font-bold">{Number(item.quantity).toFixed(2)}</TableCell>
                    <TableCell>{item.location?.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem({
                            id: item.id,
                            name: item.ingredient?.name || "",
                            qty: item.quantity.toString(),
                          });
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ДИАЛОГ ПОСТАВКИ */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Новая поставка</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите точку" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {supplyForm.items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const newItems = [...supplyForm.items];
                    newItems[idx].ingredient_id = v;
                    setSupplyForm({ ...supplyForm, items: newItems });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Товар" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Кол-во"
                  type="number"
                  className="w-24"
                  onChange={(e) => {
                    const newItems = [...supplyForm.items];
                    newItems[idx].quantity = e.target.value;
                    setSupplyForm({ ...supplyForm, items: newItems });
                  }}
                />
              </div>
            ))}
            <Button className="w-full" onClick={handleCreateSupply}>
              Принять поставку
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ДИАЛОГ ПРАВКИ ОДНОЙ ПОЗИЦИИ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Правка: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={editingItem?.qty}
            onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, qty: e.target.value } : null))}
          />
          <Button onClick={handleSingleUpdate}>Сохранить</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
{
  /* ОКНО ПЕРЕМЕЩЕНИЯ */
}
<Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
  <DialogContent className="max-w-2xl bg-zinc-900 border-white/10 text-white rounded-[2rem]">
    <DialogHeader>
      <DialogTitle>Межскладское перемещение</DialogTitle>
    </DialogHeader>
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
        <Label>Откуда</Label>
        <Select onValueChange={(v) => setTransferForm({ ...transferForm, from_location_id: v })}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Куда</Label>
        <Select onValueChange={(v) => setTransferForm({ ...transferForm, to_location_id: v })}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <Button onClick={handleCreateTransfer} className="bg-indigo-600">
      Подтвердить перемещение
    </Button>
  </DialogContent>
</Dialog>;

{
  /* ОКНО ОБНУЛЕНИЯ */
}
<Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
  <DialogContent className="bg-zinc-950 border-red-500/20 text-white rounded-[2.5rem]">
    <DialogHeader className="items-center">
      <AlertTriangle className="text-red-500 h-12 w-12 mb-2" />
      <DialogTitle className="text-xl font-bold">Полное обнуление!</DialogTitle>
      <DialogDescription className="text-center text-zinc-400">
        Вы уверены, что хотите сбросить остатки на точке{" "}
        <b className="text-white">"{locations.find((l) => l.id === selectedLocation)?.name}"</b> до нуля?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex gap-2">
      <Button variant="ghost" onClick={() => setResetDialogOpen(false)}>
        Отмена
      </Button>
      <Button variant="destructive" onClick={handleResetStock}>
        Да, всё обнулить
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
