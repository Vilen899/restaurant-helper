import { useState, useEffect } from "react";
import { Plus, ArrowRightLeft, Edit3, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [supplyOpen, setSupplyOpen] = useState(false);

  // Форма поставки
  const [supplyForm, setSupplyForm] = useState({
    location_id: "",
    items: [{ ingredient_id: "", quantity: "" }],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
    const { data: ings } = await supabase.from("ingredients").select("*").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    setInventory(inv || []);
    setIngredients(ings || []);
    setLocations(locs || []);
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
      toast.success("Готово!");
      setSupplyOpen(false);
      setSupplyForm({ location_id: "", items: [{ ingredient_id: "", quantity: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="p-6 bg-zinc-950 min-h-screen text-white">
      {/* ПАНЕЛЬ КНОПОК */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-500 uppercase">Склад</h1>
        <div className="flex gap-3">
          <Button onClick={() => setSupplyOpen(true)} className="bg-emerald-600 hover:bg-emerald-500">
            <Plus className="w-4 h-4 mr-2" /> Поставка
          </Button>
        </div>
      </div>

      {/* ПОИСК */}
      <div className="mb-6">
        <Input
          placeholder="Поиск товара..."
          className="bg-zinc-900 border-white/10"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ТАБЛИЦА */}
      <Card className="bg-zinc-900/50 border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-zinc-400">Товар</TableHead>
              <TableHead className="text-zinc-400">Остаток</TableHead>
              <TableHead className="text-zinc-400">Точка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory
              .filter((i) => i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((item) => (
                <TableRow key={item.id} className="border-white/5">
                  <TableCell>{item.ingredient?.name}</TableCell>
                  <TableCell className="text-emerald-400 font-mono">{item.quantity}</TableCell>
                  <TableCell>{item.location?.name}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* ДИАЛОГ ПОСТАВКИ */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Новая поставка</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}>
              <SelectTrigger className="bg-zinc-800 border-white/10">
                <SelectValue placeholder="Куда принимаем?" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
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
                  <SelectTrigger className="bg-zinc-800 border-white/10 flex-1">
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
                  placeholder="Кол-во"
                  className="w-24 bg-zinc-800 border-white/10"
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
              + Добавить строку
            </Button>

            <Button onClick={handleSupply} className="w-full bg-indigo-600">
              Сохранить всё
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
