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
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// UI Components
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  // --- STATES ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // --- DATA LOADING ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: inv, error: invErr } = await supabase
        .from("inventory")
        .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");

      const { data: ings, error: ingsErr } = await supabase
        .from("ingredients")
        .select("*, unit:units(*)")
        .eq("is_active", true);

      const { data: locs, error: locsErr } = await supabase.from("locations").select("*").eq("is_active", true);

      if (invErr || ingsErr || locsErr) throw new Error("Fetch error");

      setInventory(inv || []);
      setIngredients(ings || []);
      setLocations(locs || []);
    } catch (e) {
      toast.error("Ошибка при загрузке данных");
    } finally {
      setLoading(false);
    }
  };

  // --- SUPPLY LOGIC (ПРИХОД) ---
  const handleSupply = async () => {
    // Валидация ИНН Армении
    if (supplyForm.inn.length !== 8) {
      return toast.error("Ошибка: ИНН Армении должен состоять из 8 цифр");
    }
    if (!supplyForm.loc_id) return toast.error("Выберите склад для поставки");

    try {
      for (const item of supplyForm.items) {
        if (!item.id || !item.qty) continue;

        const qtyNum = parseFloat(item.qty);

        const { data: exist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.loc_id)
          .eq("ingredient_id", item.id)
          .maybeSingle();

        if (exist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exist.quantity) + qtyNum })
            .eq("id", exist.id);
        } else {
          await supabase.from("inventory").insert({
            location_id: supplyForm.loc_id,
            ingredient_id: item.id,
            quantity: qtyNum,
          });
        }
      }
      toast.success(`Документ ${supplyForm.series} №${supplyForm.num} успешно проведен`);
      setSupplyOpen(false);
      setSupplyForm({ loc_id: "", inn: "", series: "", num: "", total: "", items: [{ id: "", qty: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Критическая ошибка при проведении накладной");
    }
  };

  // --- STOCKTAKING LOGIC (ИНВЕНТАРИЗАЦИЯ) ---
  const startStock = () => {
    if (selectedLoc === "all") return toast.error("Для инвентаризации выберите конкретный склад в фильтре");

    const currentItems = inventory
      .filter((i) => i.location_id === selectedLoc)
      .map((i) => ({
        inv_id: i.id,
        ing_id: i.ingredient_id,
        name: i.ingredient?.name,
        sys: i.quantity || 0,
        act: (i.quantity || 0).toString(),
        isNew: false,
      }));

    setStockItems(currentItems);
    setStockOpen(true);
  };

  const saveStock = async () => {
    try {
      for (const it of stockItems) {
        if (!it.ing_id) continue;
        const finalQty = parseFloat(it.act) || 0;

        if (it.inv_id) {
          await supabase.from("inventory").update({ quantity: finalQty }).eq("id", it.inv_id);
        } else {
          await supabase.from("inventory").insert({
            location_id: selectedLoc,
            ingredient_id: it.ing_id,
            quantity: finalQty,
          });
        }
      }
      toast.success("Результаты инвентаризации сохранены");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения данных инвентаризации");
    }
  };

  // --- FILTRATION ---
  const filtered = useMemo(() => {
    return inventory.filter((i) => {
      const matchName = i.ingredient?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = selectedLoc === "all" || i.location_id === selectedLoc;
      return matchName && matchLoc;
    });
  }, [inventory, searchTerm, selectedLoc]);

  return (
    <div className="p-4 md:p-10 bg-[#09090b] min-h-screen text-zinc-100 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-black text-indigo-500 uppercase italic tracking-tighter flex items-center gap-4">
            <Package className="w-12 h-12" /> WAREHOUSE
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">ARM REGION</Badge>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Inventory & Supply Management</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button
            onClick={startStock}
            variant="outline"
            className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 px-6"
          >
            <Calculator className="w-5 h-5 mr-3 text-indigo-400" /> Сверка склада
          </Button>
          <Button
            onClick={() => setSupplyOpen(true)}
            className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-8 font-black text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6 mr-2" /> ПОСТАВКА
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="relative md:col-span-3">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 w-6 h-6" />
          <Input
            placeholder="Поиск по названию товара..."
            className="h-16 pl-14 bg-zinc-900/50 border-white/5 rounded-2xl text-xl focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="h-16 bg-zinc-900/50 border-white/5 rounded-2xl text-lg">
            <SelectValue placeholder="Все склады" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">Все локации</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MAIN DATA TABLE */}
      <Card className="bg-zinc-900/30 border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <Table>
          <TableHeader className="bg-white/5 h-16">
            <TableRow className="border-white/5">
              <TableHead className="pl-10 text-zinc-400 font-bold uppercase text-xs tracking-widest">
                Ингредиент
              </TableHead>
              <TableHead className="text-center text-zinc-400 font-bold uppercase text-xs tracking-widest">
                Остаток на складе
              </TableHead>
              <TableHead className="text-center text-zinc-400 font-bold uppercase text-xs tracking-widest">
                Локация
              </TableHead>
              <TableHead className="text-right pr-10 text-zinc-400 font-bold uppercase text-xs tracking-widest">
                Действия
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 italic text-lg">
                  Данные не найдены...
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="pl-10 py-6">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black group-hover:text-indigo-400 transition-colors">
                        {item.ingredient?.name}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono mt-1 uppercase tracking-tighter">
                        REF: {item.id.split("-")[0]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-3xl font-mono font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                      >
                        {Number(item.quantity).toFixed(2)}
                      </span>
                      <Badge variant="outline" className="mt-1 border-white/10 text-zinc-500 font-bold">
                        {item.ingredient?.unit?.abbreviation || "ед"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 py-1.5 px-4 rounded-full font-bold">
                      {item.location?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditItem(item);
                          setEditOpen(true);
                        }}
                        className="w-12 h-12 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-400"
                      >
                        <Edit3 className="w-6 h-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (confirm("Вы действительно хотите полностью удалить этот товар со склада?")) {
                            await supabase.from("inventory").delete().eq("id", item.id);
                            fetchData();
                            toast.success("Товар удален");
                          }
                        }}
                        className="w-12 h-12 rounded-xl hover:bg-red-500/20 hover:text-red-500"
                      >
                        <Trash2 className="w-6 h-6" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* --- DIALOGS --- */}

      {/* MODAL: SUPPLY (ПРИХОД) */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-[#0c0c0e] border-white/10 text-white max-w-3xl rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase text-emerald-500 flex items-center gap-3">
              <FileText className="w-8 h-8" /> Приходная накладная
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">ИНН Поставщика (8 цифр)</Label>
                <Input
                  maxLength={8}
                  className="bg-black border-white/10 h-14 rounded-xl text-lg font-mono"
                  value={supplyForm.inn}
                  onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
                  placeholder="00000000"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Серия и Номер</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="АА"
                    className="w-20 bg-black border-white/10 h-14 rounded-xl text-center font-bold"
                    value={supplyForm.series}
                    onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
                  />
                  <Input
                    placeholder="000123"
                    className="flex-1 bg-black border-white/10 h-14 rounded-xl font-bold"
                    value={supplyForm.num}
                    onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Склад прихода</Label>
                <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                  <SelectTrigger className="bg-black border-white/10 h-14 rounded-xl">
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
              <div>
                <Label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Сумма документа</Label>
                <Input
                  placeholder="0.00"
                  className="bg-black border-white/10 h-14 rounded-xl text-emerald-400 font-black text-xl"
                  value={supplyForm.total}
                  onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar border-t border-white/5 pt-6">
            <Label className="text-[10px] uppercase font-bold text-zinc-500">Товары</Label>
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-3 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="flex-1 bg-zinc-950 border-none h-10">
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
                  className="w-24 bg-zinc-950 border-none h-10 text-center font-bold"
                  onChange={(e) => {
                    const n = [...supplyForm.items];
                    n[idx].qty = e.target.value;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const n = supplyForm.items.filter((_, i) => i !== idx);
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                  className="text-red-500"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full h-12 border-dashed border-white/20 rounded-xl"
              onClick={() => setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { id: "", qty: "" }] })}
            >
              + Добавить строку
            </Button>
          </div>
          <Button
            onClick={handleSupply}
            className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 mt-8 rounded-2xl text-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
          >
            Провести приход
          </Button>
        </DialogContent>
      </Dialog>

      {/* MODAL: STOCKTAKING (ИНВЕНТАРИЗАЦИЯ С РАСЧЕТОМ) */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-[#09090b] border-white/10 text-white max-w-5xl h-[85vh] flex flex-col rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="text-4xl font-black italic flex items-center gap-4">
              <Calculator className="w-10 h-10 text-indigo-500" />
              Сверка: {locations.find((l) => l.id === selectedLoc)?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-6 border border-white/5 rounded-[2rem] bg-black/40">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-950 z-20 h-14">
                <TableRow className="border-white/10">
                  <TableHead className="pl-8 font-bold text-zinc-400">Товар</TableHead>
                  <TableHead className="text-center font-bold text-zinc-400">Система</TableHead>
                  <TableHead className="text-center font-bold text-zinc-400">Факт</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-zinc-400">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const diff = Number(it.act) - Number(it.sys);
                  return (
                    <TableRow key={idx} className="border-white/5 h-16">
                      <TableCell className="pl-8">
                        {it.isNew ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ing_id = v;
                              n[idx].name = ingredients.find((i) => i.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="h-10 bg-zinc-900 border-indigo-500/30 w-64 rounded-xl">
                              <SelectValue placeholder="Выбрать товар" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 text-white border-white/10">
                              {ingredients.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-lg font-bold">{it.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-zinc-500 text-xl">
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
                          className="w-28 h-12 mx-auto text-center bg-zinc-900 border-white/10 font-black text-2xl text-indigo-400 rounded-xl"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-8 font-black text-2xl ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-700"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-16 border-dashed border-white/20 rounded-2xl text-zinc-500 text-lg hover:text-white"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
            >
              <PlusCircle className="mr-3 w-6 h-6" /> Добавить отсутствующий товар
            </Button>
            <Button
              onClick={saveStock}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 h-16 rounded-2xl text-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30"
            >
              Синхронизировать остатки
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT / RESET (КОРРЕКТИРОВКА) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white rounded-[2rem] p-10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase text-center">Корректировка</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-8">
            <div className="text-center space-y-2">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{editItem?.ingredient?.name}</p>
              <Input
                type="number"
                className="bg-black border-white/10 h-24 text-center text-6xl font-black text-indigo-400 rounded-3xl"
                value={editItem?.quantity}
                onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10 h-14 rounded-2xl font-bold"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-5 h-5 mr-2" /> ОБНУЛИТЬ
              </Button>
              <Button
                className="flex-[1.5] bg-indigo-600 h-14 rounded-2xl font-black text-lg"
                onClick={async () => {
                  await supabase
                    .from("inventory")
                    .update({ quantity: Number(editItem.quantity) })
                    .eq("id", editItem.id);
                  setEditOpen(false);
                  fetchData();
                  toast.success("Данные успешно обновлены");
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
