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
  FileText,
  Landmark,
  ArrowDownToLine,
  Calculator,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Состояния окон
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Формы
  const [editingItem, setEditingItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    inn: "",
    doc_series: "",
    total_amount: "",
    items: [{ ingredient_id: "", quantity: "", price: "" }],
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
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
    const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    setInventory(inv || []);
    setIngredients(ings || []);
    setLocations(locs || []);
  };

  // --- ПОСТАВКА (С ИНН И СУММОЙ) ---
  const handleSupply = async () => {
    if (!supplyForm.location_id || !supplyForm.inn) return toast.error("Заполните ИНН и выберите склад");
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
      toast.success(`Документ ${supplyForm.doc_series} проведен на сумму ${supplyForm.total_amount}`);
      setSupplyOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  // --- ИНВЕНТАРИЗАЦИЯ (РАСЧЕТ РАЗНИЦЫ) ---
  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Выберите точку!");
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

  // --- ПЕРЕМЕЩЕНИЕ (ТОЛЬКО ТО ЧТО ЕСТЬ) ---
  const availableIngredients = useMemo(() => {
    if (transferForm.from_id === "") return [];
    return inventory.filter((i) => i.location_id === transferForm.from_id && i.quantity > 0);
  }, [transferForm.from_id, inventory]);

  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);

  return (
    <div className="p-6 bg-black min-h-screen text-zinc-100 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-indigo-500">Stock Control</h1>
          <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">Terminal v4.0.1</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={openStocktaking} variant="outline" className="border-white/10 h-12 rounded-xl">
            <Calculator className="mr-2 w-4 h-4" /> Инвентарь
          </Button>
          <Button
            onClick={() => setTransferOpen(true)}
            variant="outline"
            className="border-white/10 h-12 rounded-xl text-orange-400"
          >
            <ArrowRightLeft className="mr-2 w-4 h-4" /> Перенос
          </Button>
          <Button
            onClick={() => setSupplyOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 h-12 rounded-xl px-8 font-bold text-white shadow-lg shadow-emerald-900/20"
          >
            <Plus className="mr-2 w-4 h-4" /> Поставка
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5" />
          <Input
            placeholder="Поиск товара по базе..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-900 border-white/10 h-14 pl-12 rounded-2xl text-lg"
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-72 bg-zinc-900 border-white/10 h-14 rounded-2xl">
            <SelectValue placeholder="Склад: Все" />
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
      <Card className="bg-zinc-900/30 border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-md">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 h-14 text-zinc-400 uppercase text-[10px] font-bold">
              <TableHead className="pl-8">Наименование</TableHead>
              <TableHead className="text-center">Остаток</TableHead>
              <TableHead className="text-center">Локация</TableHead>
              <TableHead className="text-right pr-8">Управление</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="pl-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                      {item.ingredient?.name[0]}
                    </div>
                    <span className="text-lg font-bold">{item.ingredient?.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-2xl font-mono font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                    >
                      {Number(item.quantity).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500">{item.ingredient?.unit?.abbreviation}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-indigo-500/20 text-indigo-300">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button
                    onClick={() => {
                      setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                      setEditOpen(true);
                    }}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-indigo-500/10 hover:text-indigo-400"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={async () => {
                      if (confirm("Удалить позицию?")) {
                        await supabase.from("inventory").delete().eq("id", item.id);
                        fetchData();
                      }
                    }}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL: SUPPLY (ПРИХОД) */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-3xl rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase">Оформление Поставки</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className="text-zinc-500">ИНН Поставщика</Label>
              <Input
                placeholder="0000000000"
                className="bg-white/5"
                value={supplyForm.inn}
                onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500">Сумма документа</Label>
              <Input
                placeholder="0.00"
                className="bg-white/5"
                value={supplyForm.total_amount}
                onChange={(e) => setSupplyForm({ ...supplyForm, total_amount: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-4 mt-6">
            <Label className="text-zinc-500">Товары в накладной</Label>
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-white/5 p-3 rounded-2xl">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].ingredient_id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="bg-transparent border-none flex-1">
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
                  className="w-24 bg-zinc-800"
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
                setSupplyForm({
                  ...supplyForm,
                  items: [...supplyForm.items, { ingredient_id: "", quantity: "", price: "" }],
                })
              }
            >
              + Добавить строку
            </Button>
          </div>
          <Button onClick={handleSupply} className="w-full bg-emerald-600 h-16 mt-6 rounded-2xl text-xl font-black">
            Провести документ
          </Button>
        </DialogContent>
      </Dialog>

      {/* MODAL: STOCKTAKING (ИНВЕНТАРИЗАЦИЯ С РАСЧЕТОМ) */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl rounded-[2.5rem] h-[80vh] flex flex-col p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic">Сверка остатков</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-6 pr-2">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-center">Система</TableHead>
                  <TableHead className="text-center">Факт</TableHead>
                  <TableHead className="text-right">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const diff = Number(it.actual) - Number(it.system);
                  return (
                    <TableRow key={it.id} className="border-white/5">
                      <TableCell className="font-bold text-lg">{it.name}</TableCell>
                      <TableCell className="text-center text-zinc-500 font-mono">
                        {Number(it.system).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={it.actual}
                          onChange={(e) => {
                            const n = [...stockItems];
                            n[idx].actual = e.target.value;
                            setStockItems(n);
                          }}
                          className="w-28 bg-white/5 mx-auto text-center h-10 text-xl font-bold text-indigo-400"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right font-black ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-600"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button
            onClick={async () => {
              for (const it of stockItems) {
                await supabase
                  .from("inventory")
                  .update({ quantity: Number(it.actual) })
                  .eq("id", it.id);
              }
              setStockOpen(false);
              fetchData();
              toast.success("Склад синхронизирован");
            }}
            className="w-full bg-indigo-600 h-16 rounded-2xl text-xl font-black"
          >
            Сохранить инвентаризацию
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
