import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRightLeft, AlertTriangle, Plus, ClipboardCheck, Edit3, RefreshCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
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
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

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
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupply = async () => {
    if (!supplyForm.location_id) return toast.error("Выберите точку");
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
          await supabase
            .from("inventory")
            .insert({ location_id: supplyForm.location_id, ingredient_id: item.ingredient_id, quantity: qty });
        }
      }
      toast.success("Поставка принята");
      setSupplyDialogOpen(false);
      setSupplyForm({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка поставки");
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите точки");
    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);
        // Минус у отправителя
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
        // Плюс у получателя
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
      setTransferDialogOpen(false);
      fetchData();
      toast.success("Перемещено");
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Сначала выберите точку в фильтре!");
    const items = inventory
      .filter((i) => i.location_id === selectedLocation)
      .map((i) => ({
        id: i.id,
        name: i.ingredient?.name,
        system: i.quantity,
        actual: i.quantity.toString(),
      }));
    setStocktakingItems(items);
    setStocktakingDialogOpen(true);
  };

  const handleSaveStocktaking = async () => {
    for (const item of stocktakingItems) {
      await supabase
        .from("inventory")
        .update({ quantity: parseFloat(item.actual) || 0 })
        .eq("id", item.id);
    }
    setStocktakingDialogOpen(false);
    fetchData();
    toast.success("Инвентаризация сохранена");
  };

  const handleSingleUpdate = async () => {
    await supabase
      .from("inventory")
      .update({ quantity: parseFloat(editingItem.qty) })
      .eq("id", editingItem.id);
    setEditDialogOpen(false);
    fetchData();
    toast.success("Обновлено");
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Удалить позицию?")) return;
    await supabase.from("inventory").delete().eq("id", id);
    fetchData();
  };

  const handleResetStock = async () => {
    await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", selectedLocation);
    setResetDialogOpen(false);
    fetchData();
    toast.success("Склад обнулен");
  };

  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);

  return (
    <div className="p-4 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black uppercase italic italic text-indigo-500">Inventory</h1>
          <p className="text-zinc-500">Управление складом</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openStocktaking} className="bg-white/5 border-white/10">
            <ClipboardCheck className="w-4 h-4 mr-2 text-indigo-400" /> Инвентарь
          </Button>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="bg-white/5 border-white/10">
            <ArrowRightLeft className="w-4 h-4 mr-2 text-orange-400" /> Перенос
          </Button>
          <Button onClick={() => setSupplyDialogOpen(true)} className="bg-indigo-600">
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
          <SelectTrigger className="w-64 bg-white/5 border-white/10">
            <SelectValue placeholder="Все точки" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white border-white/10">
            <SelectItem value="all">Все точки</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-zinc-900/50 border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead>Товар</TableHead>
              <TableHead>Остаток</TableHead>
              <TableHead>Точка</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5">
                <TableCell className="font-bold">{item.ingredient?.name}</TableCell>
                <TableCell className="font-mono text-emerald-400">
                  {Number(item.quantity).toFixed(2)} {item.ingredient?.unit?.abbreviation}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.location?.name}</Badge>
                </TableCell>
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
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* MODALS */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Приход товара</DialogTitle>
          </DialogHeader>
          <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="Выберите точку" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white border-white/10">
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
                <SelectContent className="bg-zinc-900 text-white border-white/10">
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
            className="w-full border-dashed"
            onClick={() =>
              setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { ingredient_id: "", quantity: "" }] })
            }
          >
            + Строка
          </Button>
          <Button onClick={handleCreateSupply} className="w-full bg-emerald-600">
            Зачислить
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Инвентаризация</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto my-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>Система</TableHead>
                  <TableHead>Факт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocktakingItems.map((it, idx) => (
                  <TableRow key={it.id} className="border-white/5">
                    <TableCell>{it.name}</TableCell>
                    <TableCell className="text-zinc-500">{it.system}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={it.actual}
                        className="h-8 bg-zinc-800"
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
          <Button onClick={handleSaveStocktaking} className="w-full bg-indigo-600">
            Сохранить
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Правка: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={editingItem?.qty}
            onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
            className="bg-white/5 h-12 text-center text-xl"
          />
          <Button onClick={handleSingleUpdate} className="w-full bg-indigo-600 mt-4">
            Обновить
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-950 border-red-500/20 text-white">
          <DialogHeader className="items-center">
            <AlertTriangle className="text-red-500 h-12 w-12" />
            <DialogTitle>Обнулить склад?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleResetStock}>
              Да, обнулить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
