import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRightLeft,
  Plus,
  ClipboardCheck,
  Edit3,
  Trash2,
  Package,
  Calculator,
  X,
  PlusCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<string>("all");

  // Modals
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Forms
  const [editItem, setEditItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    loc_id: "",
    inn: "",
    series: "",
    num: "",
    total: "",
    items: [{ id: "", qty: "" }],
  });
  const [stockItems, setStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
    const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    setInventory(inv || []);
    setIngredients(ings || []);
    setLocations(locs || []);
  };

  // --- ПОСТАВКА ---
  const handleSupply = async () => {
    if (supplyForm.inn.length !== 8) return toast.error("ИНН в Армении должен быть 8 цифр");
    if (!supplyForm.loc_id) return toast.error("Выбери склад");

    try {
      for (const item of supplyForm.items) {
        if (!item.id || !item.qty) continue;
        const { data: ex } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.loc_id)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (ex) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(ex.quantity) + Number(item.qty) })
            .eq("id", ex.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: supplyForm.loc_id, ingredient_id: item.id, quantity: Number(item.qty) });
        }
      }
      toast.success(`Документ ${supplyForm.series}-${supplyForm.num} сохранен`);
      setSupplyOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  // --- ИНВЕНТАРИЗАЦИЯ ---
  const startStock = () => {
    if (selectedLoc === "all") return toast.error("Сначала выбери склад в фильтре!");
    const current = inventory
      .filter((i) => i.location_id === selectedLoc)
      .map((i) => ({
        inv_id: i.id,
        ing_id: i.ingredient_id,
        name: i.ingredient?.name,
        sys: i.quantity,
        act: i.quantity.toString(),
        isNew: false,
      }));
    setStockItems(current);
    setStockOpen(true);
  };

  const saveStock = async () => {
    try {
      for (const it of stockItems) {
        if (!it.ing_id) continue;
        if (it.inv_id) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(it.act) })
            .eq("id", it.inv_id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: selectedLoc, ingredient_id: it.ing_id, quantity: Number(it.act) });
        }
      }
      toast.success("Склад обновлен");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  const filtered = inventory.filter(
    (i) =>
      ings
        .find((ing) => ing.id === i.ingredient_id)
        ?.name.toLowerCase()
        .includes(searchTerm.toLowerCase()) &&
      (selectedLoc === "all" || i.location_id === selectedLoc),
  );

  return (
    <div className="p-6 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-indigo-500 uppercase italic">Warehouse ARM</h1>
        <div className="flex gap-2">
          <Button onClick={startStock} variant="outline" className="h-12 rounded-xl border-white/10">
            <Calculator className="w-4 h-4 mr-2" /> Инвентарь
          </Button>
          <Button onClick={() => setSupplyOpen(true)} className="h-12 rounded-xl bg-indigo-600 px-6 font-bold">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Поиск..."
          className="col-span-3 h-12 bg-zinc-900 border-white/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="h-12 bg-zinc-900 border-white/10">
            <SelectValue />
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

      <Card className="bg-zinc-900/50 border-white/5 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5">
              <TableHead>Товар</TableHead>
              <TableHead className="text-center">Остаток</TableHead>
              <TableHead className="text-right pr-6">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="border-white/5 group">
                <TableCell className="font-bold">{item.ingredient?.name}</TableCell>
                <TableCell
                  className={`text-center font-mono text-xl ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                >
                  {Number(item.quantity).toFixed(2)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditItem(item);
                      setEditOpen(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4 text-indigo-400" />
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
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Накладная</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <Label className="text-xs text-zinc-500">ИНН (8 цифр)</Label>
              <Input
                maxLength={8}
                className="bg-black border-white/10"
                value={supplyForm.inn}
                onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Склад</Label>
              <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                <SelectTrigger className="bg-black border-white/10">
                  <SelectValue placeholder="Выбрать" />
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
            <div className="flex gap-2">
              <Input
                placeholder="Сер"
                className="w-16 bg-black border-white/10"
                value={supplyForm.series}
                onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
              />
              <Input
                placeholder="Номер док"
                className="flex-1 bg-black border-white/10"
                value={supplyForm.num}
                onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
              />
            </div>
            <Input
              placeholder="Сумма"
              className="bg-black border-white/10"
              value={supplyForm.total}
              onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
            />
          </div>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 bg-black/40 p-2 rounded-lg">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="flex-1 h-9 bg-transparent border-none">
                    <SelectValue placeholder="Товар" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 text-white">
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Кол"
                  className="w-20 h-9 bg-zinc-800"
                  onChange={(e) => {
                    const n = [...supplyForm.items];
                    n[idx].qty = e.target.value;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { id: "", qty: "" }] })}
            className="w-full text-zinc-500 mt-2"
          >
            + Добавить строку
          </Button>
          <Button onClick={handleSupply} className="w-full bg-indigo-600 h-14 mt-4 font-bold rounded-xl">
            Провести
          </Button>
        </DialogContent>
      </Dialog>

      {/* ИНВЕНТАРИЗАЦИЯ */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-4xl h-[80vh] flex flex-col rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Сверка: {locations.find((l) => l.id === selectedLoc)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 rounded-xl border border-white/5 bg-black/20">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-900">
                <TableRow className="border-white/10">
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-center">Система</TableHead>
                  <TableHead className="text-center">Факт</TableHead>
                  <TableHead className="text-right pr-4">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const diff = Number(it.act) - Number(it.sys);
                  return (
                    <TableRow key={idx} className="border-white/5 h-12">
                      <TableCell className="font-medium">
                        {it.isNew ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ing_id = v;
                              n[idx].name = ingredients.find((i) => i.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="h-8 bg-zinc-800">
                              <SelectValue placeholder="Выбор" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 text-white">
                              {ingredients.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          it.name
                        )}
                      </TableCell>
                      <TableCell className="text-center text-zinc-500">{Number(it.sys).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={it.act}
                          onChange={(e) => {
                            const n = [...stockItems];
                            n[idx].act = e.target.value;
                            setStockItems(n);
                          }}
                          className="w-20 h-8 mx-auto text-center bg-zinc-800 border-none font-bold text-indigo-400"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-4 font-bold ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-600"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
              className="flex-1 border-dashed"
            >
              + Добавить товар
            </Button>
            <Button onClick={saveStock} className="flex-[2] bg-indigo-600 font-bold">
              Сохранить инвентаризацию
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* КОРРЕКТИРОВКА / ОБНУЛЕНИЕ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>Редактировать: {editItem?.ingredient?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red-500/50 text-red-500"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Обнулить
              </Button>
              <Input
                type="number"
                className="flex-1 bg-black text-center text-xl font-bold"
                value={editItem?.quantity}
                onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
              />
            </div>
            <Button
              className="w-full bg-indigo-600"
              onClick={async () => {
                await supabase
                  .from("inventory")
                  .update({ quantity: Number(editItem.quantity) })
                  .eq("id", editItem.id);
                setEditOpen(false);
                fetchData();
                toast.success("Обновлено");
              }}
            >
              Сохранить изменения
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
