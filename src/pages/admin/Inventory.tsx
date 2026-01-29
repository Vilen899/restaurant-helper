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
  X,
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
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Состояния данных форм
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
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
    const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    setInventory(inv || []);
    setIngredients(ings || []);
    setLocations(locs || []);
  };

  // ЛОГИКА ПРИХОДА (ПОСТАВКИ)
  const handleCreateSupply = async () => {
    if (!supplyForm.location_id) return toast.error("Выберите точку!");
    try {
      for (const item of supplyForm.items) {
        if (!item.ingredient_id || !item.quantity) continue;
        const { data: exist } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.location_id)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (exist) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(exist.quantity) + Number(item.quantity) })
            .eq("id", exist.id);
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
      toast.success("Поставка успешно зачислена");
      setSupplyDialogOpen(false);
      setSupplyForm({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка при сохранении");
    }
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
      {/* HEADER С КНОПКАМИ */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black italic text-indigo-500 uppercase">Складской Учет</h1>
        <div className="flex gap-2">
          <Button onClick={() => setSupplyDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-500">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
          <Button onClick={() => setTransferDialogOpen(true)} variant="outline" className="bg-white/5 border-white/10">
            <ArrowRightLeft className="w-4 h-4 mr-2 text-orange-400" /> Перенос
          </Button>
        </div>
      </div>

      {/* ФИЛЬТРЫ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          placeholder="Поиск по названию..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-zinc-900 border-white/10"
        />
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="bg-zinc-900 border-white/10">
            <SelectValue placeholder="Все точки" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white border-white/10">
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
      <Card className="bg-zinc-900/50 border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead>Товар</TableHead>
              <TableHead>Остаток</TableHead>
              <TableHead>Локация</TableHead>
              <TableHead className="text-right">Опции</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInv.map((item) => (
              <TableRow key={item.id} className="border-white/5">
                <TableCell className="font-bold">{item.ingredient?.name}</TableCell>
                <TableCell className="text-emerald-400 font-mono">
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
                      setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* !!! ОКНО ПОСТАВКИ (С ВЫБОРОМ ТОВАРА) !!! */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Принять поставку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Label>Выберите точку прихода</Label>
            <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Куда зачисляем?" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white border-white/10">
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label>Список товаров</Label>
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-end border-b border-white/5 pb-2">
                <div className="flex-1 space-y-1">
                  <Select
                    onValueChange={(v) => {
                      const newItems = [...supplyForm.items];
                      newItems[idx].ingredient_id = v;
                      setSupplyForm({ ...supplyForm, items: newItems });
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
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
                </div>
                <div className="w-24 space-y-1">
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    className="bg-white/5 border-white/10"
                    onChange={(e) => {
                      const newItems = [...supplyForm.items];
                      newItems[idx].quantity = e.target.value;
                      setSupplyForm({ ...supplyForm, items: newItems });
                    }}
                  />
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed border-white/20"
              onClick={() =>
                setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { ingredient_id: "", quantity: "" }] })
              }
            >
              + Добавить строку
            </Button>

            <Button onClick={handleCreateSupply} className="w-full bg-emerald-600 h-12 text-lg font-bold">
              Зачислить на склад
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ОКНО ПРАВКИ ОСТАТКА */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Правка: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-zinc-400">Новое количество</Label>
            <Input
              type="number"
              value={editingItem?.qty}
              onChange={(e) => setEditingItem({ ...editingItem, qty: e.target.value })}
              className="bg-white/5 border-white/10 h-14 text-2xl text-center font-mono"
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
              toast.success("Обновлено");
            }}
            className="w-full bg-indigo-600 h-12"
          >
            Сохранить
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
