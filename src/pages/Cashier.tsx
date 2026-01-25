import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  UtensilsCrossed,
  Coffee,
  Pizza,
  Salad,
  Sandwich,
  Droplet,
  IceCream,
  Package,
  Clock,
  RotateCcw,
  LogOut,
  Lock,
  WifiOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { ZReportDialog } from "@/components/cashier/ZReportDialog";
import { RefundDialog } from "@/components/cashier/RefundDialog";
import { PaymentDialog } from "@/components/cashier/PaymentDialog";
import { LockScreen } from "@/components/cashier/LockScreen";
import { MenuSearch } from "@/components/cashier/MenuSearch";
import { OfflineQueueDialog } from "@/components/cashier/OfflineQueueDialog";
import { useMenuCache } from "@/hooks/useMenuCache";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useAutoLock } from "@/hooks/useAutoLock";
import { playCartAddSound } from "@/lib/sounds";
import { deductIngredient, deductSemiFinishedIngredients } from "@/hooks/useInventoryDeduction";

type MenuItem = Tables<"menu_items">;
type MenuCategory = Tables<"menu_categories">;
type PaymentMethod = Tables<"payment_methods">;

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface CashierSession {
  id: string;
  full_name: string;
  role: string;
  location_id: string;
  shift_id?: string;
  shift_start?: string;
  shift_end?: string;
}

const categoryStyles: Record<string, { icon: typeof Coffee; color: string; bg: string }> = {
  Coffee: { icon: Coffee, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
  Combo: { icon: Package, color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20" },
  "Fries & Nuggets": { icon: Pizza, color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20" },
  Lunch: { icon: UtensilsCrossed, color: "text-green-600", bg: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20" },
  Salad: { icon: Salad, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20" },
  Sandwiches: { icon: Sandwich, color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20" },
  Sauces: { icon: Droplet, color: "text-red-600", bg: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" },
  "Soft Drinks": { icon: Coffee, color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" },
  Desserts: { icon: IceCream, color: "text-pink-600", bg: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20" },
};

const defaultCategoryStyle = { icon: UtensilsCrossed, color: "text-muted-foreground", bg: "bg-muted/50 border-muted hover:bg-muted" };

export default function CashierPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CashierSession | null>(null);
  const { menuItems, categories, paymentMethods, loading } = useMenuCache();
  const { isOnline, queue, syncing, addToQueue, removeFromQueue, syncQueue } = useOfflineQueue();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [zReportDialogOpen, setZReportDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [offlineQueueDialogOpen, setOfflineQueueDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [cashierSettings, setCashierSettings] = useState({
    autoLockEnabled: true,
    autoLockMinutes: 5,
    allowNegativeStock: true,
  });

  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string; name: string; type: 'percent' | 'fixed'; value: number; reason?: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cashier_settings');
    if (saved) setCashierSettings(prev => ({ ...prev, ...JSON.parse(saved) }));

    const channel = new BroadcastChannel('cashier_settings');
    channel.onmessage = (event) => {
      if (event.data.type === 'settings_update') setCashierSettings(prev => ({ ...prev, ...event.data.data }));
    };
    return () => channel.close();
  }, []);

  useAutoLock({
    timeoutMinutes: cashierSettings.autoLockMinutes,
    enabled: cashierSettings.autoLockEnabled && !!session && !isLocked,
    onLock: () => setIsLocked(true),
  });

  const broadcastToCustomerDisplay = (items: CartItem[], subtotalVal: number, discountVal: number, totalVal: number) => {
    try {
      const channel = new BroadcastChannel('customer_display');
      channel.postMessage({
        type: 'cart_update',
        data: {
          items: items.map((ci) => ({
            id: ci.menuItem.id,
            name: ci.menuItem.name,
            quantity: ci.quantity,
            price: Number(ci.menuItem.price),
          })),
          subtotal: subtotalVal,
          discount: discountVal,
          total: totalVal,
        },
      });
      channel.close();
    } catch {}
  };

  useEffect(() => {
    const sessionData = sessionStorage.getItem("cashier_session");
    if (!sessionData) { toast.error("Войдите по PIN-коду"); navigate("/pin"); return; }
    const parsed = JSON.parse(sessionData) as CashierSession;
    if (parsed.role !== "cashier") { toast.error("Доступ только для кассиров"); sessionStorage.removeItem("cashier_session"); navigate("/"); return; }
    setSession(parsed);
    if (!parsed.shift_id) openShift(parsed);
  }, [navigate]);

  const openShift = async (cashierSession: CashierSession) => {
    try {
      const { data: existingShift, error: checkError } = await supabase
        .from("shifts")
        .select("id, started_at")
        .eq("user_id", cashierSession.id)
        .eq("location_id", cashierSession.location_id)
        .is("ended_at", null)
        .maybeSingle();
      if (checkError) console.error(checkError);
      if (existingShift) {
        const updatedSession = { ...cashierSession, shift_id: existingShift.id, shift_start: existingShift.started_at };
        setSession(updatedSession); sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
        toast.info("Восстановлена открытая смена"); return;
      }
      const { data, error } = await supabase
        .from("shifts")
        .insert({ user_id: cashierSession.id, location_id: cashierSession.location_id })
        .select()
        .single();
      if (error) throw error;
      const updatedSession = { ...cashierSession, shift_id: data.id, shift_start: data.started_at };
      setSession(updatedSession); sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
    } catch (error) { console.error(error); }
  };

  const closeShift = async () => {
    if (!session?.shift_id) return toast.error("Смена не открыта");
    setZReportDialogOpen(true);
  };

  const handleShiftClosed = async () => {
    if (!session?.shift_id) return;
    try {
      const { error } = await supabase
        .from("shifts")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", session.shift_id);
      if (error) throw error;
      toast.success("Смена закрыта");
      const updatedSession = { ...session, shift_id: undefined, shift_end: new Date().toISOString() };
      setSession(updatedSession);
      sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
      clearCart();
      setZReportDialogOpen(false);
    } catch (e) { console.error(e); toast.error("Ошибка при закрытии смены"); }
  };

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    menuItems.forEach((item) => {
      const catId = item.category_id;
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId)!.push(item);
    });
    return map;
  }, [menuItems]);

  const getCategoryStyle = (name: string) => categoryStyles[name] || defaultCategoryStyle;

  const addToCart = async (item: MenuItem) => {
    if (!cashierSettings.allowNegativeStock && session) {
      try {
        const { data: recipe } = await supabase.from("menu_item_ingredients").select("ingredient_id, semi_finished_id, quantity").eq("menu_item_id", item.id);
        if (recipe) {
          for (const r of recipe) {
            if (r.ingredient_id) {
              const { data: inv } = await supabase.from("inventory").select("quantity").eq("location_id", session.location_id).eq("ingredient_id", r.ingredient_id).maybeSingle();
              const currentQty = inv ? Number(inv.quantity) : 0;
              const existingInCart = cart.find(ci => ci.menuItem.id === item.id);
              const cartQty = existingInCart ? existingInCart.quantity : 0;
              const requiredQty = Number(r.quantity) * (cartQty + 1);
              if (currentQty < requiredQty) { toast.error(`Недостаточно остатков для "${item.name}"`); return; }
            }
          }
        }
      } catch (e) { console.error(e); }
    }
    playCartAddSound();
    setCart(prev => { 
      const existing = prev.find(ci => ci.menuItem.id === item.id); 
      if (existing) return prev.map(ci => ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci); 
      return [...prev, { menuItem: item, quantity: 1 }]; 
    });
    toast.success(`${item.name} добавлен`, { duration: 1000 });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(ci => ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci).filter(ci => ci.quantity > 0));
  };

  const clearCart = () => { setCart([]); setAppliedDiscount(null); };

  const subtotal = cart.reduce((sum, ci) => sum + Number(ci.menuItem.price) * ci.quantity, 0);
  const discountAmount = appliedDiscount ? appliedDiscount.type === 'percent' ? Math.round(subtotal * appliedDiscount.value / 100) : Math.min(appliedDiscount.value, subtotal) : 0;
  const total = subtotal - discountAmount;

  useEffect(() => { broadcastToCustomerDisplay(cart, subtotal, discountAmount, total); }, [cart, subtotal, discountAmount, total]);

  const handlePayment = async (method: PaymentMethod, cashReceived?: number) => {
    if (!session || cart.length === 0) return;
    setProcessing(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          location_id: session.location_id,
          created_by: session.id,
          subtotal,
          discount: discountAmount,
          discount_name: appliedDiscount?.name,
          discount_type: appliedDiscount?.type,
          discount_value: appliedDiscount?.value,
          discount_reason: appliedDiscount?.reason,
          total,
          payment_method: method.code,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = cart.map(ci => ({
        order_id: order.id,
        menu_item_id: ci.menuItem.id,
        quantity: ci.quantity,
        unit_price: Number(ci.menuItem.price),
        total_price: Number(ci.menuItem.price) * ci.quantity,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Deduct inventory
      for (const ci of cart) {
        const { data: recipe } = await supabase.from("menu_item_ingredients").select("ingredient_id, semi_finished_id, quantity").eq("menu_item_id", ci.menuItem.id);
        if (recipe) {
          for (const r of recipe) {
            if (r.ingredient_id) {
              await deductIngredient(session.location_id, r.ingredient_id, Number(r.quantity) * ci.quantity, order.id);
            }
            if (r.semi_finished_id) {
              await deductSemiFinishedIngredients(session.location_id, r.semi_finished_id, Number(r.quantity), ci.quantity, order.id);
            }
          }
        }
      }

      toast.success(`Заказ #${order.order_number} оформлен`);
      clearCart();
      setPaymentDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка оформления заказа");
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintOfflineOrder = (order: any) => {
    toast.info("Печать чека...");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isLocked && session) {
    return (
      <LockScreen
        onUnlock={() => setIsLocked(false)}
        userName={session.full_name}
        userId={session.id}
        locationId={session.location_id}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      {/* Sidebar категории */}
      <aside className="w-60 border-r border-gray-200 bg-white p-2 flex flex-col">
        <ScrollArea className="flex-1">
          {categories.map((cat) => {
            const style = getCategoryStyle(cat.name);
            const Icon = style.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                className={cn(
                  "flex items-center gap-2 p-2 border rounded-md mb-1 w-full transition",
                  style.bg,
                  isSelected ? "ring-2 ring-blue-500" : ""
                )}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <Icon className={style.color} />
                <span className="font-medium">{cat.name}</span>
              </button>
            );
          })}
        </ScrollArea>

        <div className="mt-2 flex flex-col gap-2">
          {!isOnline && (
            <Badge variant="destructive" className="mb-2 justify-center">
              <WifiOff className="w-3 h-3 mr-1" /> Оффлайн
            </Badge>
          )}
          {queue.length > 0 && (
            <Button variant="outline" onClick={() => setOfflineQueueDialogOpen(true)}>
              <WifiOff className="w-4 h-4 mr-1" />
              Очередь ({queue.length})
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsLocked(true)}><Lock className="w-4 h-4 mr-1" />Блокировка</Button>
          <Button variant="secondary" onClick={() => setRefundDialogOpen(true)}><RotateCcw className="w-4 h-4 mr-1" />Возврат</Button>
          <Button variant="secondary" onClick={closeShift}><Clock className="w-4 h-4 mr-1" />Закрыть смену</Button>
          <Button variant="secondary" onClick={() => { sessionStorage.removeItem("cashier_session"); navigate("/pin"); }}><LogOut className="w-4 h-4 mr-1" />Выход</Button>
        </div>
      </aside>

      {/* Основная часть — товары */}
      <main className="flex-1 flex flex-col p-2">
        <MenuSearch menuItems={menuItems} categories={categories} onItemSelect={addToCart} />
        <ScrollArea className="flex-1 mt-2">
          <div className="grid grid-cols-4 gap-2">
            {(itemsByCategory.get(selectedCategory || "") || []).map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md" onClick={() => addToCart(item)}>
                <CardContent className="flex flex-col items-center justify-center p-2">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-20 object-cover mb-1 rounded" />}
                  <span className="text-sm font-medium text-center">{item.name}</span>
                  <span className="text-xs text-gray-500">{Number(item.price).toLocaleString()} ֏</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </main>

      {/* Корзина и действия */}
      <aside className="w-80 border-l border-gray-200 bg-white flex flex-col p-2">
        <ScrollArea className="flex-1">
          {cart.map((ci) => (
            <div key={ci.menuItem.id} className="flex justify-between items-center p-2 border-b border-gray-200">
              <div>
                <div className="font-medium">{ci.menuItem.name}</div>
                <div className="text-xs text-gray-500">{ci.quantity} × {Number(ci.menuItem.price).toLocaleString()} ֏</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => updateQuantity(ci.menuItem.id, -1)}>−</Button>
                <Button size="sm" variant="outline" onClick={() => updateQuantity(ci.menuItem.id, 1)}>+</Button>
              </div>
            </div>
          ))}
        </ScrollArea>

        <div className="p-2 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm"><span>Подытог:</span><span>{subtotal.toLocaleString()} ֏</span></div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600"><span>Скидка:</span><span>−{discountAmount.toLocaleString()} ֏</span></div>
          )}
          <div className="flex justify-between font-bold text-lg"><span>Итого:</span><span>{total.toLocaleString()} ֏</span></div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={clearCart} disabled={cart.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" />Очистить
            </Button>
            <Button className="flex-1" onClick={() => setPaymentDialogOpen(true)} disabled={cart.length === 0}>
              Оплата
            </Button>
          </div>
        </div>
      </aside>

      {/* Диалоги */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
        paymentMethods={paymentMethods}
        onConfirm={handlePayment}
        processing={processing}
      />
      {session && (
        <>
          <RefundDialog
            open={refundDialogOpen}
            onOpenChange={setRefundDialogOpen}
            locationId={session.location_id}
            onRefundComplete={() => {}}
          />
          <ZReportDialog
            open={zReportDialogOpen}
            onOpenChange={setZReportDialogOpen}
            locationId={session.location_id}
            userName={session.full_name}
            onConfirm={handleShiftClosed}
          />
          <OfflineQueueDialog
            open={offlineQueueDialogOpen}
            onOpenChange={setOfflineQueueDialogOpen}
            queue={queue}
            syncing={syncing}
            isOnline={isOnline}
            onSync={syncQueue}
            onPrint={handlePrintOfflineOrder}
            onRemove={removeFromQueue}
          />
        </>
      )}
    </div>
  );
}