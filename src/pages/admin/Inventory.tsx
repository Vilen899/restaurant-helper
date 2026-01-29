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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Окна
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Данные форм
  const [editItem, setEditItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [transferForm, setTransferForm] = useState({
    from_id: "",
    to_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });
  const [stockItems, setStockItems] = useState<any[]>([]);

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

  const handleSupply = async () => {
    if (!supplyForm.location_id) return toast.error("Выберите точку");
    try {
      for (const item of supplyForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const { data: ex } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.location_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (ex) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(ex.quantity) + Number(item.quantity) })
            .eq("id", ex.id);
        } else {
          await supabase
            .from("inventory")
            .insert({
              location_id: supplyForm.location_id,
              ingredient_id: item.ingredient_id,
              quantity: Number(item.quantity),
            });
        }
      }
      toast.success("Поставка принята");
      setSupplyOpen(false);
      setSupplyForm({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите точки");
    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);
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
      toast.success("Перемещено");
      setTransferOpen(false);
      fetchData();
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
    setStockItems(items);
    setStockOpen(true);
  };

  const handleSaveStock = async () => {
    for (const item of stockItems) {
      await supabase
        .from("inventory")
        .update({ quantity: Number(item.actual) })
        .eq("id", item.id);
    }
    setStockOpen(false);
    fetchData();
    toast.success("Инвентаризация сохранена");
  };

  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);

  return (
    <div className="p-4 bg-zinc-950 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black italic text-indigo-500 uppercase">Склад v2.0</h1>
        <div className="flex gap-2">
          <Button onClick={openStocktaking} variant="outline" className="bg-white/5 border-white/10">
            <ClipboardCheck className="w-4 h-4 mr-2" /> Инвентарь
          </Button>
          <Button onClick={() => setTransferOpen(true)} variant="outline" className="bg-white/5 border-white/10">
            <ArrowRightLeft className="w-4 h-4 mr-2 text-orange-400" /> Перенос
          </Button>
          <Button onClick={() => setSupplyOpen(true)} className="bg-emerald-600 font-bold">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Input
          placeholder="Поиск товара..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-zinc-900 border-white/10 h-12"
        />
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="bg-zinc-900 border-white/10 h-12">
            <SelectValue placeholder="Все локации" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white">
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead>Товар</TableHead>
              <TableHead>Остаток</TableHead>
              <TableHead>Точка</TableHead>
              <TableHead className="text-right">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5">
                <TableCell className="font-bold">{item.ingredient?.name}</TableCell>
                <TableCell className="text-emerald-400 font-mono text-lg">
                  {item.quantity} {item.ingredient?.unit?.abbreviation}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-indigo-500/30">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                      setEditOpen(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (confirm("Удалить?")) {
                        await supabase.from("inventory").delete().eq("id", item.id);
                        fetchData();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ПОСТАВКА */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Приход товара</DialogTitle>
          </DialogHeader>
          <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
            <SelectTrigger className="bg-white/5 border-white/10 h-12">
              <SelectValue placeholder="Выберите точку" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white">
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
                <SelectContent className="bg-zinc-900 text-white">
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
            onClick={() =>
              setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { ingredient_id: "", quantity: "" }] })
            }
          >
            + Товар
          </Button>
          <Button onClick={handleSupply} className="w-full bg-emerald-600 h-12 text-lg font-bold">
            Зачислить
          </Button>
        </DialogContent>
      </Dialog>

      {/* ПЕРЕНОС */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Межскладской перенос</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, from_id: v })}>
              <SelectTrigger className="bg-white/5">
                <SelectValue placeholder="Откуда" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white">
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, to_id: v })}>
              <SelectTrigger className="bg-white/5">
                <SelectValue placeholder="Куда" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white">
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
                <SelectTrigger className="bg-white/5 flex-1">
                  <SelectValue placeholder="Товар" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-white">
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
                className="w-24 bg-white/5"
                onChange={(e) => {
                  const n = [...transferForm.items];
                  n[idx].quantity = e.target.value;
                  setTransferForm({ ...transferForm, items: n });
                }}
              />
            </div>
          ))}
          <Button onClick={handleTransfer} className="w-full bg-orange-600 h-12 text-lg font-bold">
            Переместить
          </Button>
        </DialogContent>
      </Dialog>

      {/* ИНВЕНТАРИЗАЦИЯ */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Инвентаризация</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead>Учет</TableHead>
                <TableHead>Факт</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.map((it, idx) => (
                <TableRow key={it.id} className="border-white/5">
                  <TableCell>{it.name}</TableCell>
                  <TableCell className="text-zinc-500">{it.system}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={it.actual}
                      onChange={(e) => {
                        const n = [...stockItems];
                        n[idx].actual = e.target.value;
                        setStockItems(n);
                      }}
                      className="bg-zinc-800 h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={handleSaveStock} className="w-full bg-indigo-600 h-12 mt-4">
            Применить изменения
          </Button>
        </DialogContent>
      </Dialog>

      {/* ПРАВКА */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Правка: {editItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={editItem?.qty}
            onChange={(e) => setEditItem({ ...editItem, qty: e.target.value })}
            className="h-14 text-center text-2xl font-mono bg-white/5"
          />
          <Button
            onClick={async () => {
              await supabase
                .from("inventory")
                .update({ quantity: Number(editItem.qty) })
                .eq("id", editItem.id);
              setEditOpen(false);
              fetchData();
            }}
            className="w-full bg-indigo-600 h-12 font-bold uppercase tracking-wider"
          >
            Обновить
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
