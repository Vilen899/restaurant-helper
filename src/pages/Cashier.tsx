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

  const [cashierSettings, setCashierSettings] = useState({ autoLockEnabled: true, autoLockMinutes: 5, allowNegativeStock: true });
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string; name: string; type: 'percent' | 'fixed'; value: number; reason?: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cashier_settings');
    if (saved) setCashierSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
    const channel = new BroadcastChannel('cashier_settings');
    channel.onmessage = (event) => { if (event.data.type === 'settings_update') setCashierSettings(prev => ({ ...prev, ...event.data.data })); };
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
      channel.postMessage({ type: 'cart_update', data: { items: items.map(ci => ({ id: ci.menuItem.id, name: ci.menuItem.name, quantity: ci.quantity, price: Number(ci.menuItem.price) })), subtotal: subtotalVal, discount: discountVal, total: totalVal } });
      channel.close();
    } catch {}
  };

  // Загрузка сессии и открытие смены
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
      const { data: existingShift } = await supabase
        .from("shifts")
        .select("id, started_at")
        .eq("location_id", cashierSession.location_id)
        .is("ended_at", null)
        .maybeSingle();

      let shiftId = existingShift?.id;

      if (!shiftId) {
        const { data, error } = await supabase
          .from("shifts")
          .insert({ user_id: cashierSession.id, location_id: cashierSession.location_id })
          .select()
          .single();
        if (error) throw error;
        shiftId = data.id;
      }

      const updatedSession = {
        ...cashierSession,
        shift_id: shiftId,
        shift_start: existingShift?.started_at || new Date().toISOString(),
      };
      setSession(updatedSession);
      sessionStorage.setItem("cashier_session", JSON.stringify(updatedSession));
      toast.info(existingShift ? "Восстановлена открытая смена" : "Смена открыта");
    } catch (error) {
      console.error("Error opening shift:", error);
      toast.error("Не удалось открыть смену");
    }
  };

  const handleCloseShift = async () => {
    if (!session?.shift_id) { handleLogout(); return; }
    try {
      await supabase.from("shifts").update({ ended_at: new Date().toISOString() }).eq("id", session.shift_id);
      toast.success("Смена закрыта");
      handleLogout();
    } catch (error) { console.error(error); handleLogout(); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cashier_session");
    navigate("/pin");
  };

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    menuItems.forEach(item => { const catId = item.category_id; if (!map.has(catId)) map.set(catId, []); map.get(catId)!.push(item); });
    return map;
  }, [menuItems]);

  const getCategoryStyle = (name: string) => categoryStyles[name] || defaultCategoryStyle;

  const addToCart = async (item: MenuItem) => {
    if (!cashierSettings.allowNegativeStock && session) {
      try {
        const { data: recipe } = await supabase.from("menu_item_ingredients").select("ingredient_id, semi_finished_id, quantity").eq("menu_item_id", item.id);
        if (recipe?.length) {
          for (const r of recipe) {
            if (r.ingredient_id) {
              const { data: inv } = await supabase.from("inventory").select("quantity").eq("location_id", session.location_id).eq("ingredient_id", r.ingredient_id).maybeSingle();
              const currentQty = inv ? Number(inv.quantity) : 0;
              const existingInCart = cart.find(ci => ci.menuItem.id === item.id);
              const cartQty = existingInCart ? existingInCart.quantity : 0;
              if (currentQty < Number(r.quantity) * (cartQty + 1)) { toast.error(`Недостаточно "${item.name}"`); return; }
            }
          }
        }
      } catch (e) { console.error(e); }
    }
    playCartAddSound();
    setCart(prev => { const existing = prev.find(ci => ci.menuItem.id === item.id); if (existing) return prev.map(ci => ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci); return [...prev, { menuItem: item, quantity: 1 }]; });
    toast.success(`${item.name} добавлен`, { duration: 1000 });
  };

  const updateQuantity = (itemId: string, delta: number) => { setCart(prev => prev.map(ci => ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci).filter(ci => ci.quantity > 0)); };
  const clearCart = () => { setCart([]); setAppliedDiscount(null); };

  const subtotal = cart.reduce((sum, ci) => sum + Number(ci.menuItem.price) * ci.quantity, 0);
  const discountAmount = appliedDiscount ? appliedDiscount.type === 'percent' ? Math.round(subtotal * appliedDiscount.value / 100) : Math.min(appliedDiscount.value, subtotal) : 0;
  const total = subtotal - discountAmount;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  useEffect(() => { broadcastToCustomerDisplay(cart, subtotal, discountAmount, total); }, [cart, subtotal, discountAmount, total]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>;
  if (isLocked && session) return <LockScreen onUnlock={() => setIsLocked(false)} userName={session.full_name} userId={session.id} locationId={session.location_id} />;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ...здесь остальная разметка меню и корзины, кнопки оплаты, диалоги и т.д. без изменений... */}
    </div>
  );
}
