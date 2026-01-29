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
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Импорты UI компонентов из папки компонентов
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  // --- СОСТОЯНИЯ ДАННЫХ ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // --- СОСТОЯНИЯ МОДАЛЬНЫХ ОКОН ---
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // --- СОСТОЯНИЯ ФОРМ ---
  const [editingItem, setEditingItem] = useState<any>(null);
  const [stocktakingItems, setStocktakingItems] = useState<any[]>([]);
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [transferForm, setTransferForm] = useState({
    from_id: "",
    to_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });

  // Загрузка данных при старте
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

      setInventory(inv || []);
      setIngredients(ings || []);
      setLocations(locs || []);
    } catch (e) {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };
  // --- ЛОГИКА ПОСТАВКИ ---
  const handleCreateSupply = async () => {
    if (!supplyForm.location_id) return toast.error("Выберите точку прихода");
    try {
      for (const item of supplyForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);

        const { data: exist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.location_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (exist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exist.quantity) + qty })
            .eq("id", exist.id);
        } else {
          await supabase.from("inventory").insert({
            location_id: supplyForm.location_id,
            ingredient_id: item.ingredient_id,
            quantity: qty,
          });
        }
      }
      toast.success("Поставка проведена");
      setSupplyDialogOpen(false);
      setSupplyForm({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка поставки");
    }
  };

  // --- ЛОГИКА ПЕРЕМЕЩЕНИЯ ---
  const handleCreateTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите точки");
    if (transferForm.from_id === transferForm.to_id) return toast.error("Точки должны быть разными");

    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);

        // 1. Уменьшаем у отправителя
        const { data: fEx } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (fEx)
          await supabase
            .from("inventory")
            .update({ quantity: Number(fEx.quantity) - qty })
            .eq("id", fEx.id);

        // 2. Увеличиваем у получателя
        const { data: tEx } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (tEx) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(tEx.quantity) + qty })
            .eq("id", tEx.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to_id, ingredient_id: item.ingredient_id, quantity: qty });
        }
      }
      toast.success("Перемещение завершено");
      setTransferDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка перемещения");
    }
  };

  // --- ИНВЕНТАРИЗАЦИЯ ---
  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Выберите точку в фильтре");
    const items = inventory
      .filter((i) => i.location_id === selectedLocation)
      .map((i) => ({
        id: i.id,
        name: i.ingredient?.name || "Без названия",
        system: i.quantity || 0,
        actual: (i.quantity || 0).toString(),
      }));
    setStocktakingItems(items);
    setStocktakingDialogOpen(true);
  };

  const handleSaveStocktaking = async () => {
    try {
      for (const item of stocktakingItems) {
        await supabase
          .from("inventory")
          .update({ quantity: parseFloat(item.actual) || 0 })
          .eq("id", item.id);
      }
      toast.success("Склад обновлен");
      setStocktakingDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // --- ПРАВКА И УДАЛЕНИЕ ---
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

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Удалить этот товар с этой точки?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      toast.success("Товар удален со склада");
      fetchData();
    }
  };

  const handleResetStock = async () => {
    await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", selectedLocation);
    toast.success("Склад обнулен");
    setResetDialogOpen(false);
    fetchData();
  };

  // Фильтрация для таблицы
  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);
  return (
    <div className="p-4 space-y-6 bg-zinc-950 min-h-screen text-white">
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Inventory <span className="text-indigo-500">System</span>
          </h1>
          <p className="text-zinc-500 text-sm">Управление остатками и логистикой</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openStocktaking} className="bg-white/5 border-white/10">
            <ClipboardCheck className="w-4 h-4 mr-2 text-indigo-400" /> Инвентарь
          </Button>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="bg-white/5 border-white/10">
            <ArrowRightLeft className="w-4 h-4 mr-2 text-orange-400" /> Перемещение
          </Button>
          <Button onClick={() => setSupplyDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      {/* ФИЛЬТРЫ */}
      <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Поиск товара..."
            className="pl-10 bg-zinc-900/50 border-white/10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px] bg-zinc-900/50 border-white/10 h-11">
            <SelectValue placeholder="Все точки" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">Все точки</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ТАБЛИЦА */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden rounded-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent text-zinc-400">
              <TableHead>Товар</TableHead>
              <TableHead>Остаток</TableHead>
              <TableHead>Точка</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="font-semibold">{item.ingredient?.name}</TableCell>
                <TableCell className={`font-mono ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                  {Number(item.quantity).toFixed(2)} {item.ingredient?.unit?.abbreviation}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-indigo-500/20 text-indigo-400">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit3 className="w-4 h-4 text-indigo-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ОКНО ПОСТАВКИ */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle>Принять поставку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Выберите точку прихода" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].ingredient_id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 flex-1">
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
                  type="number"
                  placeholder="Кол-во"
                  className="w-24 bg-white/5 border-white/10"
                  onChange={(e) => {
                    const n = [...supplyForm.items];
                    n[idx].quantity = e.target.value;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-dashed border-white/10"
              onClick={() =>
                setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { ingredient_id: "", quantity: "" }] })
              }
            >
              + Добавить строку
            </Button>
            <Button
              onClick={handleCreateSupply}
              className="w-full bg-emerald-600 h-12 font-bold uppercase tracking-widest"
            >
              Провести на склад
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ОКНО ИНВЕНТАРИЗАЦИИ */}
      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Инвентаризация</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 border border-white/5 rounded-lg">
            <Table>
              <TableHeader className="bg-white/5 sticky top-0">
                <TableRow className="border-white/5">
                  <TableHead>Товар</TableHead>
                  <TableHead>Учет</TableHead>
                  <TableHead className="w-24">Факт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocktakingItems.map((item, idx) => (
                  <TableRow key={item.id} className="border-white/5">
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-zinc-500 font-mono text-xs">{item.system}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.actual}
                        className="bg-zinc-800 h-8 border-white/10"
                        onChange={(e) => {
                          const n = [...stocktakingItems];
                          n[idx].actual = e.target.value;
                          setStocktakingItems(n);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleSaveStocktaking} className="w-full bg-indigo-600 h-12 font-bold">
            Применить изменения
          </Button>
        </DialogContent>
      </Dialog>

      {/* ОКНО ПЕРЕМЕЩЕНИЯ */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Межскладской перенос</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Откуда</Label>
              <Select onValueChange={(v) => setTransferForm({ ...transferForm, from_id: v })}>
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
              <Select onValueChange={(v) => setTransferForm({ ...transferForm, to_id: v })}>
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
          <Button onClick={handleCreateTransfer} className="w-full bg-orange-600 h-12 font-bold">
            Выполнить перенос
          </Button>
        </DialogContent>
      </Dialog>

      {/* ОКНО ПРАВКИ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Правка остатка: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={editingItem?.qty}
            onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
            className="bg-white/5 h-12 text-center text-xl font-mono"
          />
          <Button onClick={handleSingleUpdate} className="w-full bg-indigo-600 mt-4">
            Обновить
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
