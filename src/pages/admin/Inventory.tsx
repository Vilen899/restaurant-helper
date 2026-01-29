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
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
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

  // SAP Transaction Windows
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Forms
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
    try {
      const { data: inv } = await supabase
        .from("inventory")
        .select("*, ingredient:ingredients(*, unit:units(*)), location:locations(*)");
      const { data: ings } = await supabase.from("ingredients").select("*, unit:units(*)").eq("is_active", true);
      const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
      setInventory(inv || []);
      setIngredients(ings || []);
      setLocations(locs || []);
    } catch (e) {
      toast.error("Data Load Error");
    } finally {
      setLoading(false);
    }
  };

  // --- MIGO: Goods Receipt Logic (Приход) ---
  const handleSupply = async () => {
    if (supplyForm.inn.length !== 8) return toast.error("ИНН Армении должен содержать 8 цифр");
    if (!supplyForm.loc_id) return toast.error("Выберите склад назначения");

    try {
      for (const item of supplyForm.items) {
        if (!item.id || !item.qty) continue;
        const inputQty = Number(item.qty);

        const { data: existing } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", supplyForm.loc_id)
          .eq("ingredient_id", item.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(existing.quantity) + inputQty })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: supplyForm.loc_id, ingredient_id: item.id, quantity: inputQty });
        }
      }
      toast.success("MIGO: Goods Receipt Posted");
      setSupplyOpen(false);
      setSupplyForm({ loc_id: "", inn: "", series: "", num: "", total: "", items: [{ id: "", qty: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Transaction Failed");
    }
  };

  // --- MB1B: Transfer Posting Logic (Перемещение) ---
  const handleTransfer = async () => {
    if (!transferForm.from || !transferForm.to) return toast.error("Укажите склады");
    if (transferForm.from === transferForm.to) return toast.error("Склады должны различаться");

    try {
      for (const item of transferForm.items) {
        if (!item.id || !item.qty) continue;
        const transferQty = Number(item.qty);

        // Source Stock Check
        const { data: src } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.from)
          .eq("ingredient_id", item.id)
          .maybeSingle();

        if (!src || Number(src.quantity) < transferQty) {
          toast.error(`Недостаточно товара ${item.id} на складе`);
          continue;
        }

        // Subtract from Source
        await supabase
          .from("inventory")
          .update({ quantity: Number(src.quantity) - transferQty })
          .eq("id", src.id);

        // Add to Destination
        const { data: dst } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", transferForm.to)
          .eq("ingredient_id", item.id)
          .maybeSingle();
        if (dst) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(dst.quantity) + transferQty })
            .eq("id", dst.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: transferForm.to, ingredient_id: item.id, quantity: transferQty });
        }
      }
      toast.success("MB1B: Transfer Completed");
      setTransferOpen(false);
      setTransferForm({ from: "", to: "", items: [{ id: "", qty: "" }] });
      fetchData();
    } catch (e) {
      toast.error("Transfer Error");
    }
  };

  // --- MI01 / MI07: Physical Inventory Logic (Инвентаризация) ---
  const startStock = () => {
    if (selectedLoc === "all") return toast.error("Сначала выберите склад");
    const docItems = inventory
      .filter((i) => i.location_id === selectedLoc)
      .map((i) => ({
        inv_id: i.id,
        ing_id: i.ingredient_id,
        name: i.ingredient?.name,
        sys: Number(i.quantity) || 0,
        act: (i.quantity || 0).toString(),
        isNew: false,
      }));
    setStockItems(docItems);
    setStockOpen(true);
  };

  const saveStock = async () => {
    try {
      for (const it of stockItems) {
        if (!it.ing_id) continue;
        const finalQty = Number(it.act);
        if (it.inv_id) {
          await supabase.from("inventory").update({ quantity: finalQty }).eq("id", it.inv_id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: selectedLoc, ingredient_id: it.ing_id, quantity: finalQty });
        }
      }
      toast.success("MI07: Differences Posted");
      setStockOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Inventory Save Error");
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
      {/* HEADER: SAP ERP STYLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Database className="w-6 h-6 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">SAP-MM Control</h1>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] mt-1 ml-1">TR-CODE: ARM_STOCK_V2</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={startStock}
            className="h-9 border-white/10 text-[10px] bg-white/5 uppercase font-bold tracking-widest px-4"
          >
            MI01 - Inventory
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTransferOpen(true)}
            className="h-9 border-white/10 text-[10px] bg-white/5 uppercase font-bold tracking-widest px-4 text-orange-400"
          >
            MB1B - Transfer
          </Button>
          <Button
            size="sm"
            onClick={() => setSupplyOpen(true)}
            className="h-9 bg-indigo-600 hover:bg-indigo-500 text-[10px] uppercase font-bold text-white px-6 rounded-none"
          >
            MIGO - Receipt
          </Button>
        </div>
      </div>

      {/* FILTER & SELECTION BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input
            placeholder="/Search material..."
            className="h-12 pl-12 bg-[#111] border-white/5 rounded-none focus:border-indigo-500 focus:ring-0 transition-all text-sm uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedLoc} onValueChange={setSelectedLoc}>
          <SelectTrigger className="h-12 bg-[#111] border-white/5 rounded-none text-xs uppercase font-bold">
            <SelectValue placeholder="Storage Loc" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 text-white border-white/10 rounded-none">
            <SelectItem value="all">ALL STORAGE LOCATIONS</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id} className="uppercase">
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border border-white/5 bg-[#111]/30 backdrop-blur-md shadow-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 h-12">
              <TableHead className="text-[10px] uppercase font-bold pl-6 text-zinc-500 tracking-widest">
                Material Description
              </TableHead>
              <TableHead className="text-center text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                Stock Level
              </TableHead>
              <TableHead className="text-center text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                Location
              </TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold pr-6 text-zinc-500 tracking-widest">
                Edit
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-700 italic text-xs uppercase">
                  No active materials found in storage
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="border-white/5 h-16 hover:bg-white/5 transition-colors group">
                  <TableCell className="pl-6 font-bold text-zinc-100 text-sm">{item.ingredient?.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-xl font-black font-mono ${Number(item.quantity) <= 0 ? "text-red-600" : "text-emerald-500"}`}
                      >
                        {Number(item.quantity).toFixed(3)}
                      </span>
                      <span className="text-[9px] text-zinc-600 uppercase italic tracking-tighter">
                        {item.ingredient?.unit?.abbreviation}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 rounded-none text-[9px] uppercase tracking-tighter px-3"
                    >
                      {item.location?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-all">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-indigo-500/20"
                        onClick={() => {
                          setEditItem(item);
                          setEditOpen(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4 text-indigo-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-500/20"
                        onClick={async () => {
                          if (confirm("Confirm deletion of material from this location?")) {
                            await supabase.from("inventory").delete().eq("id", item.id);
                            fetchData();
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- MIGO: GOODS RECEIPT --- */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 font-mono rounded-none max-w-2xl p-0 overflow-hidden">
          <div className="bg-indigo-600 p-4 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4" /> MIGO - Post Goods Receipt
            </h2>
            <X className="w-4 h-4 cursor-pointer" onClick={() => setSupplyOpen(false)} />
          </div>
          <div className="p-8">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Vendor TR-INN (8 digits)</Label>
                <Input
                  maxLength={8}
                  className="h-10 bg-black border-white/10 rounded-none font-bold text-emerald-500"
                  value={supplyForm.inn}
                  onChange={(e) => setSupplyForm({ ...supplyForm, inn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Storage Location (Plant)</Label>
                <Select onValueChange={(v) => setSupplyForm({ ...supplyForm, loc_id: v })}>
                  <SelectTrigger className="h-10 bg-black border-white/10 rounded-none text-xs uppercase">
                    <SelectValue placeholder="Select Loc" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white rounded-none">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold">External Doc (Series/Num)</Label>
                <div className="flex gap-1">
                  <Input
                    placeholder="SER"
                    className="w-14 h-10 bg-black border-white/10 rounded-none text-xs uppercase"
                    value={supplyForm.series}
                    onChange={(e) => setSupplyForm({ ...supplyForm, series: e.target.value })}
                  />
                  <Input
                    placeholder="00000000"
                    className="flex-1 h-10 bg-black border-white/10 rounded-none text-xs"
                    value={supplyForm.num}
                    onChange={(e) => setSupplyForm({ ...supplyForm, num: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Invoice Total (AMD)</Label>
                <Input
                  className="h-10 bg-black border-white/10 text-emerald-500 font-bold rounded-none"
                  value={supplyForm.total}
                  onChange={(e) => setSupplyForm({ ...supplyForm, total: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <Label className="text-[10px] text-zinc-500 uppercase font-black">Material List Items</Label>
              {supplyForm.items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-white/5 p-3 border border-white/5">
                  <Select
                    onValueChange={(v) => {
                      const n = [...supplyForm.items];
                      n[idx].id = v;
                      setSupplyForm({ ...supplyForm, items: n });
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-transparent border-none h-8 text-xs uppercase">
                      <SelectValue placeholder="Material..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-white border-white/10">
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
                    className="w-24 h-8 bg-zinc-950 border-none text-center font-bold text-white"
                    onChange={(e) => {
                      const n = [...supplyForm.items];
                      n[idx].qty = e.target.value;
                      setSupplyForm({ ...supplyForm, items: n });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-900 hover:text-red-500"
                    onClick={() => {
                      const n = supplyForm.items.filter((_, i) => i !== idx);
                      setSupplyForm({ ...supplyForm, items: n });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full h-10 text-[9px] uppercase border-dashed border-white/10 rounded-none"
                onClick={() => setSupplyForm({ ...supplyForm, items: [...supplyForm.items, { id: "", qty: "" }] })}
              >
                + Insert New Item
              </Button>
            </div>
            <Button
              onClick={handleSupply}
              className="w-full bg-indigo-600 hover:bg-indigo-500 h-14 mt-8 rounded-none font-bold uppercase tracking-widest shadow-lg"
            >
              Post Collective Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MB1B: TRANSFER POSTING --- */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 font-mono rounded-none max-w-xl p-0 overflow-hidden">
          <div className="bg-orange-600 p-4 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> MB1B - Transfer Posting
            </h2>
            <X className="w-4 h-4 cursor-pointer" onClick={() => setTransferOpen(false)} />
          </div>
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase">From Location (Issuing)</Label>
                <Select onValueChange={(v) => setTransferForm({ ...transferForm, from: v })}>
                  <SelectTrigger className="h-10 bg-black rounded-none border-white/10 text-xs">
                    <SelectValue placeholder="SOURCE" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white border-white/10">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase">To Location (Receiving)</Label>
                <Select onValueChange={(v) => setTransferForm({ ...transferForm, to: v })}>
                  <SelectTrigger className="h-10 bg-black rounded-none border-white/10 text-xs">
                    <SelectValue placeholder="DESTINATION" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white border-white/10">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-500 uppercase font-black">Transfer Items</Label>
              {transferForm.items.map((it, idx) => (
                <div key={idx} className="flex gap-2 bg-white/5 p-2">
                  <Select
                    onValueChange={(v) => {
                      const n = [...transferForm.items];
                      n[idx].id = v;
                      setTransferForm({ ...transferForm, items: n });
                    }}
                  >
                    <SelectTrigger className="h-9 flex-1 bg-zinc-900 border-none text-xs">
                      <SelectValue placeholder="Select Material" />
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
                    className="w-24 h-9 bg-zinc-950 border-none text-center text-xs font-bold"
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
              className="w-full bg-orange-700 hover:bg-orange-600 h-12 mt-8 font-bold uppercase text-xs rounded-none tracking-widest"
            >
              Execute Stock Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MI01: PHYSICAL INVENTORY --- */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 max-w-4xl h-[85vh] flex flex-col font-mono rounded-none p-0">
          <div className="bg-zinc-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">MI01 - Inventory Counting</h2>
            </div>
            <Badge variant="outline" className="bg-black text-indigo-400 border-indigo-500/50 rounded-none px-4">
              SITE: {locations.find((l) => l.id === selectedLoc)?.name || "UNDEFINED"}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="border border-white/5 bg-black/40">
              <Table>
                <TableHeader className="bg-zinc-900 sticky top-0 z-20">
                  <TableRow className="border-white/10 h-10 hover:bg-transparent">
                    <TableHead className="text-[9px] uppercase font-bold text-zinc-500 pl-4">Material</TableHead>
                    <TableHead className="text-center text-[9px] uppercase font-bold text-zinc-500">
                      System Qty
                    </TableHead>
                    <TableHead className="text-center text-[9px] uppercase font-bold text-zinc-500">
                      Physical Count
                    </TableHead>
                    <TableHead className="text-right pr-6 text-[9px] uppercase font-bold text-zinc-500">
                      Difference
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((it, idx) => {
                    const diff = Number(it.act) - Number(it.sys);
                    return (
                      <TableRow key={idx} className="border-white/5 h-12 hover:bg-white/5">
                        <TableCell className="pl-4 font-bold text-xs">
                          {it.isNew ? (
                            <Select
                              onValueChange={(v) => {
                                const n = [...stockItems];
                                n[idx].ing_id = v;
                                n[idx].name = ingredients.find((i) => i.id === v)?.name;
                                setStockItems(n);
                              }}
                            >
                              <SelectTrigger className="h-8 bg-zinc-800 border-none text-[10px] w-full">
                                <SelectValue placeholder="Add Item" />
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
                        <TableCell className="text-center text-zinc-500 font-mono text-[11px] font-bold">
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
                            className="w-24 h-8 mx-auto text-center bg-zinc-900 border-white/20 text-indigo-400 font-black rounded-none shadow-inner"
                          />
                        </TableCell>
                        <TableCell
                          className={`text-right pr-6 font-black text-xs ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-600" : "text-zinc-800"}`}
                        >
                          {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-6 bg-white/5 border-t border-white/5 flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-12 border-dashed border-white/10 rounded-none text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-white"
              onClick={() =>
                setStockItems([...stockItems, { inv_id: null, ing_id: "", name: "", sys: 0, act: "0", isNew: true }])
              }
            >
              <PlusCircle className="mr-2 w-4 h-4" /> Insert Line
            </Button>
            <Button
              onClick={saveStock}
              className="flex-[2] bg-indigo-700 hover:bg-indigo-600 h-12 font-bold uppercase text-xs rounded-none tracking-widest"
            >
              MI07 - Post Inventory Differences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MM02: MATERIAL CORRECTION (Direct) --- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 font-mono max-w-xs rounded-none p-0 overflow-hidden">
          <div className="bg-zinc-800 p-3 text-[10px] font-bold uppercase tracking-widest text-center">
            MM02 - Manual Master Adjustment
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">
                {editItem?.ingredient?.name}
              </p>
              <Input
                type="number"
                className="h-20 bg-black border-white/10 text-center text-5xl font-black text-indigo-500 rounded-none shadow-inner"
                value={editItem?.quantity}
                onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
              />
              <p className="text-[9px] text-zinc-600 italic">Adjust stock level manually (Bypass MIGO)</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-indigo-700 hover:bg-indigo-600 h-12 rounded-none font-bold uppercase text-xs tracking-tighter"
                onClick={async () => {
                  await supabase
                    .from("inventory")
                    .update({ quantity: Number(editItem.quantity) })
                    .eq("id", editItem.id);
                  setEditOpen(false);
                  fetchData();
                  toast.success("Stock Master Updated");
                }}
              >
                Update Balance
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-900/50 text-red-500 hover:bg-red-950 h-10 rounded-none text-[9px] uppercase font-bold"
                onClick={() => setEditItem({ ...editItem, quantity: 0 })}
              >
                <RotateCcw className="w-3 h-3 mr-2" /> Full Reset to 0.000
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
