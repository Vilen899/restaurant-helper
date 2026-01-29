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
  ArrowDownToLine,
  Package,
  History,
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
  // --- СОСТОЯНИЯ ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<string>("all");

  // Модалки
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Формы
  const [editItem, setEditItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    loc_id: "",
    inn: "",
    series: "",
    num: "",
    total: "",
    items: [{ id: "", qty: "" }],
  });
  const [transferForm, setTransferForm] = useState({
    from: "",
    to: "",
    items: [{ id: "", qty: "" }],
  });
  const [stockItems, setStockItems] = useState<any[]>([]);

  // --- ЗАГРУЗКА ---
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
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // --- ЛОГИКА ПОСТАВКИ (С ИНН 8 ЦИФР) ---
  const handleSupply = async () => {
    if (supplyForm.inn.length !== 8) return toast.error("ИНН в Армении — это 8 цифр!");
    if (!supplyForm.loc_id) return toast.error("Выберите склад прихода");

    try {
      for (const item of supplyForm.items) {
        if (!item.id || !item.qty) continue;
        const qty = Number(item.qty);

        const { data: exist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.loc_id)
          .eq("ingredient_id", item.id)
          .maybeSingle();

        if (exist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exist.quantity) + qty })
            .eq("id", exist.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: supplyForm.loc_id, ingredient_id: item.id, quantity: qty });
        }
      }
      toast.success("Поставка успешно принята");
      setSupplyOpen(false);
      setSupplyForm({ loc_id: "", inn: "", series: "", num: "", total: "", items: [{ id: "", qty: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка при сохранении");
    }
  };

  // --- ЛОГИКА ПЕРЕМЕЩЕНИЯ ---
  const handleTransfer = async () => {
    if (!transferForm.from || !transferForm.to) return toast.error("Выберите оба склада");
    if (transferForm.from === transferForm.to) return toast.error("Склады должны быть разными");

    try {
      for (const item of transferForm.items) {
        if (!item.id || !item.qty) continue;
        const qty = Number(item.qty);

        // Убираем у отправителя
        const { data: exFrom } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (!exFrom || Number(exFrom.quantity) < qty) {
          toast.error(`Недостаточно товара на складе отправителе`);
          continue;
        }
        await supabase
          .from("inventory")
          .update({ quantity: Number(exFrom.quantity) - qty })
          .eq("id", exFrom.id);

        // Добавляем получателю
        const { data: exTo } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (exTo) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exTo.quantity) + qty })
            .eq("id", exTo.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to, ingredient_id: item.id, quantity: qty });
        }
      }
      toast.success("Перемещение завершено");
      setTransferOpen(false);
      setTransferForm({ from: "", to: "", items: [{ id: "", qty: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка перемещения");
    }
  };

  // --- ЛОГИКА ИНВЕНТАРИЗАЦИИ ---
  const startStocktaking = () => {
    if (selectedLoc === "all") return toast.error("Сначала выберите склад в фильтре");
    const current = inventory
      .filter((i) => i.location_id === selectedLoc)
      .map((i) => ({
        inv_id: i.id,
        ing_id: i.ingredient_id,
        name: i.ingredient?.name,
        sys: i.quantity || 0,
        act: (i.quantity || 0).toString(),
        isNew: false,
      }));
    setStockItems(current);
    setStockOpen(true);
  };

  const saveStocktaking = async () => {
    try {
      for (const it of stockItems) {
        if (!it.ing_id) continue;
        const finalQty = Number(it.act);
        if (it.inv_id) {
          await supabase.from("inventory").update({ quantity: finalQty }).eq("id", it.inv_id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: selectedLoc, ingredient_id: it.ing_id, quantity: finalQty });
        }
      }
      toast.success("Инвентаризация сохранена");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // --- ФИЛЬТР ---
  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLoc === "all" || i.location_id === selectedLoc),
    );
  }, [inventory, searchTerm, selectedLoc]);

  return (
    <div className="p-4 bg-[#0a0a0a] min-h-screen text-zinc-300">
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-indigo-500 italic uppercase">Stock.Arm</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={startStocktaking} variant="outline" className="border-white/10 h-10 px-4">
            <Calculator className="w-4 h-4 mr-2 text-indigo-400" /> Инвентарь
          </Button>
          <Button
            size="sm"
            onClick={() => setTransferOpen(true)}
            variant="outline"
            className="border-white/10 h-10 px-4"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2 text-orange-400" /> Перенос
          </Button>
          <Button
            size="sm"
            onClick={() => setSupplyOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 h-10 px-6 font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      {/* ПОИСК И СКЛАД */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input
            placeholder="Поиск по остаткам..."
            className="pl-10 bg-zinc-900/50 border-white/5 h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="w-64 bg-zinc-900/50 border-white/5 h-11 rounded-xl">
            <SelectValue placeholder="Все склады" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white">
            <SelectItem value="all">Все локации</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ТАБЛИЦА */}
      <Card className="bg-zinc-900/30 border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 h-12 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              <TableHead className="pl-6">Наименование</TableHead>
              <TableHead className="text-center">Количество</TableHead>
              <TableHead className="text-center">Склад</TableHead>
              <TableHead className="text-right pr-6">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id} className="border-white/5 h-14 hover:bg-white/5 transition-all group">
                <TableCell className="pl-6 font-bold text-zinc-100">{item.ingredient?.name}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`text-xl font-mono font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                  >
                    {Number(item.quantity).toFixed(2)}
                  </span>
                  <span className="ml-1 text-[10px] text-zinc-600 uppercase">
                    {item.ingredient?.unit?.abbreviation}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs">
                  <Badge variant="outline" className="border-indigo-500/20 text-indigo-400">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
                      className="h-8 w-8"
                      onClick={async () => {
                        if (confirm("Удалить позицию со склада?")) {
                          await supabase.from("inventory").delete().eq("id", item.id);
                          fetchData();
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* --- МОДАЛЬНОЕ ОКНО: ПОСТАВКА --- */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic text-emerald-500">Приход на склад</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">ИНН Поставщика (8 цифр)</Label>
              <Input
                maxLength={8}
                className="bg-black border-white/10 h-11"
                value={supplyForm.inn}
                onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">Склад назначения</Label>
              <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                <SelectTrigger className="bg-black border-white/10 h-11">
                  <SelectValue placeholder="Выбрать склад" />
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
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">Документ (Серия/Номер)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Сер"
                  className="w-16 bg-black border-white/10 h-11"
                  value={supplyForm.series}
                  onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
                />
                <Input
                  placeholder="000123"
                  className="flex-1 bg-black border-white/10 h-11"
                  value={supplyForm.num}
                  onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">Общая сумма</Label>
              <Input
                className="bg-black border-white/10 h-11 text-emerald-400 font-bold"
                placeholder="0.00"
                value={supplyForm.total}
                onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-6 space-y-2 max-h-40 overflow-y-auto pr-2">
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="flex-1 bg-transparent border-none h-8 text-xs">
                    <SelectValue placeholder="Выбрать товар" />
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
                  className="w-20 h-8 bg-zinc-800 border-none text-center text-xs"
                  onChange={(e) => {
                    const n = [...supplyForm.items];
                    n[idx].qty = e.target.value;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => {
                    const n = supplyForm.items.filter((_, i) => i !== idx);
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="w-full text-[10px] mt-2 text-zinc-500 hover:text-white"
            onClick={() => setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { id: "", qty: "" }] })}
          >
            + Добавить строку
          </Button>
          <Button
            onClick={handleSupply}
            className="w-full bg-indigo-600 h-12 mt-4 font-bold rounded-xl uppercase tracking-widest text-sm"
          >
            Провести поставку
          </Button>
        </DialogContent>
      </Dialog>

      {/* --- МОДАЛЬНОЕ ОКНО: ПЕРЕМЕЩЕНИЕ --- */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic text-orange-400">
              Перемещение между складами
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">Склад-отправитель</Label>
              <Select onValueChange={(v) => setTransferForm({ ...transferForm, from: v })}>
                <SelectTrigger className="bg-black border-white/10 h-11">
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
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">Склад-получатель</Label>
              <Select onValueChange={(v) => setTransferForm({ ...transferForm, to: v })}>
                <SelectTrigger className="bg-black border-white/10 h-11">
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
          </div>
          <div className="mt-6 space-y-2">
            {transferForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const n = [...transferForm.items];
                    n[idx].id = v;
                    setTransferForm({ ...transferForm, items: n });
                  }}
                >
                  <SelectTrigger className="flex-1 bg-zinc-900 h-10 border-white/5">
                    <SelectValue placeholder="Выбрать товар" />
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
                  placeholder="Кол-во"
                  className="w-24 bg-zinc-900 h-10 border-white/5 text-center"
                  onChange={(e) => {
                    const n = [...transferForm.items];
                    n[idx].qty = e.target.value;
                    setTransferForm({ ...transferForm, items: n });
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            onClick={handleTransfer}
            className="w-full bg-orange-600 hover:bg-orange-500 h-12 mt-6 font-bold rounded-xl uppercase"
          >
            Выполнить перенос
          </Button>
        </DialogContent>
      </Dialog>

      {/* --- МОДАЛЬНОЕ ОКНО: ИНВЕНТАРИЗАЦИЯ --- */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl h-[85vh] flex flex-col rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase">
              Сверка: {locations.find((l) => l.id === selectedLoc)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-6 border border-white/5 rounded-2xl bg-black/40">
            <Table>
              <TableHeader className="bg-zinc-900 sticky top-0 z-20">
                <TableRow className="border-white/10 h-10 text-[10px] uppercase font-bold text-zinc-500">
                  <TableHead className="pl-6">Товар</TableHead>
                  <TableHead className="text-center">По учету</TableHead>
                  <TableHead className="text-center">Фактически</TableHead>
                  <TableHead className="text-right pr-6">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const diff = Number(it.act) - Number(it.sys);
                  return (
                    <TableRow key={idx} className="border-white/5 h-12">
                      <TableCell className="pl-6 font-bold text-sm">
                        {it.isNew ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ing_id = v;
                              n[idx].name = ingredients.find((i) => i.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="h-8 w-48 bg-zinc-800">
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
                      <TableCell className="text-center font-mono text-zinc-500 text-sm">
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
                          className="w-20 h-8 mx-auto text-center bg-zinc-900 border-none font-bold text-indigo-400"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-6 font-black text-sm ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-700"}`}
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
              className="flex-1 h-11 border-dashed text-[10px]"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
            >
              + Найти товар на складе
            </Button>
            <Button
              onClick={saveStocktaking}
              className="flex-[2] bg-indigo-600 h-11 font-black uppercase tracking-widest text-xs"
            >
              Зафиксировать сверку
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- МОДАЛЬНОЕ ОКНО: КОРРЕКТИРОВКА / ОБНУЛЕНИЕ --- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white p-8 max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase italic text-center">Прямая корректировка</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{editItem?.ingredient?.name}</p>
              <Input
                type="number"
                className="h-20 bg-black border-white/10 text-center text-4xl font-black text-indigo-400 rounded-2xl"
                value={editItem?.quantity}
                onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10 h-12 rounded-xl text-xs font-bold"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> ОБНУЛИТЬ
              </Button>
              <Button
                className="flex-[1.5] bg-indigo-600 h-12 rounded-xl font-bold"
                onClick={async () => {
                  await supabase
                    .from("inventory")
                    .update({ quantity: Number(editItem.quantity) })
                    .eq("id", editItem.id);
                  setEditOpen(false);
                  fetchData();
                  toast.success("Сохранено");
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
