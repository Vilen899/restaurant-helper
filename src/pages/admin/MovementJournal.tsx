import { useState, useEffect, useMemo } from "react";
import { History, FileText, Calculator, ArrowRightLeft, Trash2, Loader2, Eye, Package, RefreshCw, Download, Filter, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  ingredient_id: string;
  location_id: string;
  quantity: number;
  type: string;
  reference: string | null;
  vendor_inn: string | null;
  created_at: string;
  ingredient?: { name: string };
  location?: { name: string };
}

interface MaterialDoc {
  id: string;
  type: string;
  doc_number: string | null;
  supplier_name: string | null;
  vendor_inn: string | null;
  total_amount: number | null;
  location_id: string | null;
  created_at: string;
  location?: { name: string };
  items?: { ingredient_id: string; ingredient?: { name: string }; quantity: number; price: number }[];
}

interface Stocktaking {
  id: string;
  location_id: string;
  status: string;
  total_items: number;
  items_with_difference: number;
  surplus_count: number;
  shortage_count: number;
  created_at: string;
  completed_at: string | null;
  location?: { name: string };
  items?: {
    ingredient_id: string;
    ingredient?: { name: string };
    system_quantity: number;
    actual_quantity: number;
    difference: number;
  }[];
}

interface Transfer {
  id: string;
  from_location_id: string;
  to_location_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  from_location?: { name: string };
  to_location?: { name: string };
  items?: { ingredient_id: string; ingredient?: { name: string }; quantity: number }[];
}

export default function MovementJournal() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [materialDocs, setMaterialDocs] = useState<MaterialDoc[]>([]);
  const [stocktakings, setStocktakings] = useState<Stocktaking[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docType, setDocType] = useState<string>("");

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from("locations").select("id, name").eq("is_active", true).order("name");
    setLocations(locs || []);
    await Promise.all([fetchMovements(), fetchMaterialDocs(), fetchStocktakings(), fetchTransfers()]);
    setLoading(false);
  };

  const fetchMovements = async () => {
    const { data } = await supabase
      .from("stock_movements")
      .select("*, ingredient:ingredients(name), location:locations(name)")
      .order("created_at", { ascending: false });
    setMovements((data as Movement[]) || []);
  };

  // Filtered data based on location and date
  const filterByLocationAndDate = <T extends { location_id?: string | null; created_at: string }>(data: T[]): T[] => {
    return data.filter((item) => {
      const matchesLocation = selectedLocation === "all" || item.location_id === selectedLocation;
      const createdDate = new Date(item.created_at);
      const matchesDateFrom = !dateFrom || createdDate >= dateFrom;
      const matchesDateTo = !dateTo || createdDate <= new Date(dateTo.setHours(23, 59, 59, 999));
      return matchesLocation && matchesDateFrom && matchesDateTo;
    });
  };

  const filteredMovements = useMemo(() => filterByLocationAndDate(movements), [movements, selectedLocation, dateFrom, dateTo]);
  const filteredMaterialDocs = useMemo(() => filterByLocationAndDate(materialDocs), [materialDocs, selectedLocation, dateFrom, dateTo]);
  const filteredStocktakings = useMemo(() => filterByLocationAndDate(stocktakings), [stocktakings, selectedLocation, dateFrom, dateTo]);
  
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesLocation = selectedLocation === "all" || t.from_location_id === selectedLocation || t.to_location_id === selectedLocation;
      const createdDate = new Date(t.created_at);
      const matchesDateFrom = !dateFrom || createdDate >= dateFrom;
      const matchesDateTo = !dateTo || createdDate <= new Date(dateTo.setHours(23, 59, 59, 999));
      return matchesLocation && matchesDateFrom && matchesDateTo;
    });
  }, [transfers, selectedLocation, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedLocation("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const fetchMaterialDocs = async () => {
    const { data } = await supabase
      .from("material_documents")
      .select("*, location:locations(name)")
      .order("created_at", { ascending: false });
    setMaterialDocs((data as MaterialDoc[]) || []);
  };

  const fetchStocktakings = async () => {
    const { data } = await supabase
      .from("stocktakings")
      .select("*, location:locations(name)")
      .order("created_at", { ascending: false });
    setStocktakings((data as Stocktaking[]) || []);
  };

  const fetchTransfers = async () => {
    const { data } = await supabase
      .from("transfers")
      .select(
        "*, from_location:locations!transfers_from_location_id_fkey(name), to_location:locations!transfers_to_location_id_fkey(name)",
      )
      .order("created_at", { ascending: false });
    setTransfers((data as Transfer[]) || []);
  };

  const viewDocument = async (doc: any, type: string) => {
    setDocType(type);
    if (type === "material") {
      const { data: items } = await supabase
        .from("material_document_items")
        .select("*, ingredient:ingredients(name)")
        .eq("doc_id", doc.id);
      setSelectedDoc({ ...doc, items });
    } else if (type === "stocktaking") {
      const { data: items } = await supabase
        .from("stocktaking_items")
        .select("*, ingredient:ingredients(name)")
        .eq("stocktaking_id", doc.id);
      setSelectedDoc({ ...doc, items });
    } else if (type === "transfer") {
      const { data: items } = await supabase
        .from("transfer_items")
        .select("*, ingredient:ingredients(name)")
        .eq("transfer_id", doc.id);
      setSelectedDoc({ ...doc, items });
    }
  };

  const handleDeleteMovement = async (id: string) => {
    try {
      await supabase.from("stock_movements").delete().eq("id", id);
      toast.success("ЗАПИСЬ УДАЛЕНА");
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleDeleteMaterialDoc = async (doc: MaterialDoc) => {
    try {
      setLoading(true);
      const { data: items } = await supabase
        .from("material_document_items")
        .select("ingredient_id, quantity")
        .eq("doc_id", doc.id);

      if (items && doc.location_id) {
        for (const item of items) {
          await supabase.rpc("increment_inventory", {
            loc_id: doc.location_id,
            ing_id: item.ingredient_id,
            val: -item.quantity,
          });
        }
      }

      await supabase.from("material_document_items").delete().eq("doc_id", doc.id);
      await supabase.from("material_documents").delete().eq("id", doc.id);
      toast.success("ПРИХОД УДАЛЕН, ОСТАТКИ СКОРРЕКТИРОВАНЫ");
      fetchMaterialDocs();
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА ПРИ ОТКАТЕ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStocktaking = async (st: Stocktaking) => {
    try {
      setLoading(true);
      const { data: items } = await supabase
        .from("stocktaking_items")
        .select("ingredient_id, difference")
        .eq("stocktaking_id", st.id);

      if (items && st.location_id) {
        for (const item of items) {
          await supabase.rpc("increment_inventory", {
            loc_id: st.location_id,
            ing_id: item.ingredient_id,
            val: -item.difference,
          });
        }
      }

      await supabase.from("stocktaking_items").delete().eq("stocktaking_id", st.id);
      await supabase.from("stocktakings").delete().eq("id", st.id);
      toast.success("ИНВЕНТАРИЗАЦИЯ УДАЛЕНА, ОСТАТКИ ВОССТАНОВЛЕНЫ");
      fetchStocktakings();
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransfer = async (transfer: Transfer) => {
    try {
      const { data: items } = await supabase
        .from("transfer_items")
        .select("ingredient_id, quantity")
        .eq("transfer_id", transfer.id);

      if (items && transfer.status === "completed") {
        for (const item of items) {
          await supabase.rpc("increment_inventory", {
            loc_id: transfer.from_location_id,
            ing_id: item.ingredient_id,
            val: item.quantity,
          });
          await supabase.rpc("increment_inventory", {
            loc_id: transfer.to_location_id,
            ing_id: item.ingredient_id,
            val: -item.quantity,
          });
        }
      }

      await supabase.from("transfer_items").delete().eq("transfer_id", transfer.id);
      await supabase.from("transfers").delete().eq("id", transfer.id);
      toast.success("ПЕРЕМЕЩЕНИЕ УДАЛЕНО, ОСТАТКИ ВОЗВРАЩЕНЫ");
      fetchTransfers();
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleClearAll = async () => {
    try {
      await supabase.from("stock_movements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("ЖУРНАЛ ОЧИЩЕН");
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "MIGO_101":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ПРИХОД</Badge>;
      case "MI07_COUNT":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">ИНВЕНТАРИЗАЦИЯ</Badge>;
      case "MB1B_311":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">ПЕРЕМЕЩЕНИЕ</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const exportToExcel = (type: "movements" | "receipts" | "stocktakings" | "transfers") => {
    let data: any[] = [];
    let fileName = "";

    switch (type) {
      case "movements":
        fileName = `Движения_${new Date().toLocaleDateString("ru-RU")}`;
        data = filteredMovements.map((m) => ({
          "Дата/Время": new Date(m.created_at).toLocaleString("ru-RU"),
          "Материал": m.ingredient?.name || "",
          "Количество": m.quantity,
          "Склад": m.location?.name || "",
          "Тип": m.type === "MIGO_101" ? "ПРИХОД" : m.type === "MI07_COUNT" ? "ИНВЕНТАРИЗАЦИЯ" : m.type === "MB1B_311" ? "ПЕРЕМЕЩЕНИЕ" : m.type,
          "Документ": m.reference || "",
          "ИНН поставщика": m.vendor_inn || "",
        }));
        break;
      case "receipts":
        fileName = `Приходы_${new Date().toLocaleDateString("ru-RU")}`;
        data = filteredMaterialDocs.map((doc) => ({
          "Дата": new Date(doc.created_at).toLocaleDateString("ru-RU"),
          "Номер документа": doc.doc_number || "",
          "Поставщик": doc.supplier_name || "",
          "ИНН": doc.vendor_inn || "",
          "Склад": doc.location?.name || "",
          "Сумма": Number(doc.total_amount || 0),
        }));
        break;
      case "stocktakings":
        fileName = `Инвентаризации_${new Date().toLocaleDateString("ru-RU")}`;
        data = filteredStocktakings.map((st) => ({
          "Дата": new Date(st.created_at).toLocaleDateString("ru-RU"),
          "Склад": st.location?.name || "",
          "Статус": st.status === "completed" ? "Завершена" : st.status,
          "Всего позиций": st.total_items,
          "С расхождением": st.items_with_difference,
          "Излишки": st.surplus_count,
          "Недостача": st.shortage_count,
          "Дата завершения": st.completed_at ? new Date(st.completed_at).toLocaleDateString("ru-RU") : "",
        }));
        break;
      case "transfers":
        fileName = `Перемещения_${new Date().toLocaleDateString("ru-RU")}`;
        data = filteredTransfers.map((tr) => ({
          "Дата создания": new Date(tr.created_at).toLocaleDateString("ru-RU"),
          "Со склада": tr.from_location?.name || "",
          "На склад": tr.to_location?.name || "",
          "Статус": tr.status === "completed" ? "Завершено" : tr.status === "pending" ? "Ожидает" : tr.status === "in_transit" ? "В пути" : tr.status,
          "Дата завершения": tr.completed_at ? new Date(tr.completed_at).toLocaleDateString("ru-RU") : "",
        }));
        break;
    }

    if (data.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Данные");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success("Файл экспортирован");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center gap-3">
          <History className="text-amber-500" size={24} />
          <h1 className="text-xl font-bold uppercase">MB51: Журнал документов</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAllData} variant="outline" size="sm" className="font-bold text-xs">
            <RefreshCw size={14} className="mr-1" /> ОБНОВИТЬ
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-bold text-xs">
                <Trash2 size={14} className="mr-1" /> ОЧИСТИТЬ ЖУРНАЛ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Очистить историю движений?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это удалит только записи в журнале (ленту), сами документы останутся.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-red-600">
                  Очистить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-muted/30 border p-4 mb-6 rounded-lg flex flex-wrap gap-3 items-end">
        <div className="w-[200px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">ЛОКАЦИЯ</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <Filter size={14} className="mr-2" />
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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs font-bold">
            ВСЕ ДВИЖЕНИЯ ({filteredMovements.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs font-bold flex gap-1">
            <Package size={14} /> ПРИХОДЫ ({filteredMaterialDocs.length})
          </TabsTrigger>
          <TabsTrigger value="stocktakings" className="text-xs font-bold flex gap-1">
            <Calculator size={14} /> ИНВЕНТАРИЗАЦИИ ({filteredStocktakings.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-xs font-bold flex gap-1">
            <ArrowRightLeft size={14} /> ПЕРЕМЕЩЕНИЯ ({filteredTransfers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="flex justify-end mb-2">
            <Button onClick={() => exportToExcel("movements")} variant="outline" size="sm" className="font-bold text-xs">
              <Download size={14} className="mr-1" /> ЭКСПОРТ EXCEL
            </Button>
          </div>
          {renderMovementsTable(filteredMovements)}
        </TabsContent>
        <TabsContent value="receipts">
          <div className="flex justify-end mb-2">
            <Button onClick={() => exportToExcel("receipts")} variant="outline" size="sm" className="font-bold text-xs">
              <Download size={14} className="mr-1" /> ЭКСПОРТ EXCEL
            </Button>
          </div>
          {renderMaterialDocsTable(filteredMaterialDocs)}
        </TabsContent>
        <TabsContent value="stocktakings">
          <div className="flex justify-end mb-2">
            <Button onClick={() => exportToExcel("stocktakings")} variant="outline" size="sm" className="font-bold text-xs">
              <Download size={14} className="mr-1" /> ЭКСПОРТ EXCEL
            </Button>
          </div>
          {renderStocktakingsTable(filteredStocktakings)}
        </TabsContent>
        <TabsContent value="transfers">
          <div className="flex justify-end mb-2">
            <Button onClick={() => exportToExcel("transfers")} variant="outline" size="sm" className="font-bold text-xs">
              <Download size={14} className="mr-1" /> ЭКСПОРТ EXCEL
            </Button>
          </div>
          {renderTransfersTable(filteredTransfers)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase">
              {docType === "material" && "Документ прихода"}
              {docType === "stocktaking" && "Документ инвентаризации"}
              {docType === "transfer" && "Документ перемещения"}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && renderDocumentDetail()}
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderMovementsTable(data: Movement[]) {
    if (loading)
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    if (data.length === 0) return <div className="text-center py-20 text-muted-foreground">НЕТ ЗАПИСЕЙ</div>;

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата / Время</TableHead>
              <TableHead className="text-xs font-bold">Материал</TableHead>
              <TableHead className="text-right text-xs font-bold">Количество</TableHead>
              <TableHead className="text-center text-xs font-bold">Склад</TableHead>
              <TableHead className="text-xs font-bold">Тип</TableHead>
              <TableHead className="text-xs font-bold">Документ</TableHead>
              <TableHead className="text-center text-xs font-bold w-16">...</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("ru-RU")}
                </TableCell>
                <TableCell className="font-bold uppercase">{m.ingredient?.name}</TableCell>
                <TableCell
                  className={`text-right font-mono font-bold ${m.quantity > 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground uppercase">
                  {m.location?.name}
                </TableCell>
                <TableCell>{getTypeBadge(m.type)}</TableCell>
                <TableCell>
                  <div className="text-xs font-bold">{m.reference}</div>
                  {m.vendor_inn && <div className="text-xs text-blue-400">ИНН: {m.vendor_inn}</div>}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMovement(m.id)}
                    className="h-7 w-7 p-0 text-red-500"
                  >
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  function renderMaterialDocsTable(data: MaterialDoc[]) {
    if (loading)
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    if (data.length === 0) return <div className="text-center py-20 text-muted-foreground">НЕТ ЗАПИСЕЙ</div>;
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата</TableHead>
              <TableHead className="text-xs font-bold">Номер</TableHead>
              <TableHead className="text-xs font-bold">Поставщик</TableHead>
              <TableHead className="text-center text-xs font-bold">Склад</TableHead>
              <TableHead className="text-right text-xs font-bold">Сумма</TableHead>
              <TableHead className="text-center text-xs font-bold w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="font-bold">{doc.doc_number || "—"}</TableCell>
                <TableCell className="uppercase">{doc.supplier_name || "—"}</TableCell>
                <TableCell className="text-center text-xs uppercase">{doc.location?.name}</TableCell>
                <TableCell className="text-right font-bold">₽ {Number(doc.total_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => viewDocument(doc, "material")}
                    >
                      <Eye size={14} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить приход?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это уменьшит остатки на складе на количество из этого документа.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMaterialDoc(doc)} className="bg-red-600">
                            Удалить с откатом
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  function renderStocktakingsTable(data: Stocktaking[]) {
    if (loading)
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    if (data.length === 0) return <div className="text-center py-20 text-muted-foreground">НЕТ ЗАПИСЕЙ</div>;
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата</TableHead>
              <TableHead className="text-center text-xs font-bold">Склад</TableHead>
              <TableHead className="text-center text-xs font-bold text-emerald-500">Излишки</TableHead>
              <TableHead className="text-center text-xs font-bold text-red-500">Недостачи</TableHead>
              <TableHead className="text-center text-xs font-bold">Статус</TableHead>
              <TableHead className="text-center text-xs font-bold w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((st) => (
              <TableRow key={st.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(st.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="text-center uppercase">{st.location?.name}</TableCell>
                <TableCell className="text-center font-bold text-emerald-500">+{st.surplus_count}</TableCell>
                <TableCell className="text-center font-bold text-red-500">-{st.shortage_count}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={st.status === "completed" ? "default" : "secondary"}>
                    {st.status === "completed" ? "ПРОВЕДЕНО" : "ЧЕРНОВИК"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => viewDocument(st, "stocktaking")}
                    >
                      <Eye size={14} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить инвентаризацию?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Результаты подсчета будут отменены, остатки вернутся к исходным значениям.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteStocktaking(st)} className="bg-red-600">
                            Удалить с откатом
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  function renderTransfersTable(data: Transfer[]) {
    if (loading)
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    if (data.length === 0) return <div className="text-center py-20 text-muted-foreground">НЕТ ЗАПИСЕЙ</div>;
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата</TableHead>
              <TableHead className="text-xs font-bold">Откуда</TableHead>
              <TableHead className="text-xs font-bold">Куда</TableHead>
              <TableHead className="text-center text-xs font-bold">Статус</TableHead>
              <TableHead className="text-center text-xs font-bold w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((tr) => (
              <TableRow key={tr.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(tr.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="uppercase font-bold text-red-400">{tr.from_location?.name}</TableCell>
                <TableCell className="uppercase font-bold text-emerald-400">{tr.to_location?.name}</TableCell>
                <TableCell className="text-center">
                  <Badge>{tr.status === "completed" ? "ВЫПОЛНЕНО" : "ОЖИДАЕТ"}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => viewDocument(tr, "transfer")}
                    >
                      <Eye size={14} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить перемещение?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTransfer(tr)} className="bg-red-600">
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  function renderDocumentDetail() {
    if (!selectedDoc) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
          {docType === "material" && (
            <>
              <div>
                <span className="text-muted-foreground">Номер:</span>{" "}
                <span className="ml-2 font-bold">{selectedDoc.doc_number || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Поставщик:</span>{" "}
                <span className="ml-2 font-bold uppercase">{selectedDoc.supplier_name || "—"}</span>
              </div>
            </>
          )}
          {docType === "stocktaking" && (
            <div>
              <span className="text-muted-foreground">Склад:</span>{" "}
              <span className="ml-2 font-bold uppercase">{selectedDoc.location?.name}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Дата:</span>{" "}
            <span className="ml-2">{new Date(selectedDoc.created_at).toLocaleDateString("ru-RU")}</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Товар</TableHead>
              {docType === "stocktaking" ? (
                <>
                  <TableHead className="text-right">Книжный</TableHead>
                  <TableHead className="text-right">Факт</TableHead>
                  <TableHead className="text-right">Разница</TableHead>
                </>
              ) : (
                <TableHead className="text-right">Кол-во</TableHead>
              )}
              {docType === "material" && <TableHead className="text-right">Сумма</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedDoc.items?.map((item: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-bold uppercase">{item.ingredient?.name}</TableCell>
                {docType === "stocktaking" ? (
                  <>
                    <TableCell className="text-right text-muted-foreground">{item.system_quantity}</TableCell>
                    <TableCell className="text-right">{item.actual_quantity}</TableCell>
                    <TableCell
                      className={`text-right font-bold ${item.difference > 0 ? "text-emerald-500" : item.difference < 0 ? "text-red-500" : ""}`}
                    >
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </TableCell>
                  </>
                ) : (
                  <TableCell className="text-right">{item.quantity}</TableCell>
                )}
                {docType === "material" && (
                  <TableCell className="text-right font-bold">
                    ₽ {(item.quantity * (item.price || 0)).toFixed(2)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
