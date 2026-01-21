import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Minus, Trash2, CreditCard, Banknote, 
  UtensilsCrossed, ShoppingCart, Check, LogOut,
  Coffee, Pizza, Salad, Sandwich, Droplet, IceCream, Package
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type MenuItem = Tables<'menu_items'>;
type MenuCategory = Tables<'menu_categories'>;

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

// Category icons and colors for iiko-style UI
const categoryStyles: Record<string, { icon: typeof Coffee; color: string; bg: string }> = {
  'Coffee': { icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' },
  'Combo': { icon: Package, color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20' },
  'Fries & Nuggets': { icon: Pizza, color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' },
  'Lunch': { icon: UtensilsCrossed, color: 'text-green-600', bg: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' },
  'Salad': { icon: Salad, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' },
  'Sandwiches': { icon: Sandwich, color: 'text-yellow-600', bg: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' },
  'Sauces': { icon: Droplet, color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' },
  'Soft Drinks': { icon: Coffee, color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' },
  'Desserts': { icon: IceCream, color: 'text-pink-600', bg: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20' },
};

const defaultCategoryStyle = { icon: UtensilsCrossed, color: 'text-muted-foreground', bg: 'bg-muted/50 border-muted hover:bg-muted' };

export default function CashierPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CashierSession | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('cashier_session');
    if (!sessionData) {
      toast.error('Войдите по PIN-коду');
      navigate('/pin');
      return;
    }

    const parsed = JSON.parse(sessionData) as CashierSession;
    
    if (parsed.role !== 'cashier') {
      toast.error('Доступ только для кассиров');
      sessionStorage.removeItem('cashier_session');
      navigate('/');
      return;
    }
    
    setSession(parsed);
    fetchMenuData();
  }, [navigate]);

  const fetchMenuData = async () => {
    try {
      const [{ data: items }, { data: cats }] = await Promise.all([
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
      ]);

      setMenuItems(items || []);
      setCategories(cats || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки меню');
    } finally {
      setLoading(false);
    }
  };

  // Get items grouped by category for display
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    menuItems.forEach(item => {
      const catId = item.category_id;
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId)!.push(item);
    });
    return map;
  }, [menuItems]);

  const getCategoryStyle = (name: string) => categoryStyles[name] || defaultCategoryStyle;

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map(ci => 
          ci.menuItem.id === item.id 
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    toast.success(`${item.name} добавлен`, { duration: 1000 });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(ci => {
        if (ci.menuItem.id === itemId) {
          const newQty = ci.quantity + delta;
          return newQty > 0 ? { ...ci, quantity: newQty } : ci;
        }
        return ci;
      }).filter(ci => ci.quantity > 0);
      return updated;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.menuItem.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, ci) => sum + Number(ci.menuItem.price) * ci.quantity, 0);
  const total = subtotal;
  const totalItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const change = paymentMethod === 'cash' && cashReceived 
    ? Math.max(0, parseFloat(cashReceived) - total)
    : 0;

  const handlePayment = async () => {
    if (!session?.location_id) {
      toast.error('Не указана точка');
      return;
    }

    if (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total)) {
      toast.error('Недостаточно средств');
      return;
    }

    setProcessing(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          location_id: session.location_id,
          subtotal: subtotal,
          total: total,
          discount: 0,
          payment_method: paymentMethod,
          status: 'completed',
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Deduct ingredients from inventory
      for (const cartItem of cart) {
        const { data: recipe } = await supabase
          .from('menu_item_ingredients')
          .select('ingredient_id, quantity')
          .eq('menu_item_id', cartItem.menuItem.id);

        if (recipe && recipe.length > 0) {
          for (const ing of recipe) {
            if (ing.ingredient_id) {
              const deductQty = Number(ing.quantity) * cartItem.quantity;
              
              const { data: currentInv } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('location_id', session.location_id)
                .eq('ingredient_id', ing.ingredient_id)
                .maybeSingle();

              if (currentInv) {
                await supabase
                  .from('inventory')
                  .update({ quantity: Math.max(0, Number(currentInv.quantity) - deductQty) })
                  .eq('id', currentInv.id);
              }

              await supabase
                .from('inventory_movements')
                .insert({
                  location_id: session.location_id,
                  ingredient_id: ing.ingredient_id,
                  movement_type: 'sale',
                  quantity: -deductQty,
                  reference_id: order.id,
                });
            }
          }
        }
      }

      toast.success(`Заказ #${order.order_number} оплачен!`);
      setPaymentDialogOpen(false);
      clearCart();
      setCashReceived('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка оформления заказа');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cashier_session');
    navigate('/pin');
  };

  // Filter items by selected category
  const displayedItems = selectedCategory 
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : [];

  const selectedCategoryData = selectedCategory 
    ? categories.find(c => c.id === selectedCategory)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Загрузка меню...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main menu section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
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
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Выход
          </Button>
        </header>

        {/* Categories or Menu items */}
        <ScrollArea className="flex-1 p-6">
          {!selectedCategory ? (
            // Show categories grid
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Выберите категорию</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {categories.map(cat => {
                  const style = getCategoryStyle(cat.name);
                  const Icon = style.icon;
                  const itemCount = itemsByCategory.get(cat.id)?.length || 0;
                  
                  return (
                    <Card 
                      key={cat.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 border-2 active:scale-95",
                        style.bg
                      )}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={cn("w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center", style.bg)}>
                          <Icon className={cn("h-7 w-7", style.color)} />
                        </div>
                        <p className="font-semibold text-base">{cat.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{itemCount} позиций</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            // Show items in selected category
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="gap-2"
                >
                  ← Назад
                </Button>
                <h2 className="text-xl font-semibold">{selectedCategoryData?.name}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {displayedItems.map(item => {
                  const cartItem = cart.find(ci => ci.menuItem.id === item.id);
                  const style = getCategoryStyle(selectedCategoryData?.name || '');
                  
                  return (
                    <Card 
                      key={item.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 relative overflow-hidden active:scale-95",
                        "hover:shadow-lg hover:border-primary/50",
                        cartItem && "ring-2 ring-primary"
                      )}
                      onClick={() => addToCart(item)}
                    >
                      {cartItem && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {cartItem.quantity}
                        </div>
                      )}
                      <CardContent className="p-4">
                        <p className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{item.name}</p>
                        <p className={cn("text-xl font-bold mt-2", style.color)}>
                          {Number(item.price).toLocaleString()} ֏
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart section */}
      <div className="w-96 border-l flex flex-col bg-card shadow-xl">
        {/* Cart header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Текущий заказ</h2>
                <p className="text-sm text-muted-foreground">{totalItems} позиций</p>
              </div>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground">Корзина пуста</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Выберите категорию и добавьте блюда</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map(ci => (
                <Card key={ci.menuItem.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{ci.menuItem.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(ci.menuItem.price).toLocaleString()} ֏ × {ci.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-primary">
                        {(Number(ci.menuItem.price) * ci.quantity).toLocaleString()} ֏
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          ci.quantity === 1 ? removeFromCart(ci.menuItem.id) : updateQuantity(ci.menuItem.id, -1);
                        }}
                      >
                        {ci.quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                      </Button>
                      <span className="w-10 text-center font-bold text-lg">{ci.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(ci.menuItem.id, 1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Total and payment */}
        <div className="p-4 border-t bg-muted/30 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Подытог</span>
              <span>{subtotal.toLocaleString()} ֏</span>
            </div>
            <div className="flex justify-between text-2xl font-bold">
              <span>Итого</span>
              <span className="text-primary">{total.toLocaleString()} ֏</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline"
              className="h-14 text-lg gap-2" 
              disabled={cart.length === 0}
              onClick={() => {
                setPaymentMethod('cash');
                setPaymentDialogOpen(true);
              }}
            >
              <Banknote className="h-5 w-5" />
              Наличные
            </Button>
            <Button 
              className="h-14 text-lg gap-2" 
              disabled={cart.length === 0}
              onClick={() => {
                setPaymentMethod('card');
                setPaymentDialogOpen(true);
              }}
            >
              <CreditCard className="h-5 w-5" />
              Карта
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Оплата заказа</DialogTitle>
            <DialogDescription className="text-lg">
              К оплате: <span className="font-bold text-primary">{total.toLocaleString()} ֏</span>
            </DialogDescription>
          </DialogHeader>

          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="cash" className="gap-2 text-base">
                <Banknote className="h-5 w-5" />
                Наличные
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-2 text-base">
                <CreditCard className="h-5 w-5" />
                Карта
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Получено от клиента</label>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0"
                  className="text-3xl h-16 text-center mt-2 font-bold"
                  autoFocus
                />
              </div>
              {parseFloat(cashReceived) >= total && (
                <div className="p-6 bg-green-500/10 rounded-xl text-center border border-green-500/30">
                  <p className="text-sm text-muted-foreground">Сдача</p>
                  <p className="text-4xl font-bold text-green-600">{change.toLocaleString()} ֏</p>
                </div>
              )}
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[1000, 2000, 5000, 10000].map(amount => (
                  <Button 
                    key={amount} 
                    variant="outline"
                    className="h-12 font-bold"
                    onClick={() => setCashReceived(amount.toString())}
                  >
                    {amount.toLocaleString()}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="card" className="mt-4">
              <div className="p-10 text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <CreditCard className="h-10 w-10 text-primary" />
                </div>
                <p className="text-xl font-medium">Приложите карту к терминалу</p>
                <p className="text-muted-foreground mt-2">Сумма: {total.toLocaleString()} ֏</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total))}
              className="flex-1 gap-2"
            >
              {processing ? 'Обработка...' : 'Подтвердить'}
              <Check className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
