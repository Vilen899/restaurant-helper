import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackagePlus, Save, Plus, Trash2, Loader2, FileText, Truck, Store } from "lucide-react";

export default function GoodsReceipt() {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  const [header, setHeader] = useState({ 
    doc_num: "", 
    inn: "", 
    loc_id: "", 
    supplier_name: "" 
  });
  const [items, setItems] = useState([{ ingredient_id: "", quantity: 0, price: 0 }]);

  useEffect(() => {
    const loadRefs = async () => {
      const { data: locs } = await supabase.from("locations").select("id, name");
      const { data: ings } = await (supabase as any).from("ingredients").select("id, name, unit:units(abbreviation)");
      setLocations(locs || []);
      setIngredients(ings || []);
    };
    loadRefs();
  }, []);

  const addItem = () => setItems([...items, { ingredient_id: "", quantity: 0, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (!header.loc_id || items.some(i => !i.ingredient_id)) {
      toast.error("ЗАПОЛНИТЕ СКЛАД И ВСЕ ТОВАРЫ");
      return;
    }
    setLoading(true);
    try {
      const { data: doc, error: docError } = await (supabase as any)
        .from("material_documents")
        .insert([{
          type: "MIGO_101",
          doc_number: header.doc_num,
          vendor_inn: header.inn,
          supplier_name: header.supplier_name,
          location_id: header.loc_id,
          total_amount: items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
        }])
        .select().single();

      if (docError) throw docError;

      for (const item of items) {
        await (supabase as any).from("material_document_items").insert([{
          doc_id: doc.id,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          price: item.price
        }]);

        await (supabase as any).rpc('increment_inventory', {
          loc_id: header.loc_id,
          ing_id: item.ingredient_id,
          val: item.quantity
        });
      }

      toast.success("ДОКУМЕНТ ПРОВЕДЕН");
      setHeader({ doc_num: "", inn: "", loc_id: "", supplier_name: "" });
      setItems([{ ingredient_id: "", quantity: 0, price: 0 }]);
    } catch (e: any) {
      toast.error("ОШИБКА: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-[#0c0c0e] min-h-screen text-zinc-300 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p