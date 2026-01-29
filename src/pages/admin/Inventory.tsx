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

  // --- ПОСТАВКА (Армения ИНН 8 цифр) ---
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
      toast.success(`Документ ${supplyForm.series}-${supplyForm.num} проведен`);
      setSupplyOpen(false);
      setSupplyForm({ loc_id: "", inn: "", series: "", num: "", total: "", items: [{ id: "", qty: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка поставки");
    }
  };

  // --- ИНВЕНТАРИЗАЦИЯ (ПЛЮС / МИНУС) ---
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
      toast.success("Данные склада синхронизированы");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // Исправленная фильтрация (используем состояние ingredients)
  const filtered = useMemo(() => {
    return inventory.filter((i) => {
      const matchSearch = i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = selectedLoc === "all" || i.location_id === selectedLoc;
      return matchSearch && matchLoc;
    });
  }, [inventory, searchTerm, selectedLoc]);

  return (
    <div className="p-6 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-indigo-500 uppercase italic">Warehouse Master</h1>
          <p className="text-zinc-500 text-xs tracking-widest">SYSTEM VERSION 4.0 | ARMENIA REGION</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={startStock} variant="outline" className="h-12 rounded-xl border-white/10 hover:bg-white/10">
            <Calculator className="w-4 h-4 mr-2" /> Инвентарь
          </Button>
          <Button
            onClick={() => setSupplyOpen(true)}
            className="h-12 rounded-xl bg-indigo-600 px-6 font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="relative col-span-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5" />
          <Input
            placeholder="Быстрый поиск по остаткам..."
            className="h-12 pl-12 bg-zinc-900 border-white/10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="h-12 bg-zinc-900 border-white/10 rounded-xl">
            <SelectValue placeholder="Склад" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white border-white/10">
            <SelectItem value="all">Все склады</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <Card className="bg-zinc-900/50 border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 text-[10px] uppercase font-bold text-zinc-500">
              <TableHead className="pl-6">Товар / Ингредиент</TableHead>
              <TableHead className="text-center">Текущий Остаток</TableHead>
              <TableHead className="text-center">Склад</TableHead>
              <TableHead className="text-right pr-6">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-all">
                <TableCell className="pl-6 font-bold text-lg">{item.ingredient?.name}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col">
                    <span
                      className={`text-2xl font-mono font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                    >
                      {Number(item.quantity).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-600">{item.ingredient?.unit?.abbreviation}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-indigo-500/20 text-indigo-400">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditItem(item);
                      setEditOpen(true);
                    }}
                    className="hover:bg-indigo-500/10"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (confirm("Удалить позицию из базы склада?")) {
                        await supabase.from("inventory").delete().eq("id", item.id);
                        fetchData();
                      }
                    }}
                    className="hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL: ПОСТАВКА */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase text-emerald-500">
              Приходная накладная
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500">ИНН Поставщика (8 цифр)</Label>
              <Input
                maxLength={8}
                className="bg-black border-white/10 h-12"
                value={supplyForm.inn}
                onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500">Склад назначения</Label>
              <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                <SelectTrigger className="bg-black border-white/10 h-12">
                  <SelectValue placeholder="Выбрать склад" />
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
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500">Серия и Номер</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Сер"
                  className="w-16 bg-black border-white/10 h-12"
                  value={supplyForm.series}
                  onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
                />
                <Input
                  placeholder="000000"
                  className="flex-1 bg-black border-white/10 h-12"
                  value={supplyForm.num}
                  onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500">Сумма документа</Label>
              <Input
                placeholder="0.00"
                className="bg-black border-white/10 h-12 text-emerald-400 font-bold"
                value={supplyForm.total}
                onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-6 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="flex-1 h-10 bg-transparent border-none">
                    <SelectValue placeholder="Выберите товар" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 text-white border-white/10">
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
                  className="w-24 h-10 bg-zinc-800 border-none text-center"
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
            className="w-full text-zinc-500 mt-2 hover:text-white hover:bg-white/5"
          >
            + Добавить позицию
          </Button>
          <Button
            onClick={handleSupply}
            className="w-full bg-emerald-600 hover:bg-emerald-500 h-14 mt-6 font-black rounded-xl uppercase tracking-widest transition-all"
          >
            Провести документ
          </Button>
        </DialogContent>
      </Dialog>

      {/* MODAL: ИНВЕНТАРИЗАЦИЯ */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl h-[85vh] flex flex-col rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase">
              Сверка: {locations.find((l) => l.id === selectedLoc)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 rounded-2xl border border-white/5 bg-black/40 custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-950 z-10">
                <TableRow className="border-white/10 h-12">
                  <TableHead className="pl-6">Товар</TableHead>
                  <TableHead className="text-center">По учету</TableHead>
                  <TableHead className="text-center">Факт</TableHead>
                  <TableHead className="text-right pr-6">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const diff = Number(it.act) - Number(it.sys);
                  return (
                    <TableRow key={idx} className="border-white/5 h-14">
                      <TableCell className="pl-6 font-bold">
                        {it.isNew ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ing_id = v;
                              n[idx].name = ingredients.find((i) => i.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="h-9 bg-zinc-800 border-none w-48">
                              <SelectValue placeholder="Товар" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 text-white border-white/10">
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
                      <TableCell className="text-center text-zinc-500 font-mono text-lg">
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
                          className="w-24 h-10 mx-auto text-center bg-zinc-900 border-white/10 font-black text-indigo-400 text-xl rounded-lg"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-6 font-black text-lg ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-700"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
              className="flex-1 border-dashed h-14 rounded-xl text-zinc-500 hover:text-white"
            >
              + Найти товар на складе
            </Button>
            <Button
              onClick={saveStock}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 font-black h-14 rounded-xl uppercase"
            >
              Сохранить инвентаризацию
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: КОРРЕКТИРОВКА / ОБНУЛЕНИЕ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl p-8 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase">Корректировка</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="text-center">
              <p className="text-zinc-500 text-xs uppercase mb-1">{editItem?.ingredient?.name}</p>
              <Input
                type="number"
                className="bg-black border-white/10 h-20 text-center text-4xl font-black text-indigo-400 rounded-2xl"
                value={editItem?.quantity}
                onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10 h-12"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Обнулить
              </Button>
              <Button
                className="flex-1 bg-indigo-600 h-12 font-bold"
                onClick={async () => {
                  await supabase
                    .from("inventory")
                    .update({ quantity: Number(editItem.quantity) })
                    .eq("id", editItem.id);
                  setEditOpen(false);
                  fetchData();
                  toast.success("Данные изменены");
                }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
