import { useState, useEffect } from "react";
import { Search, Package, AlertTriangle, CheckCircle, XCircle, Download, TrendingDown, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StockStatus = "ok" | "low" | "out" | "negative";

export default function InventoryReportPage() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [reportItems, setReportItems] = useState<any[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем локации
      const { data: locs } = await supabase.from("locations").select("*").order("name");
      setLocations(locs || []);

      // Загружаем остатки с вложенными данными ингредиентов
      const { data: inv, error } = await (supabase.from("inventory").select(`
          id,
          quantity,
          location_id,
          location:locations(name),
          ingredient:ingredients(id, name, unit, min_stock)
        `) as any);

      if (error) throw error;

      // Трансформируем данные для удобного отображения
      const formatted = (inv || []).map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const min = Number(item.ingredient?.min_stock) || 0;

        let status: StockStatus = "ok";
        if (qty < 0) status = "negative";
        else if (qty === 0) status = "out";
        else if (min > 0 && qty < min) status = "low";

        return {
          id: item.id,
          ingredient_name: item.ingredient?.name || "БЕЗ ИМЕНИ",
          unit: item.ingredient?.unit || "шт",
          location_id: item.location_id,
          location_name: item.location?.name || "—",
          quantity: qty,
          min_stock: min,
          status: status,
        };
      });

      setReportItems(formatted);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("ОШИБКА ЗАГРУЗКИ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация
  const filteredItems = reportItems.filter((item) => {
    const matchesSearch = item.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === "all" || item.location_id === selectedLocation;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesLocation && matchesStatus;
  });

  // Сортировка (Критические ошибки - Вверху)
  const sortedItems = [...filteredItems].sort((a, b) => {
    const order = { negative: 0, out: 1, low: 2, ok: 3 };
    return order[a.status as StockStatus] - order[b.status as StockStatus];
  });

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case "ok":
        return (
          <Badge
            variant="outline"
            className="text-emerald-500 border-emerald-500 bg-emerald-500/5 uppercase font-black"
          >
            <CheckCircle className="h-3 w-3 mr-1" /> В НОРМЕ
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500 bg-amber-500/5 uppercase font-black">
            <AlertTriangle className="h-3 w-3 mr-1" /> МАЛО
          </Badge>
        );
      case "out":
        return (
          <Badge variant="destructive" className="uppercase font-black">
            <XCircle className="h-3 w-3 mr-1" /> НЕТ
          </Badge>
        );
      case "negative":
        return (
          <Badge className="bg-red-600 text-white uppercase font-black animate-pulse">
            <TrendingDown className="h-3 w-3 mr-1" /> МИНУС!
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase font-sans space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3">
            <Package className="text-amber-500" size={40} /> ОТЧЕТ MI07: ОСТАТКИ
          </h1>
          <p className="text-zinc-500 font-bold tracking-widest mt-1">ОБЩЕЕ СОСТОЯНИЕ СКЛАДОВ</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={fetchData}
            className="bg-zinc-900 border-white/20 hover:bg-zinc-800 rounded-none h-12"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => toast.info("ФУНКЦИЯ ЭКСПОРТА ГОТОВИТСЯ")}
            className="bg-white text-black hover:bg-zinc-200 rounded-none h-12 font-black px-8"
          >
            <Download className="h-4 w-4 mr-2" /> ЭКСПОРТ CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-white/10 rounded-none">
          <CardHeader className="p-4">
            <CardDescription className="text-[10px] font-black">ВСЕГО ПОЗИЦИЙ</CardDescription>
            <CardTitle className="text-3xl font-black italic">{reportItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-zinc-900/50 border-emerald-500/30 rounded-none border-l-4">
          <CardHeader className="p-4">
            <CardDescription className="text-[10px] font-black text-emerald-500">В НОРМЕ</CardDescription>
            <CardTitle className="text-3xl font-black italic text-emerald-500">
              {reportItems.filter((i) => i.status === "ok").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-zinc-900/50 border-red-500/30 rounded-none border-l-4">
          <CardHeader className="p-4">
            <CardDescription className="text-[10px] font-black text-red-500">КРИТИЧНО (0 ИЛИ МИНУС)</CardDescription>
            <CardTitle className="text-3xl font-black italic text-red-500">
              {reportItems.filter((i) => i.status === "out" || i.status === "negative").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-zinc-900/50 border-amber-500/30 rounded-none border-l-4">
          <CardHeader className="p-4">
            <CardDescription className="text-[10px] font-black text-amber-500">НИЖЕ МИНИМУМА</CardDescription>
            <CardTitle className="text-3xl font-black italic text-amber-500">
              {reportItems.filter((i) => i.status === "low").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="bg-zinc-900/50 border border-white/10 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="ПОИСК ТОВАРА..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-black border-white/20 rounded-none h-12 font-bold"
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-full md:w-[250px] bg-black border-white/20 rounded-none h-12 font-bold">
            <SelectValue placeholder="ВСЕ СКЛАДЫ" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/20 text-white rounded-none">
            <SelectItem value="all">ВСЕ СКЛАДЫ</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] bg-black border-white/20 rounded-none h-12 font-bold">
            <SelectValue placeholder="СТАТУС" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/20 text-white rounded-none">
            <SelectItem value="all">ВСЕ СТАТУСЫ</SelectItem>
            <SelectItem value="ok">В НОРМЕ</SelectItem>
            <SelectItem value="low">МАЛО</SelectItem>
            <SelectItem value="out">НЕТ</SelectItem>
            <SelectItem value="negative">ОТРИЦАТЕЛЬНЫЕ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-white/10 bg-zinc-900/20">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="hover:bg-white border-none h-12">
              <TableHead className="text-black font-black pl-6">МАТЕРИАЛ</TableHead>
              <TableHead className="text-black font-black">ЛОКАЦИЯ</TableHead>
              <TableHead className="text-black font-black text-right">ОСТАТОК</TableHead>
              <TableHead className="text-black font-black text-right">МИН. ПОРОГ</TableHead>
              <TableHead className="text-black font-black text-center">СТАТУС</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center animate-pulse font-black text-zinc-500">
                  ЗАГРУЗКА ДАННЫХ...
                </TableCell>
              </TableRow>
            ) : sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center italic text-zinc-600">
                  НИЧЕГО НЕ НАЙДЕНО
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={`border-b border-white/5 h-16 transition-colors ${item.status === "negative" ? "bg-red-500/10" : "hover:bg-white/5"}`}
                >
                  <TableCell className="pl-6 font-black italic text-lg tracking-tighter">
                    {item.ingredient_name}
                  </TableCell>
                  <TableCell className="text-zinc-400 font-bold">{item.location_name}</TableCell>
                  <TableCell
                    className={`text-right font-mono font-black text-lg ${item.status === "negative" ? "text-red-500" : ""}`}
                  >
                    {item.quantity.toFixed(3)} <span className="text-[10px] text-zinc-500 ml-1">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-zinc-500 font-mono">
                    {item.min_stock > 0 ? item.min_stock.toFixed(3) : "—"}
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
