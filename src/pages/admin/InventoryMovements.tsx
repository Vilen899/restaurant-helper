import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Search, RefreshCw, Download, Filter, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface InventoryMovement {
  id: string;
  location_id: string;
  ingredient_id: string;
  movement_type: string;
  quantity: number;
  cost_per_unit: number | null;
  notes: string | null;
  reference_id: string | null;
  created_at: string;
  ingredient?: { name: string; unit?: { abbreviation: string } };
  location?: { name: string };
}

interface Location {
  id: string;
  name: string;
}

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sale: { label: "Продажа", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  supply: { label: "Поставка", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  transfer_in: { label: "Приход (перемещение)", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  transfer_out: { label: "Расход (перемещение)", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  adjustment: { label: "Корректировка", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  write_off: { label: "Списание", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: locs }, { data: movs }] = await Promise.all([
        supabase.from("locations").select("id, name").eq("is_active", true).order("name"),
        supabase
          .from("inventory_movements")
          .select("*, ingredient:ingredients(name, unit:units(abbreviation)), location:locations(name)")
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);
      
      setLocations(locs || []);
      setMovements((movs as InventoryMovement[]) || []);
    } catch (error: any) {
      toast.error("Ошибка загрузки: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch = m.ingredient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           m.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = selectedLocation === "all" || m.location_id === selectedLocation;
      const matchesType = selectedType === "all" || m.movement_type === selectedType;
      
      const createdDate = new Date(m.created_at);
      const matchesDateFrom = !dateFrom || createdDate >= dateFrom;
      const matchesDateTo = !dateTo || createdDate <= new Date(dateTo.setHours(23, 59, 59, 999));
      
      return matchesSearch && matchesLocation && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [movements, searchTerm, selectedLocation, selectedType, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const supply = filteredMovements.filter(m => m.movement_type === "supply").reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const sale = filteredMovements.filter(m => m.movement_type === "sale").reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const adjustment = filteredMovements.filter(m => m.movement_type === "adjustment").reduce((sum, m) => sum + m.quantity, 0);
    return { supply, sale, adjustment };
  }, [filteredMovements]);

  const exportToExcel = () => {
    if (filteredMovements.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }

    const data = filteredMovements.map((m) => ({
      "Дата/Время": new Date(m.created_at).toLocaleString("ru-RU"),
      "Ингредиент": m.ingredient?.name || "",
      "Локация": m.location?.name || "",
      "Тип операции": MOVEMENT_TYPE_LABELS[m.movement_type]?.label || m.movement_type,
      "Количество": m.quantity,
      "Ед. изм.": m.ingredient?.unit?.abbreviation || "",
      "Цена за ед.": m.cost_per_unit || "",
      "Примечание": m.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Движения");
    XLSX.writeFile(wb, `Движение_товаров_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Файл экспортирован");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLocation("all");
    setSelectedType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-emerald-500" size={24} />
          <h1 className="text-xl font-bold uppercase">Движение товаров</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" className="font-bold text-xs">
            <RefreshCw size={14} className="mr-1" /> ОБНОВИТЬ
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="font-bold text-xs">
            <Download size={14} className="mr-1" /> ЭКСПОРТ EXCEL
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-xs text-muted-foreground">ВСЕГО ЗАПИСЕЙ</CardTitle>
            <p className="text-2xl font-bold">{filteredMovements.length}</p>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="p-4">
            <CardTitle className="text-xs text-emerald-500">ПОСТАВКИ</CardTitle>
            <p className="text-2xl font-bold text-emerald-500">+{stats.supply.toFixed(2)}</p>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="p-4">
            <CardTitle className="text-xs text-red-500">ПРОДАЖИ</CardTitle>
            <p className="text-2xl font-bold text-red-500">-{stats.sale.toFixed(2)}</p>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-zinc-500">
          <CardHeader className="p-4">
            <CardTitle className="text-xs text-muted-foreground">КОРРЕКТИРОВКИ</CardTitle>
            <p className="text-2xl font-bold">{stats.adjustment >= 0 ? "+" : ""}{stats.adjustment.toFixed(2)}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-muted/30 border p-4 mb-6 rounded-lg flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">ПОИСК</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="По названию или примечанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="w-[180px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">ЛОКАЦИЯ</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Все локации" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все локации</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">ТИП ОПЕРАЦИИ</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[160px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">ДАТА С</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <Calendar size={14} className="mr-2" />
                {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "Выбрать"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                locale={ru}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-[160px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">ДАТА ПО</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <Calendar size={14} className="mr-2" />
                {dateTo ? format(dateTo, "dd.MM.yyyy") : "Выбрать"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                locale={ru}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
          Сбросить
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата / Время</TableHead>
              <TableHead className="text-xs font-bold">Ингредиент</TableHead>
              <TableHead className="text-xs font-bold">Локация</TableHead>
              <TableHead className="text-xs font-bold">Тип операции</TableHead>
              <TableHead className="text-right text-xs font-bold">Количество</TableHead>
              <TableHead className="text-xs font-bold">Примечание</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Нет записей
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="font-bold">{m.ingredient?.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.location?.name}</TableCell>
                  <TableCell>
                    <Badge className={MOVEMENT_TYPE_LABELS[m.movement_type]?.color || ""}>
                      {MOVEMENT_TYPE_LABELS[m.movement_type]?.label || m.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${m.quantity > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    <span className="text-xs text-muted-foreground ml-1">{m.ingredient?.unit?.abbreviation}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {m.notes || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
