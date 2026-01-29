import { useState, useEffect } from "react";
import {
  Box,
  Database,
  ArrowDownToLine,
  ArrowRightLeft,
  Calculator,
  History,
  Search,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function InventorySystem() {
  const [activeTab, setActiveTab] = useState("migo");
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    const { data: ings } = await supabase.from("ingredients").select("*").eq("is_active", true);
    const { data: locs } = await supabase.from("locations").select("*").eq("is_active", true);
    const { data: inv } = await supabase
      .from("inventory")
      .select("*, ingredient:ingredients(name, unit:units(abbreviation)), location:locations(name)");
    setIngredients(ings || []);
    setLocations(locs || []);
    setInventory(inv || []);
  };

  // --- ЛОГИКА MIGO (ПОСТУПЛЕНИЕ) ---
  const [migoHeader, setMigoHeader] = useState({
    vendor: "",
    inn: "",
    doc_num: "",
    loc_id: "",
    total: 0,
  });
  const [migoItems, setMigoItems] = useState([{ ing_id: "", qty: 0, price: 0 }]);

  const handleMIGO = async () => {
    if (!migoHeader.loc_id || !migoHeader.inn) return toast.error("Заполните заголовок (Склад и ИНН)");

    try {
      for (const item of migoItems) {
        if (!item.ing_id || item.qty <= 0) continue;

        // 1. Обновляем остаток
        const { data: current } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", migoHeader.loc_id)
          .eq("ingredient_id", item.ing_id)
          .maybeSingle();

        if (current) {
          await supabase
            .from("inventory")
            .update({ quantity: Number(current.quantity) + Number(item.qty) })
            .eq("id", current.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ location_id: migoHeader.loc_id, ingredient_id: item.ing_id, quantity: item.qty });
        }

        // 2. Пишем в журнал (как в твоем Excel)
        await (supabase.from("stock_movements" as any) as any).insert({
          ingredient_id: item.ing_id,
          location_id: migoHeader.loc_id,
          quantity: item.qty,
          type: "MIGO_101",
          reference: migoHeader.doc_num,
          vendor_inn: migoHeader.inn,
        });
      }
      toast.success("Документ MIGO проведен успешно");
      setMigoItems([{ ing_id: "", qty: 0, price: 0 }]);
      fetchBaseData();
    } catch (e) {
      toast.error("Ошибка при проводке");
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 font-mono">
      {/* ЛЕВОЕ МЕНЮ (SIDEBAR) */}
      <div className="w-64 border-r border-white/5 bg-[#0a0a0a] p-4 flex flex-col gap-2">
        <div className="mb-8 px-2">
          <h2 className="text-white font-black tracking-tighter text-xl">SAP HANA</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Retail Management</p>
        </div>

        <NavButton
          active={activeTab === "mmbe"}
          icon={<Box size={18} />}
          label="MMBE - Остатки"
          onClick={() => setActiveTab("mmbe")}
        />
        <NavButton
          active={activeTab === "migo"}
          icon={<ArrowDownToLine size={18} />}
          label="MIGO - Приход"
          onClick={() => setActiveTab("migo")}
        />
        <NavButton
          active={activeTab === "mb1b"}
          icon={<ArrowRightLeft size={18} />}
          label="MB1B - Перенос"
          onClick={() => setActiveTab("mb1b")}
        />
        <NavButton
          active={activeTab === "mi01"}
          icon={<Calculator size={18} />}
          label="MI01 - Подсчет"
          onClick={() => setActiveTab("mi01")}
        />
        <NavButton
          active={activeTab === "mb51"}
          icon={<History size={18} />}
          label="MB51 - Журнал"
          onClick={() => setActiveTab("mb51")}
        />
      </div>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === "migo" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex justify-between items-end border-b border-white/10 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-white uppercase italic">MIGO: Goods Receipt</h1>
                <p className="text-xs text-zinc-500 mt-1">Поступление от поставщика (Без заказа)</p>
              </div>
              <Button
                onClick={handleMIGO}
                className="bg-indigo-600 hover:bg-indigo-500 rounded-none h-12 px-8 font-bold italic"
              >
                POST DOCUMENT
              </Button>
            </header>

            {/* HEADER DATA (Из твоего export.xlsx) */}
            <div className="grid grid-cols-3 gap-4 bg-[#111] p-6 border border-white/5">
              <div className="space-y-2">
                <Label>Поставщик</Label>
                <Input
                  placeholder="Наименование..."
                  value={migoHeader.vendor}
                  onChange={(e) => setMigoHeader({ ...migoHeader, vendor: e.target.value })}
                  className="bg-black border-white/10 rounded-none h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>ИНН Поставщика</Label>
                <Input
                  placeholder="00000000"
                  maxLength={8}
                  value={migoHeader.inn}
                  onChange={(e) => setMigoHeader({ ...migoHeader, inn: e.target.value })}
                  className="bg-black border-white/10 rounded-none h-10 font-bold text-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label>№ Налоговой накладной</Label>
                <Input
                  placeholder="A0000000000"
                  value={migoHeader.doc_num}
                  onChange={(e) => setMigoHeader({ ...migoHeader, doc_num: e.target.value })}
                  className="bg-black border-white/10 rounded-none h-10 uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Склад (Plant/Storage)</Label>
                <Select onValueChange={(v) => setMigoHeader({ ...migoHeader, loc_id: v })}>
                  <SelectTrigger className="bg-black border-white/10 rounded-none h-10 uppercase font-bold">
                    <SelectValue placeholder="Выберите склад" />
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

            {/* ITEMS TABLE (Из твоего expordjbhsdgght.XLSX) */}
            <div className="bg-[#111] border border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 uppercase text-[10px] font-bold">
                    <TableHead className="w-[400px]">Материал</TableHead>
                    <TableHead className="text-center">Кол-во (Факт)</TableHead>
                    <TableHead className="text-center">Цена за ед.</TableHead>
                    <TableHead className="text-right pr-6">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {migoItems.map((item, idx) => (
                    <TableRow key={idx} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <Select
                          onValueChange={(v) => {
                            const newItems = [...migoItems];
                            newItems[idx].ing_id = v;
                            setMigoItems(newItems);
                          }}
                        >
                          <SelectTrigger className="bg-transparent border-none text-xs uppercase font-bold">
                            <SelectValue placeholder="Выбор материала..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 text-white">
                            {ingredients.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 bg-black border-white/10 text-center font-bold text-indigo-400"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...migoItems];
                            newItems[idx].qty = Number(e.target.value);
                            setMigoItems(newItems);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 bg-black border-white/10 text-center font-bold text-emerald-500"
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...migoItems];
                            newItems[idx].price = Number(e.target.value);
                            setMigoItems(newItems);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right pr-6 font-bold text-zinc-500">
                        {(item.qty * item.price).toLocaleString()} AMD
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                variant="ghost"
                className="w-full rounded-none border-t border-white/5 h-10 text-[10px] uppercase text-zinc-500 hover:text-white"
                onClick={() => setMigoItems([...migoItems, { ing_id: "", qty: 0, price: 0 }])}
              >
                <Plus size={14} className="mr-2" /> Insert Line
              </Button>
            </div>
          </div>
        )}

        {activeTab === "mmbe" && (
          <div className="max-w-5xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-white uppercase italic border-b border-white/10 pb-4">
              MMBE: Stock Overview
            </h1>
            <div className="border border-white/5 bg-[#111]/50 shadow-2xl overflow-hidden mt-6">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 uppercase text-[10px]">
                    <TableHead className="pl-6">Материал</TableHead>
                    <TableHead className="text-center">Свободный запас</TableHead>
                    <TableHead className="text-center">Склад</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item, idx) => (
                    <TableRow key={idx} className="border-white/5 h-14">
                      <TableCell className="pl-6 font-bold text-sm text-zinc-200">{item.ingredient?.name}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg font-black text-emerald-500">{Number(item.quantity).toFixed(3)}</span>
                        <span className="ml-2 text-[10px] text-zinc-600 uppercase italic">
                          {item.ingredient?.unit?.abbreviation}
                        </span>
                      </TableCell>
                      <TableCell className="text-center italic text-xs text-indigo-400">
                        {item.location?.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Остальные вкладки добавим на следующем шаге */}
      </div>
    </div>
  );
}

// Вспомогательные компоненты
function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all rounded-none ${
        active ? "bg-indigo-600 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Label({ children }: any) {
  return <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{children}</label>;
}
