import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Package,
  Edit3,
  AlertTriangle,
  Plus,
  RefreshCcw,
  Check,
  X,
  ArrowRightLeft,
  Database,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { useTableSort } from "@/hooks/useTableSort";

type InventoryItem = Tables<"inventory"> & {
  ingredient?: Tables<"ingredients"> & { unit?: Tables<"units"> };
  location?: Tables<"locations">;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Tables<"locations">[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Состояния для массового обнуления
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Состояния для точечной правки
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; qty: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, locRes] = await Promise.all([
        supabase.from("inventory").select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)"),
        supabase.from("locations").select("*").eq("is_active", true),
      ]);

      if (invRes.data) setInventory(invRes.data as InventoryItem[]);
      if (locRes.data) setLocations(locRes.data);
    } catch (error) {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  // --- ЛОГИКА: ОБНУЛИТЬ ВСЁ ---
  const handleResetAll = async () => {
    const locId = selectedLocation === "all" ? null : selectedLocation;
    if (!locId) {
      toast.error("Выберите конкретную точку для обнуления");
      return;
    }

    try {
      const { error } = await supabase.from("inventory").update({ quantity: 0 }).eq("location_id", locId);

      if (error) throw error;
      toast.success("Весь склад на точке обнулен");
      setResetDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка при обнулении");
    }
  };

  // --- ЛОГИКА: ТОЧЕЧНАЯ ПРАВКА ---
  const handleSingleUpdate = async () => {
    if (!editingItem) return;
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ quantity: parseFloat(editingItem.qty) || 0 })
        .eq("id", editingItem.id);

      if (error) throw error;
      toast.success(`Обновлено: ${editingItem.name}`);
      setEditDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = selectedLocation === "all" || item.location_id === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [inventory, searchTerm, selectedLocation]);

  const { sortedData: sortedInventory } = useTableSort(filteredInventory);

  if (loading && inventory.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020205] text-indigo-400 font-mono animate-pulse">
        LOADING CORE_DATA...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-[#020205] min-h-screen text-zinc-100">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-3">
            <Package className="h-10 w-10 text-indigo-500" />
            Stock <span className="text-indigo-400 not-italic font-light">Control</span>
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">System Inventory Management</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="destructive"
            className="rounded-xl font-bold uppercase text-[10px] tracking-widest bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
            onClick={() => setResetDialogOpen(true)}
            disabled={selectedLocation === "all"}
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> Обнулить точку
          </Button>
          <Button
            onClick={fetchData}
            variant="outline"
            className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-3 h-5 w-5 text-zinc-500" />
          <Input
            placeholder="Поиск по названию товара..."
            className="pl-12 h-12 bg-white/5 border-white/10 rounded-2xl focus:border-indigo-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl">
            <SelectValue placeholder="Выберите точку" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-2xl">
            <SelectItem value="all">Все локации</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MAIN TABLE */}
      <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5 border-b border-white/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest px-8">
                Ингредиент / Товар
              </TableHead>
              <TableHead className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest text-center">
                Текущий Остаток
              </TableHead>
              <TableHead className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Локация</TableHead>
              <TableHead className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest text-right px-8">
                Действие
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInventory.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.03] transition-all group">
                <TableCell className="px-8 font-medium">
                  <div className="flex flex-col">
                    <span className="text-zinc-100 text-lg tracking-tight">{item.ingredient?.name || "---"}</span>
                    <span className="text-zinc-600 text-[10px] uppercase">{item.ingredient?.unit?.name || "ед."}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-2xl font-mono text-xl border ${
                      Number(item.quantity) <= (item.ingredient?.min_stock || 0)
                        ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {Number(item.quantity).toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="rounded-lg border-indigo-500/20 bg-indigo-500/5 text-indigo-400 uppercase text-[9px]"
                  >
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      setEditingItem({ id: item.id, name: item.ingredient?.name || "", qty: item.quantity.toString() });
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit3 className="h-5 w-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* DIALOG: ТОЧЕЧНАЯ ПРАВКА */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white rounded-[2.5rem] max-w-sm">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Edit3 className="text-indigo-400 h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Коррекция</DialogTitle>
            <DialogDescription className="text-center text-zinc-500 uppercase text-[10px] tracking-widest pt-2">
              Товар: <span className="text-zinc-100">{editingItem?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-[10px] uppercase text-zinc-500 tracking-widest ml-1">Новое количество</Label>
            <Input
              type="number"
              value={editingItem?.qty || ""}
              onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, qty: e.target.value } : null))}
              className="bg-white/5 border-white/10 h-16 text-3xl font-mono text-center rounded-[1.5rem] focus:ring-indigo-500"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 rounded-[1.2rem] font-bold text-lg"
              onClick={handleSingleUpdate}
            >
              <Check className="mr-2" /> Сохранить
            </Button>
            <Button variant="ghost" className="w-full text-zinc-500" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ПОЛНОЕ ОБНУЛЕНИЕ */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-950 border-red-500/20 text-white rounded-[2.5rem] max-w-sm">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="text-red-500 h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase text-red-500">Опасно!</DialogTitle>
            <DialogDescription className="text-center text-zinc-500">
              Вы уверены, что хотите обнулить <b className="text-white underline">ВЕСЬ СКЛАД</b> на этой точке? Это
              действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col pt-4">
            <Button
              variant="destructive"
              className="w-full h-14 rounded-[1.2rem] font-bold text-lg"
              onClick={handleResetAll}
            >
              ДА, ОБНУЛИТЬ ВСЁ
            </Button>
            <Button variant="ghost" className="w-full text-zinc-500" onClick={() => setResetDialogOpen(false)}>
              Я передумал
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
