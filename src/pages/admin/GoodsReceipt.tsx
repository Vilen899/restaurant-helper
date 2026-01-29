import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PackagePlus, Save } from "lucide-react";

export default function GoodsReceipt() {
  const [header, setHeader] = useState({ doc_num: "", inn: "", loc_id: "" });
  const [items, setItems] = useState([{ id: "", quantity: 0, price: 0 }]);

  const handlePost = async () => {
    try {
      // 1. Создаем заголовок документа (MIGO)
      const { data: doc, error: docError } = await (supabase as any)
        .from("material_documents")
        .insert([{
          type: "MIGO_101",
          doc_number: header.doc_num,
          vendor_inn: header.inn,
          location_id: header.loc_id,
          total_amount: items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
        }] as any)
        .select().single();

      if (docError) throw docError;

      // 2. Создаем позиции и обновляем остатки через RPC
      for (const item of items) {
        const { error: itemError } = await (supabase as any)
          .from("material_document_items")
          .insert([{
            doc_id: doc.id,
            ingredient_id: item.id,
            quantity: item.quantity,
            price: item.price
          }] as any);
        
        if (itemError) throw itemError;

        // Вызов SQL функции increment_inventory
        await (supabase as any).rpc('increment_inventory', {
          loc_id: header.loc_id,
          ing_id: item.id,
          val: item.quantity
        });
      }

      toast.success("ДОКУМЕНТ ПРОВЕДЕН УСПЕШНО");
      setHeader({ doc_num: "", inn: "", loc_id: "" });
      setItems([{ id: "", quantity: 0, price: 0 }]);
    } catch (e: any) {
      toast.error("ОШИБКА: " + e.message);
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white uppercase">
      <h1 className="text-xl font-black mb-6 flex items-center gap-2 italic">
        <PackagePlus className="text-emerald-500" /> ПРИХОД ТОВАРА (MIGO)
      </h1>
      <div className="grid gap-4 bg-zinc-900/30 p-6 border border-white/10">
        <Input placeholder="НОМЕР НАКЛАДНОЙ" value={header.doc_num} onChange={e => setHeader({...header, doc_num: e.target.value})} className="bg-zinc-900 border-white/10" />
        <Input placeholder="ИНН ПОСТАВЩИКА" value={header.inn} onChange={e => setHeader({...header, inn: e.target.value})} className="bg-zinc-900 border-white/10" />
        <Input placeholder="ID СКЛАДА" value={header.loc_id} onChange={e => setHeader({...header, loc_id: e.target.value})} className="bg-zinc-900 border-white/10" />
        <Button onClick={handlePost} className="bg-emerald-600 hover:bg-emerald-700 font-black italic">
          <Save size={18} className="mr-2" /> ПРОВЕСТИ ДОКУМЕНТ
        </Button>
      </div>
    </div>
  );
}
