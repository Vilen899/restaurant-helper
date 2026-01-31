import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, ArrowDown, ArrowUp, History, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function InventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dates, setDates] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLoc) loadData();
  }, [selectedLoc, dates]);

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*");
    setLocations(data || []);
    if (data?.length) setSelectedLoc(data[0].id);
  };

  const loadData = async () => {
    // 1. Получаем остатки
    const { data: inventory } = await supabase
      .from("inventory")
      .select(`quantity, ingredient:ingredients(id, name, unit)`)
      .eq("location_id", selectedLoc);

    // 2. Получаем все движения за период
    const { data: movements } = await supabase
      .from("material_docs")
      .select("*")
      .eq("location_id", selectedLoc)
      .gte("created_at", dates.from)
      .lte("created_at", dates.to + "T23:59:59");

    // Группируем данные
    const combined = inventory?.map((item: any) => {
      const ingredientId = item.ingredient?.id;
      const received =
        movements
          ?.filter((m) => m.ingredient_id === ingredientId && m.type === "receipt")
          .reduce((sum, m) => sum + Number(m.quantity), 0) || 0;
      const sold =
        movements
          ?.filter((m) => m.ingredient_id === ingredientId && m.type === "sale")
          .reduce((sum, m) => sum + Number(m.quantity), 0) || 0;

      return {
        name: item.ingredient?.name,
        unit: item.ingredient?.unit,
        received,
        sold,
        current: item.quantity,
      };
    });

    setStock(combined || []);
  };

  const filteredStock = stock.filter((item) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 space-y-4 bg-zinc-50 min-h-screen">
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border shadow-sm items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Выберите точку</label>
          <Select value={selectedLoc} onValueChange={setSelectedLoc}>
            <SelectTrigger className="h-9 border-zinc-200">
              <SelectValue placeholder="Склад..." />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Период С</label>
          <Input
            type="date"
            value={dates.from}
            onChange={(e) => setDates({ ...dates, from: e.target.value })}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">По</label>
          <Input
            type="date"
            value={dates.to}
            onChange={(e) => setDates({ ...dates, to: e.target.value })}
            className="h-9"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Поиск товара..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ТАБЛИЦА ОСТАТКОВ */}
      <Card className="rounded-lg border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b py-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Box size={16} className="text-amber-500" /> ТЕКУЩИЕ ОСТАТКИ И ДВИЖЕНИЕ
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase">Наименование</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase text-emerald-600">Приход (+)</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase text-red-500">Расход (-)</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase">Фактический остаток</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {filteredStock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-400">
                  Нет данных за этот период
                </TableCell>
              </TableRow>
            ) : (
              filteredStock.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-zinc-50 border-b border-zinc-100 h-11">
                  <TableCell className="font-bold text-xs uppercase text-zinc-700">{item.name}</TableCell>
                  <TableCell className="text-right text-xs font-medium text-emerald-600">
                    {item.received > 0 && `+${item.received}`} {item.unit}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-red-500">
                    {item.sold > 0 && `-${item.sold}`} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className="font-mono font-bold text-sm bg-zinc-100 text-zinc-900 border-none"
                    >
                      {item.current} {item.unit}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ПОДСКАЗКА */}
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
        <p className="text-[11px] text-amber-700 leading-relaxed uppercase font-medium">
          * ОСТАТОК ОБНОВЛЯЕТСЯ АВТОМАТИЧЕСКИ ПРИ СОЗДАНИИ ИЛИ УДАЛЕНИИ ДОКУМЕНТОВ ПРИХОДА/ПРОДАЖИ.
        </p>
      </div>
    </div>
  );
}
