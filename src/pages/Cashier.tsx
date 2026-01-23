// CashierPage.tsx — часть 1
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
  Printer,
  Image,
  RefreshCw,
  WifiOff,
  Users,
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
import { ReceiptPrintDialog } from "@/components/cashier/ReceiptPrintDialog";
import { LockScreen } from "@/components/cashier/LockScreen";
import { MenuSearch } from "@/components/cashier/MenuSearch";
import { DiscountSelector } from "@/components/cashier/DiscountSelector";
import { OfflineQueueDialog } from "@/components/cashier/OfflineQueueDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
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
  shift_end?: string; // для конца смены
}

// Иконки и стили категорий
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

const defaultCategoryStyle = {
  icon: UtensilsCrossed,
  color: "text-muted-foreground",
  bg: "bg-muted/50 border-muted hover:bg-muted",
};

export default function CashierPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [session, setSession] = useState<CashierSession | null>(null);
  const { menuItems, categories, paymentMethods, loading, fromCache, refreshMenu } = useMenuCache();
  const { isOnline, queue, queueCount, syncing, addToQueue, removeFromQueue, syncQueue } = useOfflineQueue();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [zReportDialogOpen, setZReportDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [offlineQueueDialogOpen, setOfflineQueueDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  // Settings from admin
  const [cashierSettings, setCashierSettings] = useState({
    autoLockEnabled: true,
    autoLockMinutes: 5,
    allowNegativeStock: true,
  });

  // Load cashier settings
  useEffect(() => {
    const saved = localStorage.getItem('cashier_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCashierSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading cashier settings:', e);
      }
    }

    const channel = new BroadcastChannel('cashier_settings');
    channel.onmessage = (event) => {
      if (event.data.type === 'settings_update') {
        setCashierSettings(prev => ({ ...prev, ...event.data.data }));
      }
    };
    return () => channel.close();
  }, []);

  useAutoLock({
    timeoutMinutes: cashierSettings.autoLockMinutes,
    enabled: cashierSettings.autoLockEnabled && !!session && !isLocked,
    onLock: () => setIsLocked(true),
  });

  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    name: string;
    type: 'percent' | 'fixed';
    value: number;
    reason?: string;
  } | null>(null);

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
    } catch (e) {}
  };

  useEffect(() => {
    const sessionData = sessionStorage.getItem("cashier_session");
    if (!sessionData) {
      toast.error("Войдите по PIN-коду");
      navigate("/pin");
      return;
    }

    const parsed = JSON.parse(sessionData) as CashierSession;

    if (parsed.role !== "cashier") {
      toast.error("Доступ только для кассиров");
      sessionStorage.removeItem("cashier_session");
      navigate("/");
      return;
    }

    setSession(parsed);

    if (!parsed.shift_id) openShift(parsed);
  }, [navigate]);

  const openShift = async (cashierSession: CashierSession) => {
    try {
      const { data: existingShift } = await supabase
        .from("shifts")
        .select("id, started_at")
        .eq("user_id", cashierSession.id)
        .eq("location_id", cashierSession.location_id)
        .is("ended_at", null)
        .maybeSingle();

      if (existingShift) {
        const updatedSession = { ...cashierSession, shift_id: existingShift.id, shift_start: existingShift.started_at };
        setSession(updatedSession);
        sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
        toast.info("Восстановлена открытая смена");
        return;
      }

      const { data, error } = await supabase
        .from("shifts")
        .insert({ user_id: cashierSession.id, location_id: cashierSession.location_id })
        .select()
        .single();

      if (error) throw error;

      const updatedSession = { ...cashierSession, shift_id: data.id, shift_start: data.started_at };
      setSession(updatedSession);
      sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
    } catch (error) {
      console.error("Error opening shift:", error);
    }
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
        const { data: recipe } = await supabase
          .from("menu_item_ingredients")
          .select("ingredient_id, semi_finished_id, quantity")
          .eq("menu_item_id", item.id);

        if (recipe && recipe.length > 0) {
          for (const recipeItem of recipe) {
            if (recipeItem.ingredient_id) {
              const { data: inv } = await supabase
                .from("inventory")
                .select("quantity")
                .eq("location_id", session.location_id)
                .eq("ingredient_id", recipeItem.ingredient_id)
                .maybeSingle();

              const currentQty = inv ? Number(inv.quantity) : 0;
              const existingInCart = cart.find((ci) => ci.menuItem.id === item.id);
              const cartQty = existingInCart ? existingInCart.quantity : 0;
              const requiredQty = Number(recipeItem.quantity) * (cartQty + 1);

              if (currentQty < requiredQty) {
                toast.error(`Недостаточно остатков для "${item.name}"`);
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error("Stock check error:", e);
      }
    }

    playCartAddSound();
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) return prev.map((ci) => (ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci));
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    toast.success(`${item.name} добавлен`, { duration: 1000 });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => (ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0),
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
  };

  const subtotal = cart.reduce((sum, ci) => sum + Number(ci.menuItem.price) * ci.quantity, 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "percent"
      ? Math.round(subtotal * appliedDiscount.value / 100)
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  const total = subtotal - discountAmount;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  useEffect(() => {
    broadcastToCustomerDisplay(cart, subtotal, discountAmount, total);
  }, [cart, subtotal, discountAmount, total]);
  // Часть 2 — визуальная часть и кнопки
  return (
    <>
      {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}

      <div className="flex flex-col h-screen">
        {/* Шапка с кнопками кассира */}
        <header className="flex justify-between items-center p-2 bg-gray-100 border-b border-gray-300">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsLocked(true)} title="Блокировка">
              <Lock className="w-4 h-4 mr-1" /> Блокировка
            </Button>
            <Button
              variant="secondary"
              onClick={() => openShift(session!)}
              title="Открыть смену"
            >
              <Clock className="w-4 h-4 mr-1" /> Открыть смену
            </Button>
            <Button
              variant="secondary"
              onClick={() => closeShift(session!)}
              title="Закрыть смену"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Закрыть смену
            </Button>
            <Button
              variant="secondary"
              onClick={() => clearCart()}
              title="Очистить корзину"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Очистить
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/")} title="Выход">
              <LogOut className="w-4 h-4 mr-1" /> Выход
            </Button>
          </div>
        </header>

        {/* Контент */}
        <div className="flex flex-1 overflow-hidden">
          {/* Меню */}
          <aside className="w-64 border-r border-gray-300 overflow-y-auto p-2">
            <MenuSearch categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
            <ScrollArea className="mt-2">
              <div className="flex flex-col gap-1">
                {(selectedCategory ? itemsByCategory.get(selectedCategory) : menuItems)?.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  const style = getCategoryStyle(cat?.name || "");
                  const Icon = style.icon;

                  return (
                    <Card key={item.id} className={cn("flex items-center justify-between p-2 cursor-pointer", style.bg)}>
                      <CardContent className="flex items-center gap-2 p-1">
                        <Icon className={style.color + " w-5 h-5"} />
                        <span>{item.name}</span>
                        <Badge variant="outline">{item.price}֏</Badge>
                      </CardContent>
                      <Button size="sm" variant="ghost" onClick={() => addToCart(item)}>+</Button>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>

          {/* Корзина */}
          <main className="flex-1 flex flex-col">
            <div className="flex-1 p-2 overflow-y-auto">
              <ScrollArea>
                <div className="flex flex-col gap-2">
                  {cart.map((ci) => (
                    <Card key={ci.menuItem.id} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2">
                        <span>{ci.menuItem.name}</span>
                        <Badge variant="secondary">{ci.quantity}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => updateQuantity(ci.menuItem.id, 1)}>+</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateQuantity(ci.menuItem.id, -1)}>-</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Итоговая панель */}
            <div className="p-2 border-t border-gray-300 bg-gray-50 flex justify-between items-center">
              <div>
                <div>Итого: {total}֏</div>
                {appliedDiscount && <div>Скидка: {discountAmount}֏</div>}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setPaymentDialogOpen(true)} variant="default" disabled={cart.length === 0}>
                  Оплата
                </Button>
                <Button onClick={() => setRefundDialogOpen(true)} variant="default">
                  Возврат
                </Button>
                <Button onClick={() => setOfflineQueueDialogOpen(true)} variant="default">
                  Оффлайн очередь ({queueCount})
                </Button>
              </div>
            </div>
          </main>
        </div>

        {/* Диалоги */}
        <PaymentDialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} cart={cart} subtotal={subtotal} discount={discountAmount} total={total} onPaid={clearCart} />
        <RefundDialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} />
        <ZReportDialog open={zReportDialogOpen} onClose={() => setZReportDialogOpen(false)} session={session!} />
        <OfflineQueueDialog open={offlineQueueDialogOpen} onClose={() => setOfflineQueueDialogOpen(false)} queue={queue} syncing={syncing} onSync={syncQueue} />
      </div>
    </>
  );

  async function closeShift(cashierSession: CashierSession) {
    if (!cashierSession.shift_id) return;
    try {
      const { data, error } = await supabase
        .from("shifts")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", cashierSession.shift_id)
        .select()
        .single();
      if (error) throw error;

      // Фиксируем время работы
      const start = new Date(cashierSession.shift_start!);
      const end = new Date();
      const minutesWorked = Math.round((end.getTime() - start.getTime()) / 60000);
      toast.success(`Смена закрыта. Рабочее время: ${minutesWorked} минут`);

      // Очищаем сессию
      sessionStorage.removeItem("cashier_session");
      setSession(null);
      navigate("/pin");
    } catch (e) {
      console.error("Ошибка закрытия смены:", e);
      toast.error("Не удалось закрыть смену");
    }
  }
}

