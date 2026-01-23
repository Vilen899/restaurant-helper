import { useState, useEffect } from "react";
import { RotateCcw, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: number;
  total: number;
  payment_method: string;
  created_at: string;
  order_items: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    menu_item: { name: string } | null;
  }>;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onRefundComplete: () => void;
}

export function RefundDialog({ open, onOpenChange, locationId, onRefundComplete }: RefundDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnToStock, setReturnToStock] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setOrders([]);
      setSelectedOrder(null);
      setSelectedItems(new Set());
    }
  }, [open]);

  const searchOrders = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_item:menu_items(name))")
        .eq("location_id", locationId)
        .eq("status", "completed")
        .or(`order_number.eq.${parseInt(searchTerm) || 0}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка поиска заказов");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setSelectedItems(new Set(order.order_items.map((i) => i.id)));
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) newSet.delete(itemId);
      else newSet.add(itemId);
      return newSet;
    });
  };

  const refundAmount =
    selectedOrder?.order_items
      .filter((i) => selectedItems.has(i.id))
      .reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0) || 0;

  const handleRefund = async () => {
    if (!selectedOrder || selectedItems.size === 0) {
      toast.error("Выберите позиции для возврата");
      return;
    }

    setProcessing(true);
    try {
      // Обновляем статус заказа
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", selectedOrder.id);
      if (orderError) throw orderError;

      if (returnToStock) {
        for (const item of selectedOrder.order_items.filter((i) => selectedItems.has(i.id))) {
          const { data: recipe } = await supabase
            .from("menu_item_ingredients")
            .select("ingredient_id, semi_finished_id, quantity")
            .eq("menu_item_id", item.menu_item_id);

          if (!recipe) continue;

          for (const recipeItem of recipe) {
            // Возврат ингредиентов
            if (recipeItem.ingredient_id) {
              const { data: currentInv } = await supabase
                .from("inventory")
                .select("id, quantity")
                .eq("location_id", locationId)
                .eq("ingredient_id", recipeItem.ingredient_id)
                .maybeSingle();

              if (currentInv) {
                const returnQty = Number(recipeItem.quantity) * item.quantity;
                await supabase
                  .from("inventory")
                  .update({ quantity: Number(currentInv.quantity) + returnQty })
                  .eq("id", currentInv.id);

                await supabase.from("inventory_movements").insert({
                  location_id: locationId,
                  ingredient_id: recipeItem.ingredient_id,
                  movement_type: "adjustment",
                  quantity: returnQty,
                  notes: `Возврат заказа #${selectedOrder.order_number}`,
                  reference_id: selectedOrder.id,
                });
              }
            }

            // Возврат полуфабрикатов
            if (recipeItem.semi_finished_id) {
              const { data: semiFinished } = await supabase
                .from("semi_finished")
                .select("output_quantity")
                .eq("id", recipeItem.semi_finished_id)
                .maybeSingle();

              if (!semiFinished?.output_quantity) continue;

              const { data: semiIngredients } = await supabase
                .from("semi_finished_ingredients")
                .select("ingredient_id, quantity")
                .eq("semi_finished_id", recipeItem.semi_finished_id);

              if (!semiIngredients) continue;

              const ratio = Number(recipeItem.quantity) / Number(semiFinished.output_quantity);

              for (const semiIng of semiIngredients) {
                if (!semiIng.ingredient_id) continue;

                const { data: currentInv } = await supabase
                  .from("inventory")
                  .select("id, quantity")
                  .eq("location_id", locationId)
                  .eq("ingredient_id", semiIng.ingredient_id)
                  .maybeSingle();

                if (currentInv) {
                  const returnQty = Number(semiIng.quantity) * ratio * item.quantity;
                  await supabase
                    .from("inventory")
                    .update({ quantity: Number(currentInv.quantity) + returnQty })
                    .eq("id", currentInv.id);

                  await supabase.from("inventory_movements").insert({
                    location_id: locationId,
                    ingredient_id: semiIng.ingredient_id,
                    movement_type: "adjustment",
                    quantity: returnQty,
                    notes: `Возврат заказа #${selectedOrder.order_number}`,
                    reference_id: selectedOrder.id,
                  });
                }
              }
            }
          }
        }
      }

      toast.success(`Возврат заказа #${selectedOrder.order_number} выполнен`);
      onOpenChange(false);
      onRefundComplete();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка оформления возврата");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Возврат заказа
          </DialogTitle>
          <DialogDescription>Найдите заказ по номеру для оформления возврата</DialogDescription>
        </DialogHeader>

        {!selectedOrder ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Номер заказа..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchOrders()}
              />
              <Button onClick={searchOrders} disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orders.map((order) => (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:border-primary"
                    onClick={() => handleSelectOrder(order)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Заказ #{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "dd.MM.yy HH:mm")} • {order.order_items.length} позиций
                        </p>
                      </div>
                      <p className="font-bold">{Number(order.total).toLocaleString()} ֏</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchTerm ? (
              <p className="text-center text-muted-foreground py-8">Заказы не найдены</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                ← Назад
              </Button>
              <Badge>Заказ #{selectedOrder.order_number}</Badge>
            </div>

            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {selectedOrder.order_items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleItem(item.id)}
                >
                  <Checkbox checked={selectedItems.has(item.id)} />
                  <div className="flex-1">
                    <p className="font-medium">{item.menu_item?.name}</p>
                    <p className="text-sm text-muted-foreground">× {item.quantity}</p>
                  </div>
                  <p className="font-medium">{(Number(item.unit_price) * item.quantity).toLocaleString()} ֏</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox checked={returnToStock} onCheckedChange={(checked) => setReturnToStock(!!checked)} />
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="text-sm">Вернуть ингредиенты на склад</span>
              </div>
            </div>

            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="flex justify-between items-center">
                <span className="font-medium">Сумма возврата</span>
                <span className="text-2xl font-bold text-destructive">{refundAmount.toLocaleString()} ֏</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          {selectedOrder && (
            <Button variant="destructive" onClick={handleRefund} disabled={processing || selectedItems.size === 0}>
              {processing ? (
                "Обработка..."
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Оформить возврат
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
