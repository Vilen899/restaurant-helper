// CashierPage.tsx
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

// -------------------- CloseShiftDialog компонент --------------------
interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  userId: string;
  userName: string;
  onConfirm: () => void;
}

export function CloseShiftDialog({
  open,
  onOpenChange,
  locationId,
  userId,
  userName,
  onConfirm,
}: CloseShiftDialogProps) {
  const [processing, setProcessing] = useState(false);

  const handleCloseShift = async () => {
    setProcessing(true);
    try {
      // Обновляем статус смены
      await supabase
        .from("cashier_shifts")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("location_id", locationId);

      toast.success("Смена закрыта");
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка закрытия смены");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Закрыть смену</DialogTitle>
          <DialogDescription>
            Пользователь: {userName}
            <br />
            Точка: {locationId}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Отмена
          </Button>
          <Button onClick={handleCloseShift} className="flex-1" disabled={processing}>
            {processing ? "Обработка..." : "Закрыть"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- CashierPage компонент --------------------
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
  const [lastOrder, setLastOrder] = useState<any>(null);
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
      console.error(error);
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
    setCart((prev) =>
      prev
        .map((ci) => (ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.menuItem.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, ci) => sum + Number(ci.menuItem.price) * ci.quantity, 0);
  const total = subtotal;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const isCashPayment = selectedPaymentMethod?.code === "cash";
  const change = isCashPayment && cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;

  const handleLogout = () => {
    sessionStorage.removeItem("cashier_session");
    navigate("/pin");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Главная часть меню */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{session?.full_name}</p>
              <p className="text-xs text-muted-foreground">Кассир • Смена открыта</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseShiftDialogOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Clock className="h-4 w-4" />
              Закрыть смену
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
                  <Card key={item.id} className="cursor-pointer" onClick={() => addToCart(item)}>
                    <CardContent>
                      <p>{item.name}</p>
                      <p className="font-bold">{Number(item.price).toLocaleString()} ֏</p>
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
              <CardContent className="flex justify-between items-center">
                <div>
                  <p>{ci.menuItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ci.quantity} × {Number(ci.menuItem.price).toLocaleString()} ֏
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => updateQuantity(ci.menuItem.id, -1)}>
                    -
                  </Button>
                  <span>{ci.quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => updateQuantity(ci.menuItem.id, 1)}>
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <div className="flex justify-between">
            <span>Итого:</span>
            <span className="font-bold">{total.toLocaleString()} ֏</span>
          </div>
          <Button className="w-full" onClick={() => setPaymentDialogOpen(true)} disabled={cart.length === 0}>
            Оплатить
          </Button>
        </div>
      </div>

      {/* CloseShiftDialog */}
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
