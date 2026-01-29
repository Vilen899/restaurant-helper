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
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    items: [{ ingredient_id: "", quantity: "", cost: "0" }],
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

  // --- ЛОГИКА ОБНУЛЕНИЯ ---
  const handleResetStock = async () => {
    if (selectedLocation === "all") return;
    const { error } = await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", selectedLocation);
    if (!error) {
      toast.success("Склад обнулен");
      setResetDialogOpen(false);
      fetchData();
    }
  };

  // --- ТОЧЕЧНАЯ ПРАВКА ---
  const handleSingleUpdate = async () => {
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: parseFloat(editingItem.qty) })
      .eq("id", editingItem.id);
    if (!error) {
      toast.success("Обновлено");
      setEditDialogOpen(false);
      fetchData();
    }
  };

  // --- ПОСТАВКА ---
  const handleCreateSupply = async () => {
    for (const item of supplyForm.items) {
      if (!item.ingredient_id || !item.quantity) continue;
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
        await supabase
          .from("inventory")
          .insert({ location_id: supplyForm.location_id, ingredient_id: item.ingredient_id, quantity: item.quantity });
      }
    }
    toast.success("Поставка сохранена");
    setSupplyDialogOpen(false);
    fetchData();
  };

  // --- ПОДГОТОВКА ИНВЕНТАРИЗАЦИИ ---
  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Выберите точку");
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
    for (const item of stocktakingItems) {
      await supabase.from("inventory").update({ quantity: item.actual }).eq("id", item.id);
    }
    toast.success("Инвентаризация завершена");
    setStocktakingDialogOpen(false);
    fetchData();
  };

  const filteredInv = inventory.filter(
    (i) =>
      i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedLocation === "all" || i.location_id === selectedLocation),
  );

  return (
    <div className="p-4 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div className="flex flex-wrap justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tighter uppercase italic">
          Stock <span className="text-indigo-500">Pro</span>
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openStocktaking} className="border-white/10 bg-white/5">
            <ClipboardCheck className="w-4 h-4 mr-2" /> Инвентарь
          </Button>
          <Button variant="outline" onClick={() => setSupplyDialogOpen(true)} className="border-white/10 bg-white/5">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)} disabled={selectedLocation === "all"}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Обнулить
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Поиск товара..."
          className="bg-white/5 border-white/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
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

      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow>
              <TableHead className="text-zinc-400">Товар</TableHead>
              <TableHead className="text-zinc-400">Остаток</TableHead>
              <TableHead className="text-zinc-400">Точка</TableHead>
              <TableHead className="text-right text-zinc-400">Правка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5">
                <TableCell className="font-medium">{item.ingredient?.name}</TableCell>
                <TableCell
                  className={`font-mono ${item.quantity <= (item.ingredient?.min_stock || 0) ? "text-red-400" : "text-emerald-400"}`}
                >
                  {Number(item.quantity).toFixed(2)} {item.ingredient?.unit?.abbreviation}
                </TableCell>
                <TableCell className="text-zinc-500 text-sm">{item.location?.name}</TableCell>
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

      {/* DIALOGS */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Правка: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={editingItem?.qty}
            onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
            className="bg-white/5 border-white/10 h-12 text-xl"
          />
          <Button onClick={handleSingleUpdate} className="bg-indigo-600 hover:bg-indigo-500">
            Сохранить
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-900 border-red-500/20 text-white">
          <DialogHeader className="items-center">
            <AlertTriangle className="text-red-500 w-12 h-12" />
            <DialogTitle>Обнулить склад?</DialogTitle>
          </DialogHeader>
          <Button variant="destructive" onClick={handleResetStock} className="h-12 text-lg">
            ДА, СБРОСИТЬ ВСЁ В 0
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Приход товара</DialogTitle>
          </DialogHeader>
          <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
            <SelectTrigger className="bg-white/5 border-white/10">
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
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {supplyForm.items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].ingredient_id = v;
                    setSupplyForm({ ...supplyForm, items: n });
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
                  placeholder="Кол-во"
                  type="number"
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
              variant="ghost"
              className="w-full text-indigo-400"
              onClick={() =>
                setSupplyForm({
                  ...supplyForm,
                  items: [...supplyForm.items, { ingredient_id: "", quantity: "", cost: "0" }],
                })
              }
            >
              + Добавить строку
            </Button>
          </div>
          <Button onClick={handleCreateSupply} className="bg-emerald-600 hover:bg-emerald-500 h-12">
            Зачислить на склад
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Инвентаризация: {locations.find((l) => l.id === selectedLocation)?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto border border-white/5 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>Система</TableHead>
                  <TableHead>Факт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocktakingItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-zinc-500">{item.system}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.actual}
                        className="w-24 bg-white/5 h-8"
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
          <Button onClick={handleSaveStocktaking} className="bg-indigo-600 h-12">
            Обновить остатки по факту
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
