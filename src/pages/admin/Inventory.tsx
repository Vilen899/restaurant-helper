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

// Импорты UI компонентов
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function InventoryPage() {
  // --- СОСТОЯНИЯ ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Состояния окон (Dialogs)
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Формы данных
  const [editingItem, setEditingItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    supplier_name: "",
    items: [{ ingredient_id: "", quantity: "", cost: "0" }],
  });
  const [transferForm, setTransferForm] = useState({
    from_id: "",
    to_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [stocktakingItems, setStocktakingItems] = useState<any[]>([]);

  // --- ЗАГРУЗКА ДАННЫХ ---
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

  // --- ЛОГИКА ПЕРЕМЕЩЕНИЯ ---
  const handleCreateTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите точки");
    if (transferForm.from_id === transferForm.to_id) return toast.error("Точки должны быть разными");

    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);

        // Убираем с баланса отправителя
        const { data: fromExist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (fromExist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(fromExist.quantity) - qty })
            .eq("id", fromExist.id);
        }

        // Добавляем на баланс получателя
        const { data: toExist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (toExist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(toExist.quantity) + qty })
            .eq("id", toExist.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to_id, ingredient_id: item.ingredient_id, quantity: qty });
        }
      }
      toast.success("Перемещение успешно выполнено");
      setTransferDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка перемещения");
    }
  };

  {
    /* ДИАЛОГ ПОСТАВКИ */
  }
  <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
    <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-xl rounded-3xl">
      <DialogHeader>
        <DialogTitle>Новая поставка</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Выберите точку прихода</Label>
          <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="Точка" />
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

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {supplyForm.items.map((it, idx) => (
            <div key={idx} className="flex gap-2 items-end border-b border-white/5 pb-3">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500">Товар</Label>
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].ingredient_id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Выбрать" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500">Кол-во</Label>
                <Input
                  type="number"
                  className="bg-white/5 border-white/10"
                  onChange={(e) => {
                    const n = [...supplyForm.items];
                    n[idx].quantity = e.target.value;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full border-dashed border-white/10"
          onClick={() =>
            setSupplyForm({
              ...supplyForm,
              items: [...supplyForm.items, { ingredient_id: "", quantity: "", cost: "0" }],
            })
          }
        >
          + Добавить строку
        </Button>

        <Button
          onClick={handleCreateSupply}
          className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 text-lg font-bold"
        >
          Провести поставку
        </Button>
      </div>
    </DialogContent>
  </Dialog>;

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
    if (!confirm("Удалить товар с этой точки?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      toast.success("Товар удален");
      fetchData();
    }
  };

  const handleResetStock = async () => {
    await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", selectedLocation);
    toast.success("Склад на точке полностью обнулен");
    setResetDialogOpen(false);
    fetchData();
  };

  // --- ФИЛЬТРАЦИЯ ---
  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);

  return (
    <div className="p-4 space-y-6 bg-zinc-950 min-h-screen text-white">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Inventory <span className="text-indigo-500">System</span>
          </h1>
          <p className="text-zinc-500 text-sm">Управление остатками и движением товаров</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openStocktaking} className="bg-white/5 border-white/10 hover:bg-white/10">
            <ClipboardCheck className="w-4 h-4 mr-2 text-indigo-400" /> Инвентарь
          </Button>
          <Button
            variant="outline"
            onClick={() => setTransferDialogOpen(true)}
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2 text-orange-400" /> Перемещение
          </Button>
          <Button onClick={() => setSupplyDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)} disabled={selectedLocation === "all"}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Обнулить
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Поиск по названию..."
            className="pl-10 bg-zinc-900/50 border-white/10 focus:border-indigo-500 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[240px] bg-zinc-900/50 border-white/10 h-11">
            <SelectValue placeholder="Все локации" />
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

      {/* TABLE */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden rounded-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-zinc-400">Товар</TableHead>
              <TableHead className="text-zinc-400">Остаток</TableHead>
              <TableHead className="text-zinc-400">Точка</TableHead>
              <TableHead className="text-right text-zinc-400">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-zinc-500">
                  Ничего не найдено
                </TableCell>
              </TableRow>
            ) : (
              filteredInv.map((item) => (
                <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-semibold">{item.ingredient?.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={`font-mono text-lg ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                        {Number(item.quantity).toFixed(2)}
                      </span>
                      <span className="text-[10px] uppercase text-zinc-500">{item.ingredient?.unit?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                      {item.location?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-indigo-500/20 hover:text-indigo-400"
                        onClick={() => {
                          setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-red-500/20 hover:text-red-500"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ДИАЛОГ ПРАВКИ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>Правка остатка</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Товар: {editingItem?.name}</Label>
              <Input
                type="number"
                value={editingItem?.qty}
                onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
                className="bg-white/5 border-white/10 h-14 text-2xl font-mono text-center"
              />
            </div>
            <Button onClick={handleSingleUpdate} className="w-full bg-indigo-600 h-12 text-lg">
              Сохранить изменения
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ДИАЛОГ ИНВЕНТАРИЗАЦИИ */}
      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl rounded-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Инвентаризация: {locations.find((l) => l.id === selectedLocation)?.name}</DialogTitle>
            <DialogDescription>Введите фактическое количество товара на точке</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 rounded-xl border border-white/5">
            <Table>
              <TableHeader className="bg-white/5 sticky top-0">
                <TableRow className="border-white/5">
                  <TableHead>Товар</TableHead>
                  <TableHead>Учет</TableHead>
                  <TableHead className="w-[140px]">Факт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocktakingItems.map((item, idx) => (
                  <TableRow key={item.id} className="border-white/5">
                    <TableCell className="font-medium text-sm">{item.name}</TableCell>
                    <TableCell className="text-zinc-500 font-mono text-xs">{Number(item.system).toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.actual}
                        className="bg-zinc-800 border-white/10 h-9"
                        onChange={(e) => {
                          const newItems = [...stocktakingItems];
                          newItems[idx].actual = e.target.value;
                          setStocktakingItems(newItems);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleSaveStocktaking} className="w-full bg-indigo-600 h-14 text-lg font-bold">
            Завершить инвентаризацию
          </Button>
        </DialogContent>
      </Dialog>

      {/* ДИАЛОГ ПЕРЕМЕЩЕНИЯ */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Межскладское перемещение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2 border-t border-white/5 pt-4">
              {transferForm.items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select
                    onValueChange={(v) => {
                      const n = [...transferForm.items];
                      n[idx].ingredient_id = v;
                      setTransferForm({ ...transferForm, items: n });
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
                      const n = [...transferForm.items];
                      n[idx].quantity = e.target.value;
                      setTransferForm({ ...transferForm, items: n });
                    }}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleCreateTransfer} className="w-full bg-orange-600 h-12 mt-4 font-bold">
              Выполнить перенос
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ДИАЛОГ ОБНУЛЕНИЯ */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-950 border-red-500/20 text-white rounded-[2rem]">
          <DialogHeader className="items-center">
            <AlertTriangle className="text-red-500 h-16 w-16 mb-4 animate-pulse" />
            <DialogTitle className="text-2xl font-bold">Опасная операция!</DialogTitle>
            <DialogDescription className="text-center text-zinc-400">
              Вы уверены, что хотите обнулить остатки на точке <br />
              <b className="text-white text-lg font-bold">"{locations.find((l) => l.id === selectedLocation)?.name}"</b>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-4 mt-6">
            <Button variant="ghost" onClick={() => setResetDialogOpen(false)} className="flex-1 h-12">
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetStock}
              className="flex-1 h-12 font-bold uppercase tracking-widest"
            >
              Да, всё в ноль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
