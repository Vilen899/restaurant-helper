import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRightLeft,
  Plus,
  Calculator,
  Edit3,
  Trash2,
  X,
  RotateCcw,
  Box,
  ArrowDownRight,
  ArrowUpRight,
  FileStack,
  Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<string>("all");

  // SAP Transaction-like States
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [editItem, setEditItem] = useState<any>(null);
  const [supplyForm, setSupplyForm] = useState({
    loc_id: "",
    inn: "",
    series: "",
    num: "",
    total: "",
    items: [{ id: "", qty: "" }],
  });
  const [transferForm, setTransferForm] = useState({
    from: "",
    to: "",
    items: [{ id: "", qty: "" }],
  });
  const [stockItems, setStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
    const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    setInventory(inv || []);
    setIngredients(ings || []);
    setLocations(locs || []);
    setLoading(false);
  };

  // --- MIGO: Goods Receipt (Приход) ---
  const handleSupply = async () => {
    if (supplyForm.inn.length !== 8) return toast.error("ИНН Армении: 8 цифр");
    try {
      for (const item of supplyForm.items) {
        if (!item.id || !item.qty) continue;
        const { data: ex } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.loc_id)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (ex) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(ex.quantity) + Number(item.qty) })
            .eq("id", ex.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: supplyForm.loc_id, ingredient_id: item.id, quantity: Number(item.qty) });
        }
      }
      toast.success("MIGO: Приход выполнен");
      setSupplyOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка транзакции");
    }
  };

  // --- MB1B: Transfer Posting (Перемещение) ---
  const handleTransfer = async () => {
    if (!transferForm.from || !transferForm.to) return toast.error("Укажите заводы (склады)");
    try {
      for (const item of transferForm.items) {
        if (!item.id || !item.qty) continue;
        const { data: src } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (!src || src.quantity < item.qty) {
          toast.error("Недостаточно на складе");
          continue;
        }

        await supabase
          .from("inventory")
          .update({ quantity: Number(src.quantity) - Number(item.qty) })
          .eq("id", src.id);
        const { data: dst } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to)
          .eq("ingredient_id", item.id)
          .maybeSingle();

        if (dst) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(dst.quantity) + Number(item.qty) })
            .eq("id", dst.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to, ingredient_id: item.id, quantity: Number(item.qty) });
        }
      }
      toast.success("MB1B: Перемещение завершено");
      setTransferOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка переноса");
    }
  };

  // --- MI01/MI04/MI07: Physical Inventory (Инвентаризация) ---
  const startStock = () => {
    if (selectedLoc === "all") return toast.error("Выберите склад для инвентаризации");
    setStockItems(
      inventory
        .filter((i) => i.location_id === selectedLoc)
        .map((i) => ({
          inv_id: i.id,
          ing_id: i.ingredient_id,
          name: i.ingredient?.name,
          sys: i.quantity,
          act: i.quantity.toString(),
          isNew: false,
        })),
    );
    setStockOpen(true);
  };

  const saveStock = async () => {
    try {
      for (const it of stockItems) {
        if (!it.ing_id) continue;
        if (it.inv_id) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(it.act) })
            .eq("id", it.inv_id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: selectedLoc, ingredient_id: it.ing_id, quantity: Number(it.act) });
        }
      }
      toast.success("MI07: Разницы проведены");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка закрытия документа");
    }
  };

  const filtered = useMemo(
    () =>
      inventory.filter(
        (i) =>
          i.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedLoc === "all" || i.location_id === selectedLoc),
      ),
    [inventory, searchTerm, selectedLoc],
  );

  return (
    <div className="p-4 bg-[#0a0a0a] min-h-screen text-zinc-300 font-mono">
      {/* HEADER: SAP STYLE */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" /> SAP ERP - Material Management
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Transaction: MM_STOCK_CONTROL_ARM</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={startStock}
            className="h-8 border-white/10 text-[10px] bg-white/5 uppercase"
          >
            MI01 - Сверка
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTransferOpen(true)}
            className="h-8 border-white/10 text-[10px] bg-white/5 uppercase"
          >
            MB1B - Перенос
          </Button>
          <Button
            size="sm"
            onClick={() => setSupplyOpen(true)}
            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-[10px] uppercase font-bold text-white"
          >
            MIGO - Приход
          </Button>
        </div>
      </div>

      {/* COMMAND BAR */}
      <div className="grid grid-cols-12 gap-2 mb-4">
        <div className="col-span-9 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input
            placeholder="Поиск материала..."
            className="h-10 pl-10 bg-[#111] border-white/5 rounded-none focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-span-3">
          <Select value={selectedLoc} onValueChange={setSelectedLoc}>
            <SelectTrigger className="h-10 bg-[#111] border-white/5 rounded-none">
              <SelectValue placeholder="Склад" />
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
      </div>

      {/* DATA TABLE */}
      <div className="border border-white/5 bg-[#111]/50 shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 h-10 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold pl-4">Материал</TableHead>
              <TableHead className="text-center text-[10px] uppercase font-bold">Заводской запас</TableHead>
              <TableHead className="text-center text-[10px] uppercase font-bold">Склад</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold pr-4 italic">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="border-white/5 h-12 hover:bg-white/5 transition-colors group">
                <TableCell className="pl-4 font-bold text-zinc-100">{item.ingredient?.name}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-lg font-black ${item.quantity <= 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {Number(item.quantity).toFixed(3)}
                    </span>
                    <span className="text-[9px] text-zinc-600 uppercase italic leading-none">
                      {item.ingredient?.unit?.abbreviation}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-indigo-500/10 text-indigo-400 border-none rounded-sm text-[9px] uppercase tracking-tighter">
                    {item.location?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditItem(item);
                        setEditOpen(true);
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-red-500"
                      onClick={async () => {
                        if (confirm("Удалить позицию?")) {
                          await supabase.from("inventory").delete().eq("id", item.id);
                          fetchData();
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MIGO: GOODS RECEIPT */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 font-mono">
          <DialogHeader className="border-b border-white/5 pb-2">
            <DialogTitle className="text-sm uppercase font-bold flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-emerald-500" /> MIGO - Приход материала
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 uppercase">ИНН (8 цифр)</Label>
              <Input
                maxLength={8}
                className="h-9 bg-black border-white/10 rounded-none font-bold"
                value={supplyForm.inn}
                onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 uppercase">Склад</Label>
              <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                <SelectTrigger className="h-9 bg-black border-white/10 rounded-none">
                  <SelectValue placeholder="Storage Loc" />
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
            <div className="flex gap-2">
              <Input
                placeholder="SER"
                className="w-12 h-9 bg-black border-white/10 rounded-none uppercase"
                value={supplyForm.series}
                onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
              />
              <Input
                placeholder="DOC NUMBER"
                className="flex-1 h-9 bg-black border-white/10 rounded-none"
                value={supplyForm.num}
                onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 uppercase">Сумма</Label>
              <Input
                className="h-9 bg-black border-white/10 text-emerald-500 font-bold rounded-none"
                value={supplyForm.total}
                onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {supplyForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-white/5 p-2 border border-white/5">
                <Select
                  onValueChange={(v) => {
                    const n = [...supplyForm.items];
                    n[idx].id = v;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-transparent border-none text-[10px]">
                    <SelectValue placeholder="Выбрать материал" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white">
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="QTY"
                  className="w-20 h-8 bg-zinc-950 border-none text-center text-xs"
                  onChange={(e) => {
                    const n = [...supplyForm.items];
                    n[idx].qty = e.target.value;
                    setSupplyForm({ ...supplyForm, items: n });
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="w-full h-8 text-[10px] uppercase text-zinc-500 hover:text-white"
            onClick={() => setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { id: "", qty: "" }] })}
          >
            + Add Line Item
          </Button>
          <Button
            onClick={handleSupply}
            className="w-full bg-emerald-700 hover:bg-emerald-600 h-10 mt-4 rounded-none font-bold uppercase text-xs"
          >
            Post Goods Receipt
          </Button>
        </DialogContent>
      </Dialog>

      {/* MB1B: TRANSFER POSTING */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 font-mono">
          <DialogHeader className="border-b border-white/5 pb-2">
            <DialogTitle className="text-sm uppercase font-bold flex items-center gap-2 text-orange-400">
              <ArrowRightLeft className="w-4 h-4" /> MB1B - Перемещение
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, from: v })}>
              <SelectTrigger className="h-9 bg-black rounded-none border-white/10">
                <SelectValue placeholder="Source Loc" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white">
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setTransferForm({ ...transferForm, to: v })}>
              <SelectTrigger className="h-9 bg-black rounded-none border-white/10">
                <SelectValue placeholder="Dest Loc" />
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
          <div className="mt-4 space-y-2">
            {transferForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const n = [...transferForm.items];
                    n[idx].id = v;
                    setTransferForm({ ...transferForm, items: n });
                  }}
                >
                  <SelectTrigger className="h-9 flex-1 bg-zinc-900 border-white/10">
                    <SelectValue placeholder="Material" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white">
                    {inventory
                      .filter((i) => i.location_id === transferForm.from)
                      .map((i) => (
                        <SelectItem key={i.ingredient_id} value={i.ingredient_id}>
                          {i.ingredient?.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Qty"
                  className="w-24 h-9 bg-zinc-900 border-white/10 text-center"
                  onChange={(e) => {
                    const n = [...transferForm.items];
                    n[idx].qty = e.target.value;
                    setTransferForm({ ...transferForm, items: n });
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            onClick={handleTransfer}
            className="w-full bg-orange-700 hover:bg-orange-600 h-10 mt-6 font-bold uppercase text-xs rounded-none"
          >
            Post Transfer
          </Button>
        </DialogContent>
      </Dialog>

      {/* MI01: PHYSICAL INVENTORY */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 max-w-3xl h-[80vh] flex flex-col font-mono">
          <DialogHeader className="border-b border-white/5 pb-2 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm uppercase font-bold flex items-center gap-2 text-indigo-400">
              <Calculator className="w-4 h-4" /> MI01 - Инвентаризация
            </DialogTitle>{" "}
            <Badge variant="outline" className="text-[10px] rounded-none">
              {locations.find((l) => l.id === selectedLoc)?.name}
            </Badge>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 border border-white/5 bg-black/40">
            <Table>
              <TableHeader className="bg-zinc-900 sticky top-0 z-20 h-10 text-[9px] uppercase">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Материал</TableHead>
                  <TableHead className="text-center">System</TableHead>
                  <TableHead className="text-center">Count</TableHead>
                  <TableHead className="text-right pr-6">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it, idx) => {
                  const diff = Number(it.act) - Number(it.sys);
                  return (
                    <TableRow key={idx} className="border-white/5 h-10 hover:bg-white/5">
                      <TableCell className="font-bold text-xs uppercase">
                        {it.isNew ? (
                          <Select
                            onValueChange={(v) => {
                              const n = [...stockItems];
                              n[idx].ing_id = v;
                              n[idx].name = ingredients.find((i) => i.id === v)?.name;
                              setStockItems(n);
                            }}
                          >
                            <SelectTrigger className="h-7 bg-zinc-800 border-none text-[10px] w-48">
                              <SelectValue placeholder="Add Material" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 text-white">
                              {ingredients.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          it.name
                        )}
                      </TableCell>
                      <TableCell className="text-center text-zinc-500 font-mono text-[11px]">
                        {Number(it.sys).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={it.act}
                          onChange={(e) => {
                            const n = [...stockItems];
                            n[idx].act = e.target.value;
                            setStockItems(n);
                          }}
                          className="w-20 h-7 mx-auto text-center bg-zinc-900 border-white/10 text-indigo-400 font-bold rounded-none"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right pr-6 font-bold text-xs ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-zinc-700"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-9 border-dashed rounded-none text-[9px] uppercase font-bold"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
            >
              MI02 - Add Item
            </Button>
            <Button
              onClick={saveStock}
              className="flex-[2] bg-indigo-700 hover:bg-indigo-600 h-9 font-bold uppercase text-xs rounded-none"
            >
              MI07 - Post Differences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MM02: CHANGE MATERIAL STOCK */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 font-mono max-w-xs">
          <DialogHeader className="border-b border-white/5 pb-2">
            <DialogTitle className="text-sm uppercase font-bold text-center">MM02 - Корректировка</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-600 uppercase font-bold">{editItem?.ingredient?.name}</p>
              <Input
                type="number"
                className="h-16 bg-black border-white/10 text-center text-4xl font-black text-indigo-500 rounded-none shadow-inner"
                value={editItem?.quantity}
                onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red-900 text-red-500 hover:bg-red-950 h-10 rounded-none text-[10px] uppercase font-bold"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-3 h-3 mr-2" /> Reset (0)
              </Button>
              <Button
                className="flex-1 bg-indigo-700 hover:bg-indigo-600 h-10 rounded-none font-bold uppercase text-[10px]"
                onClick={async () => {
                  await supabase
                    .from("inventory")
                    .update({ quantity: Number(editItem.quantity) })
                    .eq("id", editItem.id);
                  setEditOpen(false);
                  fetchData();
                  toast.success("Stock Updated");
                }}
              >
                Post Change
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
