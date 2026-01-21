import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Minus, Trash2, CreditCard, Banknote, 
  UtensilsCrossed, ShoppingCart, X, Check, LogOut 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

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

export default function CashierPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CashierSession | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check cashier session
    const sessionData = sessionStorage.getItem('cashier_session');
    if (!sessionData) {
      toast.error('Войдите по PIN-коду');
      navigate('/pin');
      return;
    }

    const parsed = JSON.parse(sessionData) as CashierSession;
    
    // Only cashiers can access this page
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
      // Create order
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

      // Create order items
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
        // Get recipe for this menu item
        const { data: recipe } = await supabase
          .from('menu_item_ingredients')
          .select('ingredient_id, quantity')
          .eq('menu_item_id', cartItem.menuItem.id);

        if (recipe && recipe.length > 0) {
          for (const ing of recipe) {
            if (ing.ingredient_id) {
              const deductQty = Number(ing.quantity) * cartItem.quantity;
              
              // Update inventory
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

              // Log movement
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

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Menu section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="text-primary-foreground h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{session?.full_name}</p>
              <p className="text-xs text-muted-foreground">Кассир</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выход
          </Button>
        </header>

        {/* Categories */}
        <div className="border-b p-2">
          <ScrollArea className="w-full">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Все
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Menu grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:border-primary transition-colors active:scale-95"
                onClick={() => addToCart(item)}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    ₽{Number(item.price).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart section */}
      <div className="w-80 border-l flex flex-col bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Заказ
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Корзина пуста</p>
              <p className="text-sm">Выберите блюда из меню</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {cart.map(ci => (
                <Card key={ci.menuItem.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ci.menuItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₽{Number(ci.menuItem.price).toLocaleString()} × {ci.quantity}
                      </p>
                    </div>
                    <p className="font-bold">
                      ₽{(Number(ci.menuItem.price) * ci.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => ci.quantity === 1 ? removeFromCart(ci.menuItem.id) : updateQuantity(ci.menuItem.id, -1)}
                    >
                      {ci.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </Button>
                    <span className="w-8 text-center font-medium">{ci.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => updateQuantity(ci.menuItem.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Total and payment */}
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Итого</span>
            <span>₽{total.toLocaleString()}</span>
          </div>
          <Button 
            className="w-full h-14 text-lg" 
            disabled={cart.length === 0}
            onClick={() => setPaymentDialogOpen(true)}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Оплатить
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оплата заказа</DialogTitle>
            <DialogDescription>
              К оплате: ₽{total.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cash" className="gap-2">
                <Banknote className="h-4 w-4" />
                Наличные
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-2">
                <CreditCard className="h-4 w-4" />
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
                  className="text-2xl h-14 text-center mt-2"
                  autoFocus
                />
              </div>
              {parseFloat(cashReceived) >= total && (
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Сдача</p>
                  <p className="text-3xl font-bold text-green-500">₽{change.toLocaleString()}</p>
                </div>
              )}
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 2000, 5000].map(amount => (
                  <Button 
                    key={amount} 
                    variant="outline"
                    onClick={() => setCashReceived(amount.toString())}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="card" className="mt-4">
              <div className="p-8 text-center">
                <CreditCard className="h-16 w-16 mx-auto text-primary mb-4" />
                <p className="text-lg font-medium">Приложите карту к терминалу</p>
                <p className="text-muted-foreground">Сумма: ₽{total.toLocaleString()}</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total))}
            >
              {processing ? 'Обработка...' : 'Подтвердить'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
