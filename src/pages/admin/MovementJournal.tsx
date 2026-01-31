import { useState, useEffect } from "react";
import { History, FileText, Calculator, ArrowRightLeft, Trash2, Loader2, Eye, Package, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  items?: { ingredient?: { name: string }; quantity: number; price: number }[];
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
  items?: { ingredient?: { name: string }; system_quantity: number; actual_quantity: number; difference: number }[];
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
  items?: { ingredient?: { name: string }; quantity: number }[];
}

export default function MovementJournal() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [materialDocs, setMaterialDocs] = useState<MaterialDoc[]>([]);
  const [stocktakings, setStocktakings] = useState<Stocktaking[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docType, setDocType] = useState<string>("");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMovements(),
      fetchMaterialDocs(),
      fetchStocktakings(),
      fetchTransfers(),
    ]);
    setLoading(false);
  };

  const fetchMovements = async () => {
    const { data } = await supabase
      .from("stock_movements")
      .select("*, ingredient:ingredients(name), location:locations(name)")
      .order("created_at", { ascending: false });
    setMovements((data as Movement[]) || []);
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
      .select("*, from_location:locations!transfers_from_location_id_fkey(name), to_location:locations!transfers_to_location_id_fkey(name)")
      .order("created_at", { ascending: false });
    setTransfers((data as Transfer[]) || []);
  };

  // View document details
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

  // Delete handlers
  const handleDeleteMovement = async (id: string) => {
    try {
      await supabase.from("stock_movements").delete().eq("id", id);
      toast.success("ЗАПИСЬ УДАЛЕНА");
      fetchMovements();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleDeleteMaterialDoc = async (id: string) => {
    try {
      await supabase.from("material_document_items").delete().eq("doc_id", id);
      await supabase.from("material_documents").delete().eq("id", id);
      toast.success("ДОКУМЕНТ УДАЛЁН");
      fetchMaterialDocs();
    } catch (error: any) {
      toast.error("ОШИБКА: " + error.message);
    }
  };

  const handleDeleteTransfer = async (transfer: Transfer) => {
    try {
      // Get transfer items to rollback inventory
      const { data: items } = await supabase
        .from("transfer_items")
        .select("ingredient_id, quantity")
        .eq("transfer_id", transfer.id);

      if (items && transfer.status === "completed") {
        // Rollback inventory
        for (const item of items) {
          await supabase.rpc("increment_inventory", {
            loc_id: transfer.from_location_id,
            ing_id: item.ingredient_id,
            val: item.quantity, // Return to source
          });
          await supabase.rpc("increment_inventory", {
            loc_id: transfer.to_location_id,
            ing_id: item.ingredient_id,
            val: -item.quantity, // Remove from target
          });
        }
      }

      await supabase.from("transfer_items").delete().eq("transfer_id", transfer.id);
      await supabase.from("transfers").delete().eq("id", transfer.id);
      toast.success("ПЕРЕМЕЩЕНИЕ УДАЛЕНО, ОСТАТКИ ВОЗВРАЩЕНЫ");
      fetchTransfers();
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

  // Filter movements by type
  const invoices = movements.filter((m) => m.type === "MIGO_101");
  const inventoryMovements = movements.filter((m) => m.type === "MI07_COUNT");
  const transferMovements = movements.filter((m) => m.type === "MB1B_311");

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans">
      {/* Header */}
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
                <Trash2 size={14} className="mr-1" /> ОЧИСТИТЬ ВСЁ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Очистить журнал движений?</AlertDialogTitle>
                <AlertDialogDescription>
                  Все записи о движениях будут удалены. Это действие необратимо.
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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs font-bold">
            ВСЕ ДВИЖЕНИЯ ({movements.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs font-bold flex gap-1">
            <Package size={14} /> ПРИХОДЫ ({materialDocs.length})
          </TabsTrigger>
          <TabsTrigger value="stocktakings" className="text-xs font-bold flex gap-1">
            <Calculator size={14} /> ИНВЕНТАРИЗАЦИИ ({stocktakings.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-xs font-bold flex gap-1">
            <ArrowRightLeft size={14} /> ПЕРЕМЕЩЕНИЯ ({transfers.length})
          </TabsTrigger>
        </TabsList>

        {/* All Movements Tab */}
        <TabsContent value="all">
          {renderMovementsTable(movements)}
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts">
          {renderMaterialDocsTable()}
        </TabsContent>

        {/* Stocktakings Tab */}
        <TabsContent value="stocktakings">
          {renderStocktakingsTable()}
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          {renderTransfersTable()}
        </TabsContent>
      </Tabs>

      {/* Document Detail Dialog */}
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
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    }

    if (data.length === 0) {
      return <div className="text-center py-20 text-muted-foreground">НЕТ ЗАПИСЕЙ</div>;
    }

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
                <TableCell className={`text-right font-mono font-bold ${m.quantity > 0 ? "text-emerald-500" : "text-red-500"}`}>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
                        <AlertDialogDescription>Запись будет удалена из журнала.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteMovement(m.id)} className="bg-red-600">
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  function renderMaterialDocsTable() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    }

    if (materialDocs.length === 0) {
      return <div className="text-center py-20 text-muted-foreground">НЕТ ДОКУМЕНТОВ ПРИХОДА</div>;
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата</TableHead>
              <TableHead className="text-xs font-bold">Номер документа</TableHead>
              <TableHead className="text-xs font-bold">Поставщик</TableHead>
              <TableHead className="text-xs font-bold">ИНН</TableHead>
              <TableHead className="text-center text-xs font-bold">Склад</TableHead>
              <TableHead className="text-right text-xs font-bold">Сумма</TableHead>
              <TableHead className="text-center text-xs font-bold w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialDocs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="font-bold">{doc.doc_number || "—"}</TableCell>
                <TableCell className="uppercase">{doc.supplier_name || "—"}</TableCell>
                <TableCell className="text-xs text-blue-400">{doc.vendor_inn || "—"}</TableCell>
                <TableCell className="text-center text-xs uppercase">{doc.location?.name}</TableCell>
                <TableCell className="text-right font-bold">₽ {Number(doc.total_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDocument(doc, "material")}>
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
                          <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                          <AlertDialogDescription>Документ и все его позиции будут удалены.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMaterialDoc(doc.id)} className="bg-red-600">
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

  function renderStocktakingsTable() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    }

    if (stocktakings.length === 0) {
      return <div className="text-center py-20 text-muted-foreground">НЕТ ДОКУМЕНТОВ ИНВЕНТАРИЗАЦИИ</div>;
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold">Дата</TableHead>
              <TableHead className="text-center text-xs font-bold">Склад</TableHead>
              <TableHead className="text-center text-xs font-bold">Позиций</TableHead>
              <TableHead className="text-center text-xs font-bold text-emerald-500">Излишки</TableHead>
              <TableHead className="text-center text-xs font-bold text-red-500">Недостачи</TableHead>
              <TableHead className="text-center text-xs font-bold">Статус</TableHead>
              <TableHead className="text-center text-xs font-bold w-16">...</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocktakings.map((st) => (
              <TableRow key={st.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(st.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="text-center uppercase">{st.location?.name}</TableCell>
                <TableCell className="text-center font-bold">{st.total_items}</TableCell>
                <TableCell className="text-center font-bold text-emerald-500">+{st.surplus_count}</TableCell>
                <TableCell className="text-center font-bold text-red-500">-{st.shortage_count}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={st.status === "completed" ? "default" : "secondary"}>
                    {st.status === "completed" ? "ПРОВЕДЕНО" : st.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDocument(st, "stocktaking")}>
                    <Eye size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  function renderTransfersTable() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={30} />
        </div>
      );
    }

    if (transfers.length === 0) {
      return <div className="text-center py-20 text-muted-foreground">НЕТ ДОКУМЕНТОВ ПЕРЕМЕЩЕНИЯ</div>;
    }

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
            {transfers.map((tr) => (
              <TableRow key={tr.id}>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(tr.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="uppercase font-bold text-red-400">{tr.from_location?.name}</TableCell>
                <TableCell className="uppercase font-bold text-emerald-400">{tr.to_location?.name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={tr.status === "completed" ? "default" : "secondary"}>
                    {tr.status === "completed" ? "ВЫПОЛНЕНО" : tr.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDocument(tr, "transfer")}>
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
                          <AlertDialogDescription>
                            Документ будет удалён, а остатки возвращены на исходные места.
                          </AlertDialogDescription>
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

    if (docType === "material") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Номер:</span>
              <span className="ml-2 font-bold">{selectedDoc.doc_number || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Дата:</span>
              <span className="ml-2">{new Date(selectedDoc.created_at).toLocaleDateString("ru-RU")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Поставщик:</span>
              <span className="ml-2 font-bold uppercase">{selectedDoc.supplier_name || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">ИНН:</span>
              <span className="ml-2 text-blue-400">{selectedDoc.vendor_inn || "—"}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead className="text-right">Кол-во</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDoc.items?.map((item: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-bold uppercase">{item.ingredient?.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">₽ {Number(item.price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">
                    ₽ {(item.quantity * (item.price || 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-right font-bold text-lg">
            ИТОГО: ₽ {Number(selectedDoc.total_amount || 0).toFixed(2)}
          </div>
        </div>
      );
    }

    if (docType === "stocktaking") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Склад:</span>
              <span className="ml-2 font-bold uppercase">{selectedDoc.location?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Дата:</span>
              <span className="ml-2">{new Date(selectedDoc.created_at).toLocaleDateString("ru-RU")}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead className="text-right">Книжный</TableHead>
                <TableHead className="text-right">Факт</TableHead>
                <TableHead className="text-right">Разница</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDoc.items?.map((item: any, idx: number) => {
                const diff = item.difference || 0;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-bold uppercase">{item.ingredient?.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.system_quantity}</TableCell>
                    <TableCell className="text-right">{item.actual_quantity}</TableCell>
                    <TableCell className={`text-right font-bold ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : ""}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (docType === "transfer") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Откуда:</span>
              <span className="ml-2 font-bold text-red-400 uppercase">{selectedDoc.from_location?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Куда:</span>
              <span className="ml-2 font-bold text-emerald-400 uppercase">{selectedDoc.to_location?.name}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead className="text-right">Количество</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDoc.items?.map((item: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-bold uppercase">{item.ingredient?.name}</TableCell>
                  <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return null;
  }
}
