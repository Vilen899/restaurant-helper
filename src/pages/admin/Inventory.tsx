import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Store, Calendar, Package } from "lucide-react";

export default function InventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLoc) loadStock();
  }, [selectedLoc, asOfDate]);

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*");
    setLocations(data || []);
    if (data?.length) setSelectedLoc(data[0].id);
  };

  const loadStock = async () => {
    // Получаем остатки на конкретной точке
    const { data, error } = await supabase
      .from("inventory")
      .select(`quantity, ingredient:ingredients(name, unit)`)
      .eq("location_id", selectedLoc);

    if (error) console.error(error);
    setStock(data || []);
  };

  const filteredStock = stock.filter((item) => item.ingredient?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 bg-zinc-50 min-h-screen font-sans">
      {/* HEADER С ФИЛЬТРАМИ */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 border rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-2 rounded-lg">
            <Package className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-800 uppercase tracking-tight">Складской остаток</h1>
            <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Текущее наличие товаров</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* ВЫБОР СКЛАДА */}
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-md border">
            <Store size={14} className="text-zinc-500" />
            <Select value={selectedLoc} onValueChange={setSelectedLoc}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none w-[160px] text-xs font-bold">
                <SelectValue placeholder="Склад" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ВЫБОР ДАТЫ */}
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-md border">
            <Calendar size={14} className="text-zinc-500" />
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="h-8 border-none bg-transparent shadow-none text-xs font-bold w-[130px] focus-visible:ring-0"
            />
          </div>

          {/* ПОИСК */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Найти товар..."
              className="pl-8 h-9 w-[200px] bg-white border-zinc-200 text-xs rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ТАБЛИЦА */}
      <Card className="border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-900">
            <TableRow className="hover:bg-zinc-900 border-none">
              <TableHead className="text-white text-[10px] font-black uppercase tracking-widest h-10">
                Наименование товара
              </TableHead>
              <TableHead className="text-white text-right text-[10px] font-black uppercase tracking-widest h-10">
                Ед. изм.
              </TableHead>
              <TableHead className="text-white text-right text-[10px] font-black uppercase tracking-widest h-10">
                Доступный остаток
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {filteredStock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-zinc-400 text-xs uppercase font-medium">
                  На данном складе товаров не обнаружено
                </TableCell>
              </TableRow>
            ) : (
              filteredStock.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-zinc-50 border-b border-zinc-100 transition-colors">
                  <TableCell className="font-bold text-xs text-zinc-700 uppercase py-3">
                    {item.ingredient?.name}
                  </TableCell>
                  <TableCell className="text-right text-xs text-zinc-500 font-medium">
                    {item.ingredient?.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold font-mono ${
                        item.quantity <= 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 flex justify-end">
        <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest">
          Данные актуальны на {new Date(asOfDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
