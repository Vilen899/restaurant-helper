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

    if (!parsed.shift_id) {
      openShift(parsed);
    }
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

      if (checkError) console.error("Error checking existing shift:", checkError);

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

  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percent'
      ? Math.round(subtotal * appliedDiscount.value / 100)
      : Math.min(appliedDiscount.value, subtotal)
    : 0;

  const total = subtotal - discountAmount;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  useEffect(() => {
    broadcastToCustomerDisplay(cart, subtotal, discountAmount, total);
  }, [cart, subtotal, discountAmount, total]);

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

      const orderItems = cart.map((ci) => ({
        order_id: order.id,
        menu_item_id: ci.menuItem.id,
        quantity: ci.quantity,
        unit_price: ci.menuItem.price,
        total_price: Number(ci.menuItem.price) * ci.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      for (const ci of cart) {
        const { data: recipe } = await supabase
          .from("menu_item_ingredients")
          .select("ingredient_id, semi_finished_id, quantity")
          .eq("menu_item_id", ci.menuItem.id);

        if (!recipe) continue;

        for (const recipeItem of recipe) {
          if (recipeItem.ingredient_id) {
            await deductIngredient(
              session.location_id,
              recipeItem.ingredient_id,
              Number(recipeItem.quantity) * ci.quantity,
              order.id
            );
          }

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

      setLastOrder({
        orderNumber: order.order_number,
        ...orderData,
      });

      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
      clearCart();
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
      await supabase
        .from("sh
