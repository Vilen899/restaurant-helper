import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRightLeft,
  Plus,
  ClipboardCheck,
  Edit3,
  Trash2,
  Calculator,
  X,
  PlusCircle,
  RotateCcw,
  Save,
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

  const [supplyOpen, setSupplyOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [editItem, setEditItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    loc_id: "",
    inn: "",
    series: "",
    num: "",
    total: "",
    items: [{ id: "", qty: "" }],
  });
  const [transferForm, setTransferForm] = useState({ from: "", to: "", items: [{ id: "", qty: "" }] });
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
    if (supplyForm.inn.length !== 8) return toast.error("ИНН Армении — 8 цифр");
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
      toast.success("Поставка проведена");
      setSupplyOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  // --- ПЕРЕМЕЩЕНИЕ ---
  const handleTransfer = async () => {
    if (!transferForm.from || !transferForm.to) return toast.error("Выберите склады");
    try {
      for (const item of transferForm.items) {
        if (!item.id || !item.qty) continue;
        const { data: exFrom } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (!exFrom || exFrom.quantity < item.qty) {
          toast.error(`Мало товара ${item.id}`);
          continue;
        }
        await supabase
          .from("inventory")
          .update({ quantity: Number(exFrom.quantity) - Number(item.qty) })
          .eq("id", exFrom.id);
        const { data: exTo } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (exTo) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exTo.quantity) + Number(item.qty) })
            .eq("id", exTo.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to, ingredient_id: item.id, quantity: Number(item.qty) });
        }
      }
      toast.success("Перемещено");
      setTransferOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  // --- ИНВЕНТАРИЗАЦИЯ ---
  const startStock = () => {
    if (selectedLoc === "all") return toast.error("Выбери склад");
    setStockItems(
      inventory
        .filter((i) => i.location_id === selectedLoc)
        .map((i) => ({
          inv_id: i.id,
          ing_id: i.ingredient_id,
          name: i.ingredient?.name,
          sys: i.quantity,
          act: i.quantity.toString(),
          isNew: false,
        })),
    );
    setStockOpen(true);
  };

  const filtered = useMemo(
    () =>
      inventory.filter(
        (i) =>
          i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedLoc === "all" || i.location_id === selectedLoc),
      ),
    [inventory, searchTerm, selectedLoc],
  );

  return (
    <div className="p-4 bg-[#0c0c0c] min-h-screen text-zinc-300">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-indigo-500 uppercase tracking-tighter italic">Stock Manager</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={startStock} variant="outline" className="h-9 border-white/10">
            <Calculator className="w-4 h-4 mr-1" /> Сверка
          </Button>
          <Button size="sm" onClick={() => setTransferOpen(true)} variant="outline" className="h-9 border-white/10">
            <ArrowRightLeft className="w-4 h-4 mr-1" /> Перенос
          </Button>
          <Button size="sm" onClick={() => setSupplyOpen(true)} className="h-9 bg-indigo-600 hover:bg-indigo-500">
            <Plus className="w-4 h-4 mr-1" /> Приход
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Поиск..."
          className="h-9 bg-zinc-900 border-white/5"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="h-9 w-48 bg-zinc-900 border-white/5">
            <SelectValue placeholder="Склад" />
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

      <Card className="bg-zinc-900/40 border-white/5 rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 h-10 text-[10px] uppercase">
              <TableHead className="pl-4">Товар</TableHead>
              <TableHead className="text-center">Остаток</TableHead>
              <TableHead className="text-right pr-4">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="border-white/5 h-12 hover:bg-white/5">
                <TableCell className="pl-4 font-medium text-zinc-100">{item.ingredient?.name}</TableCell>
                <TableCell className="text-center font-mono text-sm">
                  <span className={item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}>
                    {Number(item.quantity).toFixed(2)}
                  </span>
                  <span className="ml-1 text-[10px] text-zinc-600">{item.ingredient?.unit?.abbreviation}</span>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditItem(item);
                      setEditOpen(true);
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      if (confirm("Удалить?")) {
                        await supabase.from("inventory").delete().eq("id", item.id);
                        fetchData();
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ПРИХОД */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase italic">Приходная накладная</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">ИНН (8 цифр)</Label>
              <Input
                maxLength={8}
                className="h-9 bg-black border-white/10"
                value={supplyForm.inn}
                onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">Склад</Label>
              <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                <SelectTrigger className="h-9 bg-black border-white/10">
                  <SelectValue placeholder="Склад" />
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
            <div className="flex gap-2 items-end">
              <Input
                placeholder="Сер"
                className="h-9 w-14 bg-black border-white/10"
                value={supplyForm.series}
                onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
              />
              <Input
                placeholder="Номер"
                className="h-9 flex-1 bg-black border-white/10"
                value={supplyForm.num}
                onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">Сумма</Label>
              <Input
                placeholder="0.00"
                className="h-9 bg-black border-white/10 text-emerald-400"
                value={supplyForm.total}
                onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-zinc-900 border-none text-xs">
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
                  className="h-8 w-16 bg-zinc-900 border-none text-xs"
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
            className="w-full text-[10px] h-8"
            onClick={() => setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { id: "", qty: "" }] })}
          >
            + Добавить товар
          </Button>
          <Button onClick={handleSupply} className="w-full bg-indigo-600 h-10 mt-4 font-bold">
            Провести
          </Button>
        </DialogContent>
      </Dialog>

      {/* ПЕРЕМЕЩЕНИЕ */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase italic">Перенос между складами</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, from: v })}>
              <SelectTrigger className="h-9 bg-black">
                <SelectValue placeholder="ОТКУДА" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white">
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, to: v })}>
              <SelectTrigger className="h-9 bg-black">
                <SelectValue placeholder="КУДА" />
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
          <div className="mt-4 space-y-2">
            {transferForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const n = [...transferForm.items];
                    n[idx].id = v;
                    setTransferForm({ ...transferForm, items: n });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-zinc-900">
                    <SelectValue placeholder="Товар" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 text-white">
                    {inventory
                      .filter((i) => i.location_id === transferForm.from)
                      .map((i) => (
                        <SelectItem key={i.ingredient_id} value={i.ingredient_id}>
                          {i.ingredient?.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Кол"
                  className="h-8 w-16 bg-zinc-900"
                  onChange={(e) => {
                    const n = [...transferForm.items];
                    n[idx].qty = e.target.value;
                    setTransferForm({ ...transferForm, items: n });
                  }}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleTransfer} className="w-full bg-orange-600 h-10 mt-4 font-bold">
            Выполнить перенос
          </Button>
        </DialogContent>
      </Dialog>

      {/* СВЕРКА (ИНВЕНТАРИЗАЦИЯ) */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl h-[80vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Сверка остатков</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 border border-white/5 rounded-lg bg-black/40">
            <Table>
              <TableHeader className="bg-zinc-900 sticky top-0">
                <TableRow className="border-white/10 h-8 text-[10px] uppercase">
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-center">Система</TableHead>
                  <TableHead className="text-center">Факт</TableHead>
                  <TableHead className="text-right pr-4">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const d = Number(it.act) - Number(it.sys);
                  return (
                    <TableRow key={idx} className="border-white/5 h-10">
                      <TableCell className="font-medium text-xs">
                        {it.isNew ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ing_id = v;
                              n[idx].name = ingredients.find((i) => i.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="h-7 bg-zinc-800 border-none">
                              <SelectValue placeholder="Товар" />
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
                      <TableCell className="text-center font-mono text-xs text-zinc-500">
                        {Number(it.sys).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={it.act}
                          onChange={(e) => {
                            const n = [...stockItems];
                            n[idx].act = e.target.value;
                            setStockItems(n);
                          }}
                          className="w-16 h-7 mx-auto text-center bg-zinc-900 border-none text-indigo-400 font-bold"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-4 font-bold text-xs ${d > 0 ? "text-emerald-500" : d < 0 ? "text-red-500" : "text-zinc-700"}`}
                      >
                        {d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)}
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
              className="flex-1 h-9 border-dashed text-[10px]"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
            >
              + Добавить товар
            </Button>
            <Button onClick={saveStock} className="flex-[2] bg-indigo-600 h-9 font-bold text-xs uppercase">
              Синхронизировать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* КОРРЕКТИРОВКА */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase italic">Корректировка</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase">{editItem?.ingredient?.name}</p>
            <Input
              type="number"
              className="bg-black border-white/10 h-12 text-center text-3xl font-black text-indigo-400"
              value={editItem?.quantity}
              onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-500 h-9 text-[10px]"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> ОБНУЛИТЬ
              </Button>
              <Button
                className="flex-1 bg-indigo-600 h-9 font-bold text-[10px]"
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
                СОХРАНИТЬ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
