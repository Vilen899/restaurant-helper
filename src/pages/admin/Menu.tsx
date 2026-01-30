import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, UtensilsCrossed, Upload, X, Loader2, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", category_id: "", is_active: true, image_url: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: items }, { data: cats }] = await Promise.all([
      supabase.from("menu_items").select("*").order("name"),
      supabase.from("menu_categories").select("*").order("sort_order"),
    ]);
    setMenuItems(items || []);
    setCategories(cats || []);
    setLoading(false);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category_id: item.category_id,
      is_active: item.is_active,
      image_url: item.image_url || "",
    });
    setDialogOpen(true);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 bg-zinc-50 min-h-screen font-sans">
      {/* HEADER - Компактный */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 border rounded-lg shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-zinc-800 uppercase tracking-tight">Управление Меню</h1>
          <p className="text-xs text-zinc-500 uppercase">Всего позиций: {menuItems.length}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Поиск блюда..."
              className="pl-9 h-9 w-64 bg-zinc-100 border-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 w-40 bg-white text-xs font-semibold">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditItem(null);
              setDialogOpen(true);
            }}
            className="h-9 bg-zinc-900 text-white gap-2 px-4"
          >
            <Plus size={16} /> Добавить
          </Button>
        </div>
      </div>

      {/* TABLE - Вместо карточек */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-xs font-bold uppercase">Название</TableHead>
              <TableHead className="text-xs font-bold uppercase">Категория</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Цена</TableHead>
              <TableHead className="text-center text-xs font-bold uppercase">Статус</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <Loader2 className="animate-spin mx-auto text-zinc-300" />
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className={`hover:bg-zinc-50 ${!item.is_active ? "opacity-50" : ""}`}>
                  <TableCell>
                    {item.image_url ? (
                      <img src={item.image_url} className="w-8 h-8 rounded object-cover border" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                        <UtensilsCrossed size={12} className="text-zinc-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-bold text-sm text-zinc-800 uppercase">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase bg-zinc-100 border-none">
                      {categories.find((c) => c.id === item.category_id)?.name || "---"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {Number(item.price).toLocaleString()} ₽
                  </TableCell>
                  <TableCell className="text-center">
                    <div
                      className={`inline-block w-2 h-2 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-red-400"}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                        <Pencil size={14} className="text-zinc-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50"
                        onClick={() => {
                          /* delete */
                        }}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG - Компактный */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-none border-2">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase italic">
              {editItem ? "Правка блюда" : "Новое блюдо"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Название блюда</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 rounded-none bg-zinc-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Категория</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                >
                  <SelectTrigger className="h-9 rounded-none bg-zinc-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Цена ₽</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="h-9 rounded-none bg-zinc-50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-4 mt-2">
              <Label className="text-[10px] font-bold uppercase">Активно в меню</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDialogOpen(false)}
              variant="outline"
              className="h-9 rounded-none uppercase text-xs font-bold"
            >
              Отмена
            </Button>
            <Button className="h-9 rounded-none bg-zinc-900 text-white uppercase text-xs font-bold px-8">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
