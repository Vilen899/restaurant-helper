import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  ShoppingCart,
  Check,
  LogOut,
  Coffee,
  Pizza,
  Salad,
  Sandwich,
  Droplet,
  IceCream,
  Package,
  Printer,
  Wallet,
  Smartphone,
  QrCode,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { NumericKeypad } from "@/components/cashier/NumericKeypad";
import { ZReportDialog } from "@/components/cashier/ZReportDialog";
import { RefundDialog } from "@/components/cashier/RefundDialog";
import { CloseShiftDialog } from "@/components/cashier/CloseShiftDialog";

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
}

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
  const [session, setSession] = useState<CashierSession | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    order_number: number;
    items: CartItem[];
    subtotal: number;
    total: number;
    payment_method: string;
    payment_method_name?: string;
    cash_received?: number;
    change?: number;
    date: Date;
  } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState("");
  const [processing, setProcessing] = useState(false);

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
    fetchMenuData();
  }, [navigate]);

  const fetchMenuData = async () => {
    try {
      const [{ data: items }, { data: cats }, { data: payments }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("menu_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
      ]);

      setMenuItems(items || []);
      setCategories(cats || []);
      setPaymentMethods(payments || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка загрузки меню");
    } finally {
      setLoading(false);
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

  const addToCart = (item: MenuItem) => {
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
    setCart((prev) => {
      const updated = prev
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : ci;
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0);
      return updated;
    });
  };

  const removeFromCart = (itemId: string) => setCart((prev) => prev.filter((ci) => ci.menuItem.id !== itemId));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, ci) => sum + Number(ci.menuItem.price) * ci.quantity, 0);
  const total = subtotal;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const isCashPayment = selectedPaymentMethod?.code === "cash";
  const change = isCashPayment && cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;

  const handlePayment = async () => {
    if (!session?.location_id) return toast.error("Не указана точка");
    if (!selectedPaymentMethod) return toast.error("Выберите способ оплаты");
    if (isCashPayment && (!cashReceived || parseFloat(cashReceived) < total))
      return toast.error("Недостаточно средств");

    setProcessing(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          location_id: session.location_id,
          subtotal,
          total,
          discount: 0,
          payment_method: selectedPaymentMethod.code,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((ci) => ({
        order_id: order.id,
        menu_item_id: ci.menuItem.id,
        quantity: ci.quantity,
        unit_price: Number(ci.menuItem.price),
        total_price: Number(ci.menuItem.price) * ci.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      setLastOrder({
        order_number: order.order_number,
        items: [...cart],
        subtotal,
        total,
        payment_method: selectedPaymentMethod.code,
        payment_method_name: selectedPaymentMethod.name,
        cash_received: isCashPayment ? parseFloat(cashReceived) : undefined,
        change: isCashPayment ? Math.max(0, parseFloat(cashReceived) - total) : undefined,
        date: new Date(),
      });

      toast.success(`Заказ #${order.order_number} оплачен!`);
      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
      clearCart();
      setCashReceived("");
      setSelectedPaymentMethod(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка оформления заказа");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cashier_session");
    navigate("/pin");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Загрузка меню...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Здесь весь JSX CashierPage, как выше */}
      {/* ... */}
      {/* Close Shift Dialog */}
      {session && (
        <CloseShiftDialog
          open={closeShiftDialogOpen}
          onOpenChange={setCloseShiftDialogOpen}
          locationId={session.location_id}
          userId={session.id}
          userName={session.full_name}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
}
