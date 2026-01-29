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
  Check,
  X,
  PlusCircle,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  // --- ОСНОВНЫЕ СОСТОЯНИЯ ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Состояния модальных окон
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // Формы данных
  const [editingItem, setEditingItem] = useState<any>(null);

  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    inn: "",
    doc_series: "",
    doc_number: "",
    total_amount: "",
    items: [{ ingredient_id: "", quantity: "", price: "" }],
  });

  const [transferForm, setTransferForm] = useState({
    from_id: "",
    to_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });

  const [stockItems, setStockItems] = useState<any[]>([]);

  // --- ЗАГРУЗКА ДАННЫХ ---
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

  // --- ЛОГИКА ПОСТАВКИ ---
  const handleSupply = async () => {
    if (!supplyForm.location_id || !supplyForm.inn) {
      return toast.error("Заполните ИНН и выберите точку прихода");
    }

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
            .update({
              quantity: Number(exist.quantity) + qty,
            })
            .eq("id", exist.id);
        } else {
          await supabase.from("inventory").insert({
            location_id: supplyForm.location_id,
            ingredient_id: item.ingredient_id,
            quantity: qty,
          });
        }
      }
      toast.success(`Поставка ${supplyForm.doc_series}-${supplyForm.doc_number} принята`);
      setSupplyOpen(false);
      setSupplyForm({
        location_id: "",
        inn: "",
        doc_series: "",
        doc_number: "",
        total_amount: "",
        items: [{ ingredient_id: "", quantity: "", price: "" }],
      });
      fetchData();
    } catch (e) {
      toast.error("Ошибка при сохранении поставки");
    }
  };

  // --- ЛОГИКА ИНВЕНТАРИЗАЦИИ ---
  const openStocktaking = () => {
    if (selectedLocation === "all") return toast.error("Сначала выберите точку в фильтре!");

    // Берем текущие остатки на точке
    const currentItems = inventory
      .filter((i) => i.location_id === selectedLocation)
      .map((i) => ({
        inventory_id: i.id,
        ingredient_id: i.ingredient_id,
        name: i.ingredient?.name,
        system: i.quantity || 0,
        actual: (i.quantity || 0).toString(),
        is_new: false,
      }));

    setStockItems(currentItems);
    setStockOpen(true);
  };

  const addEmptyRowToStock = () => {
    setStockItems([
      ...stockItems,
      {
        inventory_id: null,
        ingredient_id: "",
        name: "",
        system: 0,
        actual: "0",
        is_new: true,
      },
    ]);
  };

  const handleSaveStocktaking = async () => {
    try {
      for (const item of stockItems) {
        if (!item.ingredient_id) continue;

        if (item.inventory_id) {
          // Обновляем существующий
          await supabase
            .from("inventory")
            .update({
              quantity: parseFloat(item.actual) || 0,
            })
            .eq("id", item.inventory_id);
        } else {
          // Создаем новый, если нашли товар, которого не было на складе
          await supabase.from("inventory").insert({
            location_id: selectedLocation,
            ingredient_id: item.ingredient_id,
            quantity: parseFloat(item.actual) || 0,
          });
        }
      }
      toast.success("Инвентаризация успешно проведена");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // --- ЛОГИКА ПЕРЕМЕЩЕНИЯ ---
  const handleTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) return toast.error("Выберите обе точки");

    try {
      for (const item of transferForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const qty = Number(item.quantity);

        // Уменьшаем у отправителя
        const { data: fromEx } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (fromEx) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(fromEx.quantity) - qty })
            .eq("id", fromEx.id);
        }

        // Увеличиваем у получателя
        const { data: toEx } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();
        if (toEx) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(toEx.quantity) + qty })
            .eq("id", toEx.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to_id, ingredient_id: item.ingredient_id, quantity: qty });
        }
      }
      setTransferOpen(false);
      fetchData();
      toast.success("Товары перемещены");
    } catch (e) {
      toast.error("Ошибка перемещения");
    }
  };

  // --- ФИЛЬТРАЦИЯ ---
  const filteredInv = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedLocation === "all" || i.location_id === selectedLocation),
    );
  }, [inventory, searchTerm, selectedLocation]);

  return (
    <div className="p-4 md:p-8 bg-zinc-950 min-h-screen text-white">
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-indigo-500">Warehouse Master</h1>
          <p className="text-zinc-500 text-sm">Управление поставками, перемещениями и инвентаризацией</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={openStocktaking} variant="outline" className="bg-white/5 border-white/10 h-12 rounded-xl">
            <ClipboardCheck className="w-5 h-5 mr-2 text-indigo-400" /> Инвентарь
          </Button>
          <Button
            onClick={() => setTransferOpen(true)}
            variant="outline"
            className="bg-white/5 border-white/10 h-12 rounded-xl"
          >
            <ArrowRightLeft className="w-5 h-5 mr-2 text-orange-400" /> Перемещение
          </Button>
          <Button
            onClick={() => setSupplyOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 h-12 px-8 rounded-xl font-bold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      {/* ФИЛЬТРЫ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <Input
            placeholder="Поиск по складу..."
            className="pl-12 bg-zinc-900 border-white/10 h-14 rounded-2xl text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="h-14 bg-zinc-900 border-white/10 rounded-2xl text-lg">
            <SelectValue placeholder="Все локации" />
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

      {/* ТАБЛИЦА ОСТАТКОВ */}
      <Card className="bg-zinc-900/40 border-white/5 rounded-[2rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 h-14">
              <TableHead className="pl-8 text-zinc-400 uppercase text-xs font-bold">Товар</TableHead>
              <TableHead className="text-center text-zinc-400 uppercase text-xs font-bold">Остаток</TableHead>
              <TableHead className="text-center text-zinc-400 uppercase text-xs font-bold">Склад</TableHead>
              <TableHead className="text-right pr-8 text-zinc-400 uppercase text-xs font-bold">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="pl-8 py-5">
                  <span className="text-xl font-bold">{item.ingredient?.name}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`text-2xl font-black font-mono ${item.quantity <= 0 ? "text-red-500" : "text-emerald-400"}`}
                  >
                    {Number(item.quantity).toFixed(2)}
                  </span>
                  <span className="ml-2 text-zinc-500 text-xs">{item.ingredient?.unit?.abbreviation}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                        setEditOpen(true);
                      }}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-indigo-500/20 text-indigo-400"
                    >
                      <Edit3 className="w-5 h-5" />
                    </Button>
                    <Button
                      onClick={async () => {
                        if (confirm("Удалить?")) {
                          await supabase.from("inventory").delete().eq("id", item.id);
                          fetchData();
                        }
                      }}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-500/20 text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* МОДАЛКА: ПОСТАВКА (ПОЛНАЯ) */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl rounded-[2.5rem] p-8 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase text-emerald-500">
              Приходная накладная
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-500 uppercase text-[10px]">ИНН Поставщика</Label>
                <Input
                  value={supplyForm.inn}
                  onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
                  className="bg-white/5 border-white/10 h-12"
                  placeholder="000000000000"
                />
              </div>
              <div>
                <Label className="text-zinc-500 uppercase text-[10px]">Серия и Номер</Label>
                <div className="flex gap-2">
                  <Input
                    value={supplyForm.doc_series}
                    onChange={(e) => setSupplyForm({ ...supplyForm, doc_series: e.target.value })}
                    className="bg-white/5 border-white/10 h-12 w-20"
                    placeholder="АА"
                  />
                  <Input
                    value={supplyForm.doc_number}
                    onChange={(e) => setSupplyForm({ ...supplyForm, doc_number: e.target.value })}
                    className="bg-white/5 border-white/10 h-12 flex-1"
                    placeholder="000123"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-500 uppercase text-[10px]">Склад прихода</Label>
                <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue placeholder="Выберите склад" />
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
              <div>
                <Label className="text-zinc-500 uppercase text-[10px]">Итоговая сумма (₽)</Label>
                <Input
                  value={supplyForm.total_amount}
                  onChange={(e) => setSupplyForm({ ...supplyForm, total_amount: e.target.value })}
                  className="bg-white/5 border-white/10 h-12 font-bold text-emerald-400"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Label className="text-zinc-500 uppercase text-[10px] ml-1">Список товаров</Label>
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 items-end">
                <div className="flex-1 space-y-2">
                  <Select
                    onValueChange={(v) => {
                      const n = [...supplyForm.items];
                      n[idx].ingredient_id = v;
                      setSupplyForm({ ...supplyForm, items: n });
                    }}
                  >
                    <SelectTrigger className="bg-zinc-950 border-white/10 h-11">
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
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    className="bg-zinc-950 border-white/10 h-11 text-center"
                    onChange={(e) => {
                      const n = [...supplyForm.items];
                      n[idx].quantity = e.target.value;
                      setSupplyForm({ ...supplyForm, items: n });
                    }}
                  />
                </div>
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
              onClick={() =>
                setSupplyForm({
                  ...supplyForm,
                  items: [...supplyForm.items, { ingredient_id: "", quantity: "", price: "" }],
                })
              }
              className="w-full border-dashed h-12 rounded-xl text-zinc-500 hover:text-white"
            >
              + Добавить строку
            </Button>
          </div>
          <Button
            onClick={handleSupply}
            className="w-full bg-emerald-600 h-16 mt-8 rounded-2xl text-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
          >
            Провести накладную
          </Button>
        </DialogContent>
      </Dialog>

      {/* МОДАЛКА: ИНВЕНТАРИЗАЦИЯ (С ВЫБОРОМ НОВОГО ТОВАРА И РАЗНИЦЕЙ) */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-5xl rounded-[2.5rem] p-8 h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase">
              Сверка склада: {locations.find((l) => l.id === selectedLocation)?.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Внесите фактические данные. Система сама рассчитает разницу.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-6 border border-white/5 rounded-3xl bg-black/20 custom-scrollbar">
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 z-10">
                <TableRow className="border-white/10 h-14">
                  <TableHead className="pl-6">Товар / Ингредиент</TableHead>
                  <TableHead className="text-center">По учету</TableHead>
                  <TableHead className="text-center w-[180px]">Факт</TableHead>
                  <TableHead className="text-right pr-6">Разница</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((item, idx) => {
                  const diff = Number(item.actual) - Number(item.system);
                  return (
                    <TableRow key={idx} className="border-white/5 h-16 group">
                      <TableCell className="pl-6 font-bold">
                        {item.is_new ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ingredient_id = v;
                              n[idx].name = ingredients.find((ing) => ing.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="bg-zinc-900 border-indigo-500/50 h-10 w-64">
                              <SelectValue placeholder="Выберите товар" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 text-white">
                              {ingredients.map((ing) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-lg">{item.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-zinc-500 font-mono text-xl">
                        {Number(item.system).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.actual}
                          onChange={(e) => {
                            const n = [...stockItems];
                            n[idx].actual = e.target.value;
                            setStockItems(n);
                          }}
                          className="bg-white/5 border-white/10 h-12 text-center text-2xl font-black text-indigo-400 rounded-xl"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-6 font-black text-xl ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-700"}`}
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
              onClick={addEmptyRowToStock}
              className="flex-1 h-14 border-dashed border-white/20 rounded-2xl text-zinc-400"
            >
              <PlusCircle className="mr-2 w-5 h-5" /> Добавить товар, которого нет в списке
            </Button>
            <Button
              onClick={handleSaveStocktaking}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 h-14 rounded-2xl text-xl font-black uppercase tracking-tighter"
            >
              Зафиксировать результаты сверки
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
