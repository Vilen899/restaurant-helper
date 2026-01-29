import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRightLeft,
  AlertTriangle,
  Plus,
  ClipboardCheck,
  Edit3,
  RefreshCcw,
  Trash2,
  Package,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryPage() {
  // --- STATES ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Modals States
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Forms Data
  const [editingItem, setEditingItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [transferForm, setTransferForm] = useState({
    from_id: "",
    to_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [stocktakingItems, setStocktakingItems] = useState<any[]>([]);

  // --- DATA FETCHING ---
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

  // --- LOGIC: SUPPLY (ПОСТАВКА) ---
  const handleCreateSupply = async () => {
    if (!supplyForm.location_id) return toast.error("Выберите точку назначения");

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
      toast.success("Поставка успешно принята");
      setSupplyDialogOpen(false);
      setSupplyForm({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка при выполнении поставки");
    }
  };

  // --- LOGIC: TRANSFER (ПЕРЕМЕЩЕНИЕ) ---
  const handleCreateTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите обе точки");
    if (transferForm.from_id === transferForm.to_id) return toast.error("Точки должны быть разными");

    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);

        // Subtract from source
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

        // Add to destination
        const { data: tEx } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (tEx)
          await supabase
            .from("inventory")
            .update({ quantity: Number(tEx.quantity) + qty })
            .eq("id", tEx.id);
        else
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to_id, ingredient_id: item.ingredient_id, quantity: qty });
      }
      toast.success("Перемещение завершено");
      setTransferDialogOpen(false);
      setTransferForm({ from_id: "", to_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка перемещения");
    }
  };

  // --- LOGIC: STOCKTAKING (ИНВЕНТАРИЗАЦИЯ) ---
  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Сначала выберите точку в фильтре!");

    const items = inventory
      .filter((i) => i.location_id === selectedLocation)
      .map((i) => ({
        id: i.id,
        name: i.ingredient?.name || "Неизвестно",
        system: i.quantity || 0,
        actual: (i.quantity || 0).toString(),
      }));

    if (items.length === 0) return toast.error("На этой точке нет товаров для проверки");

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
      toast.success("Данные обновлены");
      setStocktakingDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // --- HELPERS ---
  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);

  const addSupplyRow = () =>
    setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { ingredient_id: "", quantity: "" }] });
  const addTransferRow = () =>
    setTransferForm({ ...transferForm, items: [...transferForm.items, { ingredient_id: "", quantity: "" }] });

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-950 min-h-screen text-white font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase italic tracking-tight text-indigo-500 flex items-center gap-3">
            <Package className="w-10 h-10" /> Global Inventory
          </h1>
          <p className="text-zinc-500 font-medium">Контроль остатков, приходы и перемещения</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={openStocktaking}
            className="bg-white/5 border-white/10 hover:bg-white/10 h-12 rounded-xl"
          >
            <ClipboardCheck className="w-5 h-5 mr-2 text-indigo-400" /> Инвентарь
          </Button>
          <Button
            variant="outline"
            onClick={() => setTransferDialogOpen(true)}
            className="bg-white/5 border-white/10 hover:bg-white/10 h-12 rounded-xl"
          >
            <ArrowRightLeft className="w-5 h-5 mr-2 text-orange-400" /> Перемещение
          </Button>
          <Button
            onClick={() => setSupplyDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 h-12 px-6 rounded-xl font-bold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5 mr-2" /> Новая поставка
          </Button>
        </div>
      </div>

      {/* FILTERS SECTION */}
      <Card className="bg-zinc-900/50 border-white/5 p-4 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              placeholder="Поиск по названию ингредиента..."
              className="pl-12 bg-zinc-900 border-white/10 h-14 text-lg rounded-xl focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="bg-zinc-900 border-white/10 h-14 text-lg rounded-xl">
              <SelectValue placeholder="Все локации" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white text-lg">
              <SelectItem value="all">Все склады</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* MAIN TABLE */}
      <Card className="bg-zinc-900/40 border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 h-16">
              <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-widest pl-6">
                Товар / Ингредиент
              </TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-widest text-center">
                Текущий Остаток
              </TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-widest text-center">
                Локация
              </TableHead>
              <TableHead className="text-right pr-6 text-zinc-400 font-bold uppercase text-xs tracking-widest">
                Действия
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 text-lg italic">
                  Позиции не найдены...
                </TableCell>
              </TableRow>
            ) : (
              filteredInv.map((item) => (
                <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-all group">
                  <TableCell className="pl-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xl font-bold group-hover:text-indigo-400 transition-colors">
                        {item.ingredient?.name}
                      </span>
                      <span className="text-xs text-zinc-500 uppercase tracking-tighter">
                        ID: {item.id.split("-")[0]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-2xl font-black font-mono ${item.quantity <= 5 ? "text-red-500" : "text-emerald-400"}`}
                      >
                        {Number(item.quantity).toFixed(2)}
                      </span>
                      <Badge variant="secondary" className="bg-zinc-800 text-[10px] text-zinc-400 h-5 mt-1">
                        {item.ingredient?.unit?.abbreviation}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 rounded-lg text-sm">
                      {item.location?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                          setEditDialogOpen(true);
                        }}
                        className="hover:bg-indigo-500/20 text-indigo-400"
                      >
                        <Edit3 className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (confirm("Удалить позицию со склада?")) {
                            await supabase.from("inventory").delete().eq("id", item.id);
                            fetchData();
                          }
                        }}
                        className="hover:bg-red-500/20 text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DIALOG: SUPPLY */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl rounded-[2.5rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black flex items-center gap-3">
              <ArrowDownToLine className="text-emerald-500" /> Приход товара
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Выберите склад и добавьте продукты, которые поступили
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 ml-1 uppercase text-[10px] font-bold">Склад назначения</Label>
              <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl">
                  <SelectValue placeholder="Выберите точку прихода" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-white border-white/10">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {supplyForm.items.map((it, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] text-zinc-500 uppercase ml-1">Ингредиент</Label>
                    <Select
                      onValueChange={(v) => {
                        const n = [...supplyForm.items];
                        n[idx].ingredient_id = v;
                        setSupplyForm({ ...supplyForm, items: n });
                      }}
                    >
                      <SelectTrigger className="bg-zinc-950 border-white/10 h-12 rounded-xl">
                        <SelectValue placeholder="Поиск товара" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-white border-white/10">
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-2">
                    <Label className="text-[10px] text-zinc-500 uppercase ml-1">Кол-во</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="bg-zinc-950 border-white/10 h-12 rounded-xl text-center text-lg font-mono"
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
              onClick={addSupplyRow}
              className="w-full border-dashed border-white/20 h-12 rounded-2xl text-zinc-400 hover:text-white hover:border-white"
            >
              + Добавить еще товар
            </Button>
            <Button
              onClick={handleCreateSupply}
              className="w-full bg-emerald-600 hover:bg-emerald-500 h-16 rounded-2xl text-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
            >
              Провести приход
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: STOCKTAKING */}
      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-3xl rounded-[2.5rem] p-8 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black flex items-center gap-3">
              <RefreshCcw className="text-indigo-400 animate-spin-slow" /> Инвентаризация
            </DialogTitle>
            <DialogDescription className="text-zinc-400 font-bold">
              Точка: {locations.find((l) => l.id === selectedLocation)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-6 border border-white/5 rounded-3xl bg-black/20">
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 z-20">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="py-4 pl-6">Название</TableHead>
                  <TableHead className="text-center">В системе</TableHead>
                  <TableHead className="text-right pr-6 w-[200px]">Реальный факт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocktakingItems.map((item, idx) => (
                  <TableRow key={item.id} className="border-white/5 h-16">
                    <TableCell className="pl-6 font-bold text-lg">{item.name}</TableCell>
                    <TableCell className="text-center font-mono text-zinc-500">
                      {Number(item.system).toFixed(2)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Input
                        type="number"
                        value={item.actual}
                        className="bg-white/5 border-white/10 h-12 text-right text-xl font-black text-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
          <Button
            onClick={handleSaveStocktaking}
            className="w-full bg-indigo-600 hover:bg-indigo-500 h-16 rounded-2xl text-xl font-black uppercase tracking-widest"
          >
            Обновить остатки
          </Button>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT SINGLE ITEM */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic">Корректировка: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="text-zinc-500 uppercase text-[10px] font-bold ml-1">Новое количество</Label>
            <Input
              type="number"
              value={editingItem?.qty}
              className="bg-white/5 border-white/10 h-20 text-center text-5xl font-black font-mono rounded-2xl text-indigo-400"
              onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
            />
          </div>
          <Button
            onClick={async () => {
              await supabase
                .from("inventory")
                .update({ quantity: Number(editingItem.qty) })
                .eq("id", editingItem.id);
              setEditDialogOpen(false);
              fetchData();
              toast.success("Остаток изменен");
            }}
            className="w-full bg-indigo-600 h-14 rounded-xl text-lg font-bold"
          >
            Сохранить
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
