import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueuedOrder {
  id: string;
  timestamp: number;
  locationId: string;
  createdBy: string;
  cart: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  total: number;
  discount: number;
  discountId?: string;
  discountName?: string;
  discountType?: string;
  discountValue?: number;
  paymentMethod: string;
  paymentMethodName: string;
  cashReceived?: number;
  change?: number;
  cashierName: string;
  printed: boolean;
}

const QUEUE_KEY = 'cashier_offline_queue';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedOrder[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Загрузка очереди из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(QUEUE_KEY);
    if (saved) {
      try {
        setQueue(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Сохранение очереди в localStorage
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Отслеживание статуса сети
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Соединение восстановлено');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Нет соединения. Заказы будут сохранены локально.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Добавление заказа в очередь
  const addToQueue = useCallback((order: Omit<QueuedOrder, 'id' | 'timestamp' | 'printed'>) => {
    const queuedOrder: QueuedOrder = {
      ...order,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      printed: false,
    };
    
    setQueue(prev => [...prev, queuedOrder]);
    return queuedOrder;
  }, []);

  // Отметить заказ как напечатанный
  const markAsPrinted = useCallback((orderId: string) => {
    setQueue(prev => 
      prev.map(o => o.id === orderId ? { ...o, printed: true } : o)
    );
  }, []);

  // Синхронизация очереди с сервером
  const syncQueue = useCallback(async () => {
    if (queue.length === 0 || syncing || !isOnline) return;

    setSyncing(true);
    let syncedCount = 0;
    const errors: string[] = [];

    for (const order of queue) {
      try {
        // Создаём заказ
        const { data: createdOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            location_id: order.locationId,
            created_by: order.createdBy,
            subtotal: order.subtotal,
            total: order.total,
            discount: order.discount,
            discount_id: order.discountId || null,
            discount_name: order.discountName || null,
            discount_type: order.discountType || null,
            discount_value: order.discountValue || null,
            status: 'completed',
            payment_method: order.paymentMethod,
            completed_at: new Date(order.timestamp).toISOString(),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Добавляем позиции
        const orderItems = order.cart.map(item => ({
          order_id: createdOrder.id,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Списываем ингредиенты
        for (const item of order.cart) {
          const { data: recipe } = await supabase
            .from('menu_item_ingredients')
            .select('ingredient_id, quantity')
            .eq('menu_item_id', item.menuItemId);

          if (recipe) {
            for (const recipeItem of recipe) {
              if (recipeItem.ingredient_id) {
                const { data: currentInv } = await supabase
                  .from('inventory')
                  .select('id, quantity')
                  .eq('location_id', order.locationId)
                  .eq('ingredient_id', recipeItem.ingredient_id)
                  .maybeSingle();

                if (currentInv) {
                  const usedQty = Number(recipeItem.quantity) * item.quantity;
                  // Allow negative inventory (sales into minus)
                  await supabase
                    .from('inventory')
                    .update({ quantity: Number(currentInv.quantity) - usedQty })
                    .eq('id', currentInv.id);

                  await supabase.from('inventory_movements').insert({
                    location_id: order.locationId,
                    ingredient_id: recipeItem.ingredient_id,
                    movement_type: 'sale',
                    quantity: -usedQty,
                    reference_id: createdOrder.id,
                  });
                }
              }
            }
          }
        }

        syncedCount++;
      } catch (error) {
        console.error('Sync error for order:', order.id, error);
        errors.push(order.id);
      }
    }

    // Удаляем успешно синхронизированные заказы
    if (syncedCount > 0) {
      setQueue(prev => prev.filter(o => errors.includes(o.id)));
      toast.success(`Синхронизировано ${syncedCount} заказов`);
    }

    if (errors.length > 0) {
      toast.error(`Не удалось синхронизировать ${errors.length} заказов`);
    }

    setSyncing(false);
  }, [queue, syncing, isOnline]);

  // Автосинхронизация при восстановлении соединения
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncing) {
      // Небольшая задержка для стабилизации соединения
      const timeout = setTimeout(() => {
        syncQueue();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, queue.length, syncing, syncQueue]);

  // Получить количество заказов в очереди
  const queueCount = queue.length;

  // Получить заказ из очереди для печати
  const getOrderForReceipt = useCallback((orderId: string) => {
    return queue.find(o => o.id === orderId);
  }, [queue]);

  // Удалить заказ из очереди
  const removeFromQueue = useCallback((orderId: string) => {
    setQueue(prev => prev.filter(o => o.id !== orderId));
  }, []);

  return {
    isOnline,
    queue,
    queueCount,
    syncing,
    addToQueue,
    removeFromQueue,
    markAsPrinted,
    syncQueue,
    getOrderForReceipt,
  };
}
