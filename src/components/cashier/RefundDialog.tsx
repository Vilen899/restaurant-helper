import { useState, useEffect } from "react";
import { RotateCcw, Search, Package, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { returnIngredient, returnSemiFinishedIngredients } from "@/hooks/useInventoryDeduction";

interface Order {
  id: string;
  order_number: number;
  total: number;
  payment_method: string;
  status: string;
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
  
  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("completed");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedOrder(null);
      setSelectedItems(new Set());
      loadOrders();
    }
  }, [open, dateFilter, statusFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "week":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "month":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from("orders")
        .select("*, order_items(*, menu_item:menu_items(name))")
        .eq("location_id", locationId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "completed" | "cancelled" | "pending" | "preparing" | "ready");
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  };

  const searchOrders = async () => {
    if (!searchTerm.trim()) {
      loadOrders();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_item:menu_items(name))")
        .eq("location_id", locationId)
        .eq("order_number", parseInt(searchTerm) || 0)
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
            // Direct ingredient
            if (recipeItem.ingredient_id) {
              await returnIngredient(
                locationId,
                recipeItem.ingredient_id,
                Number(recipeItem.quantity) * item.quantity,
                selectedOrder.id,
                selectedOrder.order_number
              );
            }

            // Semi-finished product - unpack and return proportionally
            if (recipeItem.semi_finished_id) {
              await returnSemiFinishedIngredients(
                locationId,
                recipeItem.semi_finished_id,
                Number(recipeItem.quantity),
                item.quantity,
                selectedOrder.id,
                selectedOrder.order_number
              );
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Завершён</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Отменён</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
          <DialogDescription>Найдите заказ для оформления возврата</DialogDescription>
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
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Период</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Сегодня</SelectItem>
                      <SelectItem value="yesterday">Вчера</SelectItem>
                      <SelectItem value="week">Неделя</SelectItem>
                      <SelectItem value="month">Месяц</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Статус</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Завершённые</SelectItem>
                      <SelectItem value="cancelled">Отменённые</SelectItem>
                      <SelectItem value="all">Все</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orders.map((order) => (
                  <Card
                    key={order.id}
                    className={`cursor-pointer hover:border-primary ${order.status === 'cancelled' ? 'opacity-60' : ''}`}
                    onClick={() => order.status === 'completed' && handleSelectOrder(order)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Заказ #{order.order_number}</p>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "dd.MM.yy HH:mm")} • {order.order_items.length} позиций
                        </p>
                      </div>
                      <p className="font-bold">{Number(order.total).toLocaleString()} ֏</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Заказы не найдены
              </p>
            )}
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
