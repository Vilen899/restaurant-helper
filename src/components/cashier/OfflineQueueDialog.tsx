import { useState } from 'react';
import { WifiOff, Printer, RefreshCw, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  discountName?: string;
  paymentMethod: string;
  paymentMethodName: string;
  cashReceived?: number;
  change?: number;
  cashierName: string;
  printed: boolean;
}

interface OfflineQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: QueuedOrder[];
  syncing: boolean;
  isOnline: boolean;
  onSync: () => void;
  onPrint: (order: QueuedOrder) => void;
  onRemove: (orderId: string) => void;
}

export function OfflineQueueDialog({
  open,
  onOpenChange,
  queue,
  syncing,
  isOnline,
  onSync,
  onPrint,
  onRemove,
}: OfflineQueueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5" />
            Оффлайн-заказы
          </DialogTitle>
          <DialogDescription>
            {queue.length === 0
              ? 'Нет заказов в очереди'
              : `${queue.length} заказ(ов) ожидают синхронизации`}
          </DialogDescription>
        </DialogHeader>

        {queue.length > 0 && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={onSync}
                disabled={syncing || !isOnline}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Синхронизация...' : 'Синхронизировать все'}
              </Button>
              {!isOnline && (
                <Badge variant="destructive">Нет сети</Badge>
              )}
            </div>

            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {queue.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          OFF-{order.id.slice(0, 4).toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(order.timestamp), 'HH:mm', { locale: ru })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {order.printed ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Напечатан
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Не напечатан
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium">{order.cart.length} позиций</p>
                      <p className="text-muted-foreground truncate">
                        {order.cart.map(i => i.menuItemName).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{order.total.toLocaleString()} ֏</p>
                        {order.discount > 0 && (
                          <p className="text-xs text-green-600">
                            Скидка: -{order.discount.toLocaleString()} ֏
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPrint(order)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Удалить заказ из очереди? Он не будет синхронизирован!')) {
                              onRemove(order.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {queue.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <WifiOff className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Все заказы синхронизированы</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
