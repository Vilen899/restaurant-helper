import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Package,
  ArrowRightLeft,
  Plus,
  Database,
  ClipboardCheck,
  Edit3,
  RefreshCcw,
  Check,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Состояния окон
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Формы
  const [editingItem, setEditingItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
  const [transferForm, setTransferForm] = useState({
    from_id: "",
    to_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [stocktakingItems, setStocktakingItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
    const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    setInventory(inv || []);
    setIngredients(ings || []);
    setLocations(locs || []);
    setLoading(false);
  };

  // --- ЛОГИКА ПЕРЕМЕЩЕНИЯ (РАБОТАЕТ ТЕПЕРЬ) ---
  const handleCreateTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите обе точки");
    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);

        // 1. Снимаем с первой точки
        const { data: invFrom } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (invFrom)
          await supabase
            .from("inventory")
            .update({ quantity: Number(invFrom.quantity) - qty })
            .eq("id", invFrom.id);

        // 2. Добавляем на вторую точку
        const { data: invTo } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (invTo) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(invTo.quantity) + qty })
            .eq("id", invTo.id);
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
      toast.error("Ошибка");
    }
  };

  // --- ЛОГИКА ИНВЕНТАРИЗАЦИИ (РАБОТАЕТ ТЕПЕРЬ) ---
  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Сначала выберите точку в фильтре");
    const items = inventory
      .filter((i) => i.location_id === selectedLocation)
      .map((i) => ({
        id: i.id,
        name: i.ingredient?.name,
        system: i.quantity,
        actual: i.quantity,
      }));
    setStocktakingItems(items);
    setStocktakingDialogOpen(true);
  };

  const handleSaveStocktaking = async () => {
    try {
      for (const item of stocktakingItems) {
        await supabase
          .from("inventory")
          .update({ quantity: parseFloat(item.actual) })
          .eq("id", item.id);
      }
      toast.success("Данные обновлены");
      setStocktakingDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // --- ОБНУЛЕНИЕ ---
  const handleResetStock = async () => {
    await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", selectedLocation);
    toast.success("Сброшено");
    setResetDialogOpen(false);
    fetchData();
  };

  // --- ПРАВКА ---
  const handleSingleUpdate = async () => {
    await supabase
      .from("inventory")
      .update({ quantity: parseFloat(editingItem.qty) })
      .eq("id", editingItem.id);
    toast.success("Исправлено");
    setEditDialogOpen(false);
    fetchData();
  };

  const filteredInv = inventory.filter(
    (i) =>
      i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedLocation === "all" || i.location_id === selectedLocation),
  );

  return (
    <div className="p-4 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold uppercase tracking-tighter italic">
          Stock <span className="text-indigo-500">Master</span>
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openStocktaking} className="bg-white/5 border-white/10">
            <ClipboardCheck className="w-4 h-4 mr-2" /> Инвентарь
          </Button>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="bg-white/5 border-white/10">
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Перемещение
          </Button>
          <Button onClick={() => setSupplyDialogOpen(true)} className="bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)} disabled={selectedLocation === "all"}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Обнулить
          </Button>
        </div>
      </div>

      {/* Таблица и фильтры такие же, как в прошлом коде... */}
      <div className="flex gap-4">
        <Input
          placeholder="Поиск..."
          className="bg-white/5 border-white/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
            <SelectValue placeholder="Локация" />
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

      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Товар</TableHead>
              <TableHead>Кол-во</TableHead>
              <TableHead>Точка</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5">
                <TableCell>{item.ingredient?.name}</TableCell>
                <TableCell className="font-mono text-emerald-400">{Number(item.quantity).toFixed(2)}</TableCell>
                <TableCell className="text-zinc-500">{item.location?.name}</TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ДИАЛОГ ПЕРЕМЕЩЕНИЯ */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Переместить товар</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, from_id: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Откуда" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, to_id: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Куда" />
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
          {transferForm.items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <Select
                onValueChange={(v) => {
                  const n = [...transferForm.items];
                  n[idx].ingredient_id = v;
                  setTransferForm({ ...transferForm, items: n });
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
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
          <Button onClick={handleCreateTransfer} className="bg-indigo-600 h-12 mt-4">
            Выполнить перемещение
          </Button>
        </DialogContent>
      </Dialog>

      // 1. Исправленная функция открытия (добавлена поддержка пустых значений)
  const openStocktaking = () => {
    if (selectedLocation === "all") {
      toast.error("Сначала выберите точку в фильтре (справа от поиска)");
      return;
    }
    const items = inventory
      .filter(i => i.location_id === selectedLocation)
      .map(i => ({
        id: i.id, 
        ingredient_id: i.ingredient_id,
        name: i.ingredient?.name || "Без названия", 
        system: i.quantity || 0, 
        actual: i.quantity.toString() // Работаем со строкой для удобства ввода
      }));
    
    if (items.length === 0) {
      toast.error("На этой точке еще нет товаров");
      return;
    }
    
    setStocktakingItems(items);
    setStocktakingDialogOpen(true);
  };

  // 2. Исправленный диалог с работающим вводом
  <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
    <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Инвентаризация: {locations.find(l => l.id === selectedLocation)?.name}</DialogTitle>
        <DialogDescription className="text-zinc-400">Введите реальное количество товара на полке</DialogDescription>
      </DialogHeader>
      
      <div className="flex-1 overflow-y-auto my-4 border border-white/5 rounded-lg">
        <Table>
          <TableHeader className="bg-white/5 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-zinc-300">Товар</TableHead>
              <TableHead className="text-zinc-300">Система</TableHead>
              <TableHead className="text-zinc-300 w-[120px]">Факт</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocktakingItems.map((item, idx) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-zinc-500">{Number(item.system).toFixed(2)}</TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={item.actual} 
                    className="bg-zinc-800 border-white/10 h-9 focus:ring-indigo-500"
                    onChange={(e) => {
                      const newItems = [...stocktakingItems];
                      newItems[idx].actual = e.target.value; // Теперь текст будет меняться!
                      setStocktakingItems(newItems);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <DialogFooter>
        <Button 
          onClick={handleSaveStocktaking} 
          className="bg-indigo-600 hover:bg-indigo-500 w-full h-12 text-lg font-bold"
        >
          Применить остатки
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
      {/* Окна Правки и Обнуления из прошлого кода также остаются здесь... */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Правка {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={editingItem?.qty}
            onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
            className="bg-white/5 h-12 text-lg"
          />
          <Button onClick={handleSingleUpdate} className="bg-indigo-600">
            Сохранить
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-900 border-red-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-500">ВНИМАНИЕ!</DialogTitle>
            <DialogDescription>
              Сбросить в 0 остатки на {locations.find((l) => l.id === selectedLocation)?.name}?
            </DialogDescription>
          </DialogHeader>
          <Button variant="destructive" onClick={handleResetStock} className="h-12">
            ДА, ОБНУЛИТЬ ВСЁ
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
