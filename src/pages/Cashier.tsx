// CashierPage.tsx
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
  CloudUpload,
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
}

// Иконки и стили категорий
const categoryStyles: Record<string, { icon: typeof Coffee; color: string; bg: string }> = {
  Coffee: { icon: Coffee, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
  Combo: {
    icon: Package,
    color: "text-purple-600",
    bg: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
  },
  "Fries & Nuggets": {
    icon: Pizza,
    color: "text-orange-600",
    bg: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20",
  },
  Lunch: {
    icon: UtensilsCrossed,
    color: "text-green-600",
    bg: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
  },
  Salad: {
    icon: Salad,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
  },
  Sandwiches: {
    icon: Sandwich,
    color: "text-yellow-600",
    bg: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20",
  },
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
    
    // Listen for settings updates
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
  
  // Discount state
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    name: string;
    type: 'percent' | 'fixed';
    value: number;
    reason?: string;
  } | null>(null);
  
  // Customer display broadcast channel
  const broadcastToCustomerDisplay = (items: CartItem[], subtotalVal: number, discountVal: number, totalVal: number) => {
    try {
      const channel = new BroadcastChannel('customer_display');
      channel.postMessage({
        type: 'cart_update',
        data: {
          items: items.map((ci, idx) => ({
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
    } catch (e) {
      // BroadcastChannel not supported
    }
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
    
    // Открываем смену если её нет
    if (!parsed.shift_id) {
      openShift(parsed);
    }
  }, [navigate]);

  const openShift = async (cashierSession: CashierSession) => {
    try {
      // Check for existing open shift first
      const { data: existingShift, error: checkError } = await supabase
        .from("shifts")
        .select("id, started_at")
        .eq("user_id", cashierSession.id)
        .eq("location_id", cashierSession.location_id)
        .is("ended_at", null)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing shift:", checkError);
      }

      // If open shift exists, use it instead of creating new one
      if (existingShift) {
        const updatedSession = {
          ...cashierSession,
          shift_id: existingShift.id,
          shift_start: existingShift.started_at,
        };
        setSession(updatedSession);
        sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
        toast.info("Восстановлена открытая смена");
        return;
      }

      // Create new shift
      const { data, error } = await supabase
        .from("shifts")
        .insert({
          user_id: cashierSession.id,
          location_id: cashierSession.location_id,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedSession = {
        ...cashierSession,
        shift_id: data.id,
        shift_start: data.started_at,
      };
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
    // Check stock if negative sales disabled
    if (!cashierSettings.allowNegativeStock && session) {
      try {
        // Get recipe ingredients for this item
        const { data: recipe } = await supabase
          .from("menu_item_ingredients")
          .select("ingredient_id, semi_finished_id, quantity")
          .eq("menu_item_id", item.id);

        if (recipe && recipe.length > 0) {
          // Check inventory for each ingredient
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
        // Allow sale on error
      }
    }

    // Sound should be triggered directly from the click handler.
    playCartAddSound();
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) => (ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci));
      }
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
  
  // Calculate discount amount
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percent'
      ? Math.round(subtotal * appliedDiscount.value / 100)
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  
  const total = subtotal - discountAmount;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Broadcast cart to customer display when cart changes
  useEffect(() => {
    broadcastToCustomerDisplay(cart, subtotal, discountAmount, total);
  }, [cart, subtotal, discountAmount, total]);
  
  // Check low stock after successful sale
  const checkLowStock = async (locationId: string) => {
    try {
      const { data } = await supabase
        .from('inventory')
        .select('quantity, ingredient:ingredients(name, min_stock)')
        .eq('location_id', locationId);
      
      if (data) {
        const lowStock = data.filter(inv => {
          const minStock = Number((inv.ingredient as any)?.min_stock || 0);
          return minStock > 0 && Number(inv.quantity) <= minStock;
        });
        
        if (lowStock.length > 0) {
          const names = lowStock.map(i => (i.ingredient as any)?.name).filter(Boolean).slice(0, 3);
          toast.warning(`Низкий остаток: ${names.join(', ')}${lowStock.length > 3 ? ` и ещё ${lowStock.length - 3}` : ''}`);
        }
      }
    } catch (e) {
      console.error('Low stock check error:', e);
    }
  };

  const handlePayment = async (method: PaymentMethod, cashReceived?: number) => {
    if (!session) return;

    setProcessing(true);
    
    // Данные для чека (сохраняем до обработки)
    const orderData = {
      items: cart.map((ci) => ({
        menuItemId: ci.menuItem.id,
        menuItemName: ci.menuItem.name,
        name: ci.menuItem.name,
        quantity: ci.quantity,
        price: Number(ci.menuItem.price),
      })),
      subtotal,
      total,
      discount: discountAmount,
      discountId: appliedDiscount?.id,
      discountName: appliedDiscount?.name,
      discountType: appliedDiscount?.type,
      discountValue: appliedDiscount?.value,
      paymentMethod: method.code,
      paymentMethodName: method.name,
      cashReceived,
      change: cashReceived ? Math.max(0, cashReceived - total) : undefined,
      cashierName: session.full_name,
    };

    // Если оффлайн - добавляем в очередь
    if (!isOnline) {
      const queuedOrder = addToQueue({
        locationId: session.location_id,
        createdBy: session.id,
        cart: orderData.items,
        subtotal,
        total,
        discount: discountAmount,
        discountId: appliedDiscount?.id,
        discountName: appliedDiscount?.name,
        discountType: appliedDiscount?.type,
        discountValue: appliedDiscount?.value,
        paymentMethod: method.code,
        paymentMethodName: method.name,
        cashReceived,
        change: orderData.change,
        cashierName: session.full_name,
      });
      
      setLastOrder({
        orderNumber: `OFF-${queuedOrder.id.slice(0, 4).toUpperCase()}`,
        ...orderData,
        isOffline: true,
      });
      
      toast.info('Заказ сохранён офлайн');
      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
      clearCart();
      setProcessing(false);
      return;
    }

    try {
      // Создаём заказ
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          location_id: session.location_id,
          created_by: session.id,
          subtotal: subtotal,
          discount: discountAmount,
          discount_id: appliedDiscount?.id || null,
          discount_name: appliedDiscount?.name || null,
          discount_type: appliedDiscount?.type || null,
          discount_value: appliedDiscount?.value || null,
          total: total,
          status: "completed",
          payment_method: method.code,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Добавляем позиции
      const orderItems = cart.map((ci) => ({
        order_id: order.id,
        menu_item_id: ci.menuItem.id,
        quantity: ci.quantity,
        unit_price: ci.menuItem.price,
        total_price: Number(ci.menuItem.price) * ci.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Списываем ингредиенты
      for (const ci of cart) {
        const { data: recipe } = await supabase
          .from("menu_item_ingredients")
          .select("ingredient_id, semi_finished_id, quantity")
          .eq("menu_item_id", ci.menuItem.id);

        if (!recipe) continue;

        for (const recipeItem of recipe) {
          // Direct ingredient
          if (recipeItem.ingredient_id) {
            await deductIngredient(
              session.location_id,
              recipeItem.ingredient_id,
              Number(recipeItem.quantity) * ci.quantity,
              order.id
            );
          }

          // Semi-finished product - unpack and deduct proportionally
          if (recipeItem.semi_finished_id) {
            await deductSemiFinishedIngredients(
              session.location_id,
              recipeItem.semi_finished_id,
              Number(recipeItem.quantity),
              ci.quantity,
              order.id
            );
          }
        }
      }

      // Сохраняем данные для чека
      setLastOrder({
        orderNumber: order.order_number,
        ...orderData,
      });

      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
      clearCart();
      
      // Check low stock after sale
      checkLowStock(session.location_id);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка оформления заказа");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!session?.shift_id) {
      handleLogout();
      return;
    }

    try {
      // Закрываем смену
      await supabase
        .from("shifts")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", session.shift_id);

      handleLogout();
    } catch (error) {
      console.error("Error:", error);
      handleLogout();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cashier_session");
    navigate("/pin");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>;

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
    <div className="min-h-screen bg-background flex">
      {/* Главная часть меню */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{session?.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {t('cashier.title')} • {t('cashier.shiftOpened')}
                {fromCache && <span className="ml-1 text-amber-500">(кэш)</span>}
              </p>
            </div>
          </div>
          
          {/* Search */}
          <div className="flex-1 max-w-md">
            <MenuSearch
              menuItems={menuItems}
              categories={categories}
              onItemSelect={addToCart}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Offline/Online status */}
            {!isOnline && (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Оффлайн
              </Badge>
            )}
            {queueCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOfflineQueueDialogOpen(true)}
                className="gap-1"
              >
                <CloudUpload className="h-4 w-4" />
                {queueCount} в очереди
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshMenu}
              title="Обновить меню"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {lastOrder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReceiptDialogOpen(true)}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                #{lastOrder.orderNumber}
              </Button>
            )}
            <LanguageSelector />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLocked(true)}
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {t('cashier.lock')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Сменить кассира - переход на PIN-экран без закрытия смены
                sessionStorage.setItem("cashier_switch", "true");
                navigate("/pin");
              }}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Сменить
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundDialogOpen(true)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {t('cashier.refund')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZReportDialogOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Clock className="h-4 w-4" />
              {t('cashier.closeShift')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-6">
          {!selectedCategory ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((cat) => {
                const style = getCategoryStyle(cat.name);
                const Icon = style.icon;
                const count = itemsByCategory.get(cat.id)?.length || 0;
                return (
                  <Card
                    key={cat.id}
                    className={cn("cursor-pointer", style.bg)}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={cn("h-7 w-7 mx-auto mb-2", style.color)} />
                      <p>{cat.name}</p>
                      <p className="text-sm text-muted-foreground">{count} позиций</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                ← Назад
              </Button>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                {itemsByCategory.get(selectedCategory)?.map((item) => (
                  <Card key={item.id} className="cursor-pointer overflow-hidden" onClick={() => addToCart(item)}>
                    {item.image_url && (
                      <div className="aspect-square bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <CardContent className={cn("p-3", !item.image_url && "pt-6")}>
                      {!item.image_url && (
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium text-center line-clamp-2">{item.name}</p>
                      <p className="font-bold text-center text-primary">{Number(item.price).toLocaleString()} ֏</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Корзина */}
      <div className="w-96 border-l flex flex-col bg-card shadow-xl">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <p>Текущий заказ ({totalItems})</p>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-3 space-y-2">
          {cart.map((ci) => (
            <Card key={ci.menuItem.id}>
              <CardContent className="flex justify-between items-center p-3">
                <div className="flex items-center gap-3">
                  {ci.menuItem.image_url && (
                    <img
                      src={ci.menuItem.image_url}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium">{ci.menuItem.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ci.quantity} × {Number(ci.menuItem.price).toLocaleString()} ֏
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(ci.menuItem.id, -1)}>
                    -
                  </Button>
                  <span className="w-6 text-center">{ci.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(ci.menuItem.id, 1)}>
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>

        <div className="p-4 border-t space-y-3">
          {/* Discount selector */}
          {cart.length > 0 && (
            <DiscountSelector
              subtotal={subtotal}
              appliedDiscount={appliedDiscount}
              onDiscountChange={setAppliedDiscount}
            />
          )}
          
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Подытог:</span>
              <span>{subtotal.toLocaleString()} ֏</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Скидка:</span>
                <span>-{discountAmount.toLocaleString()} ֏</span>
              </div>
            )}
            <div className="flex justify-between text-lg">
              <span>Итого:</span>
              <span className="font-bold">{total.toLocaleString()} ֏</span>
            </div>
          </div>
          <Button className="w-full h-12 text-lg" onClick={() => setPaymentDialogOpen(true)} disabled={cart.length === 0}>
            Оплатить
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
        paymentMethods={paymentMethods}
        onConfirm={handlePayment}
        processing={processing}
      />

      {/* Receipt Dialog */}
      <ReceiptPrintDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        order={lastOrder}
      />

      {/* Z-Report Dialog */}
      {session && (
        <ZReportDialog
          open={zReportDialogOpen}
          onOpenChange={setZReportDialogOpen}
          locationId={session.location_id}
          userName={session.full_name}
          onConfirm={handleCloseShift}
        />
      )}

      {/* Refund Dialog */}
      {session && (
        <RefundDialog
          open={refundDialogOpen}
          onOpenChange={setRefundDialogOpen}
          locationId={session.location_id}
          onRefundComplete={() => toast.success('Возврат успешно оформлен')}
        />
      )}

      {/* Offline Queue Dialog */}
      <OfflineQueueDialog
        open={offlineQueueDialogOpen}
        onOpenChange={setOfflineQueueDialogOpen}
        queue={queue}
        syncing={syncing}
        isOnline={isOnline}
        onSync={syncQueue}
        onPrint={(order) => {
          setLastOrder({
            orderNumber: `OFF-${order.id.slice(0, 4).toUpperCase()}`,
            items: order.cart.map(i => ({ name: i.menuItemName, quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            total: order.total,
            discount: order.discount,
            discountName: order.discountName,
            paymentMethod: order.paymentMethod,
            paymentMethodName: order.paymentMethodName,
            cashReceived: order.cashReceived,
            change: order.change,
            cashierName: order.cashierName,
            isOffline: true,
          });
          setReceiptDialogOpen(true);
        }}
        onRemove={removeFromQueue}
      />
    </div>
  );
}