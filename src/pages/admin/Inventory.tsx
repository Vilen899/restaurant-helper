import { useState, useEffect } from "react";
import {
  Box,
  Database,
  ArrowDownToLine,
  ArrowRightLeft,
  Calculator,
  History,
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  // --- MIGO STATE ---
  const [migoHeader, setMigoHeader] = useState({ vendor: "", inn: "", doc_num: "", loc_id: "" });
  const [migoItems, setMigoItems] = useState([{ ing_id: "", qty: "" as any, price: "" as any }]);

  const handleMIGO = async () => {
    if (!migoHeader.loc_id || !migoHeader.inn || migoItems[0].ing_id === "") {
      return toast.error("ОШИБКА: Заполните склад, ИНН и хотя бы один товар!");
    }

    try {
      for (const item of migoItems) {
        if (!item.ing_id || !item.qty) continue;

        const qtyNum = parseFloat(item.qty);

        // 1. Проверяем наличие на складе
        const { data: existing } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("location_id", migoHeader.loc_id)
          .eq("ingredient_id", item.ing_id)
          .maybeSingle();

        if (existing) {
          const newQty = Number(existing.quantity) + qtyNum;
          await supabase.from("inventory").update({ quantity: newQty }).eq("id", existing.id);
        } else {
          await supabase.from("inventory").insert({
            location_id: migoHeader.loc_id,
            ingredient_id: item.ing_id,
            quantity: qtyNum,
          });
        }

        // 2. Лог движения
        await (supabase.from("stock_movements" as any) as any).insert({
          ingredient_id: item.ing_id,
          location_id: migoHeader.loc_id,
          quantity: qtyNum,
          type: "MIGO_101",
          reference: migoHeader.doc_num || "N/A",
          vendor_inn: migoHeader.inn,
        });
      }

      toast.success("ДОКУМЕНТ ПРОВЕДЕН: Остатки обновлены");
      setMigoItems([{ ing_id: "", qty: "", price: "" }]);
      fetchBaseData();
    } catch (e) {
      console.error(e);
      toast.error("КРИТИЧЕСКАЯ ОШИБКА БАЗЫ ДАННЫХ");
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-mono uppercase">
      {/* SIDEBAR - КНОПКИ БОЛЬШИЕ */}
      <div className="w-80 border-r border-zinc-800 bg-[#0a0a0a] flex flex-col p-2 gap-2">
        <div className="p-6 mb-4 border-b border-zinc-800">
          <h1 className="text-3xl font-black tracking-tighter text-indigo-500">SAP MM</h1>
          <p className="text-[10px] text-zinc-600">Terminal v2.06</p>
        </div>

        <NavBtn
          act={activeTab === "migo"}
          icon={<ArrowDownToLine />}
          label="MIGO ПРИХОД"
          onClick={() => setActiveTab("migo")}
        />
        <NavBtn act={activeTab === "mmbe"} icon={<Box />} label="MMBE ОСТАТКИ" onClick={() => setActiveTab("mmbe")} />
        <NavBtn
          act={activeTab === "mb1b"}
          icon={<ArrowRightLeft />}
          label="MB1B ПЕРЕНОС"
          onClick={() => setActiveTab("mb1b")}
        />
        <NavBtn
          act={activeTab === "mi01"}
          icon={<Calculator />}
          label="MI01 ПОДСЧЕТ"
          onClick={() => setActiveTab("mi01")}
        />
        <NavBtn
          act={activeTab === "mb51"}
          icon={<History />}
          label="MB51 ЖУРНАЛ"
          onClick={() => setActiveTab("mb51")}
        />
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "migo" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-zinc-900 p-6 border-l-4 border-indigo-500">
              <h2 className="text-2xl font-black italic">MIGO: ВВОД ПОСТУПЛЕНИЯ</h2>
              <Button
                onClick={handleMIGO}
                className="h-16 px-12 bg-indigo-600 hover:bg-indigo-500 text-xl font-black rounded-none"
              >
                ПРОВЕСТИ (F8)
              </Button>
            </div>

            {/* HEADER */}
            <div className="grid grid-cols-2 gap-6 bg-zinc-900/30 p-8 border border-zinc-800">
              <div className="space-y-4">
                <label className="text-xs text-zinc-500 block font-bold">ИНН ПОСТАВЩИКА (8 ЗНАКОВ)</label>
                <Input
                  value={migoHeader.inn}
                  onChange={(e) => setMigoHeader({ ...migoHeader, inn: e.target.value })}
                  className="h-14 bg-black border-zinc-700 text-2xl font-bold text-emerald-500 rounded-none"
                  placeholder="02646829"
                />

                <label className="text-xs text-zinc-500 block font-bold">№ НАЛОГОВОЙ НАКЛАДНОЙ</label>
                <Input
                  value={migoHeader.doc_num}
                  onChange={(e) => setMigoHeader({ ...migoHeader, doc_num: e.target.value })}
                  className="h-14 bg-black border-zinc-700 text-xl rounded-none"
                  placeholder="A12345678"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs text-zinc-500 block font-bold">СКЛАД ПРИЕМКИ (PLANT)</label>
                <Select onValueChange={(v) => setMigoHeader({ ...migoHeader, loc_id: v })}>
                  <SelectTrigger className="h-14 bg-black border-zinc-700 text-xl rounded-none font-black text-indigo-400">
                    <SelectValue placeholder="ВЫБЕРИТЕ СКЛАД" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ITEMS */}
            <div className="bg-zinc-900/20 border border-zinc-800">
              <Table>
                <TableHeader className="bg-zinc-800">
                  <TableRow className="h-12">
                    <TableHead className="text-white font-black">МАТЕРИАЛ (НАИМЕНОВАНИЕ)</TableHead>
                    <TableHead className="text-center text-white w-48">КОЛ-ВО</TableHead>
                    <TableHead className="text-center text-white w-48">ЦЕНА AMD</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {migoItems.map((item, idx) => (
                    <TableRow key={idx} className="border-zinc-800 h-20 hover:bg-zinc-800/40">
                      <TableCell>
                        <Select
                          onValueChange={(v) => {
                            const n = [...migoItems];
                            n[idx].ing_id = v;
                            setMigoItems(n);
                          }}
                        >
                          <SelectTrigger className="bg-transparent border-zinc-800 h-12 text-lg font-bold uppercase">
                            <SelectValue placeholder="ВЫБОР МАТЕРИАЛА..." />
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
                          value={item.qty}
                          className="h-12 bg-black border-zinc-800 text-center text-xl font-black text-indigo-400"
                          onChange={(e) => {
                            const n = [...migoItems];
                            n[idx].qty = e.target.value;
                            setMigoItems(n);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.price}
                          className="h-12 bg-black border-zinc-800 text-center text-xl font-bold text-emerald-500"
                          onChange={(e) => {
                            const n = [...migoItems];
                            n[idx].price = e.target.value;
                            setMigoItems(n);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => setMigoItems(migoItems.filter((_, i) => i !== idx))}
                          variant="ghost"
                          className="text-red-500 hover:bg-red-950"
                        >
                          <X />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                onClick={() => setMigoItems([...migoItems, { ing_id: "", qty: "", price: "" }])}
                className="w-full h-16 bg-transparent border-t border-zinc-800 rounded-none text-zinc-500 hover:text-white hover:bg-zinc-900 font-bold"
              >
                + ДОБАВИТЬ СТРОКУ (INSERT)
              </Button>
            </div>
          </div>
        )}

        {activeTab === "mmbe" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-3xl font-black italic mb-8 border-b border-zinc-800 pb-4">MMBE: ТЕКУЩИЕ ОСТАТКИ</h1>
            <div className="grid grid-cols-1 border border-zinc-800">
              <Table>
                <TableHeader className="bg-indigo-900/20">
                  <TableRow className="h-12 border-zinc-800">
                    <TableHead className="text-indigo-400 pl-8">МАТЕРИАЛ</TableHead>
                    <TableHead className="text-center text-indigo-400">ЗАПАС</TableHead>
                    <TableHead className="text-center text-indigo-400">СКЛАД</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item, idx) => (
                    <TableRow key={idx} className="h-20 border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="pl-8 text-xl font-black">{item.ingredient?.name}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-3xl font-black text-emerald-500">{Number(item.quantity).toFixed(2)}</span>
                        <span className="ml-2 text-zinc-600 text-xs italic">{item.ingredient?.unit?.abbreviation}</span>
                      </TableCell>
                      <TableCell className="text-center text-zinc-500 font-bold uppercase">
                        {item.location?.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// УВЕЛИЧЕННЫЕ КНОПКИ НАВИГАЦИИ
function NavBtn({ act, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 px-6 h-16 text-sm font-black transition-all border-l-4 ${
        act
          ? "bg-indigo-600 border-white text-white shadow-lg"
          : "bg-transparent border-transparent text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
      }`}
    >
      <span className={act ? "text-white" : "text-zinc-700"}>{icon}</span>
      {label}
    </button>
  );
}
