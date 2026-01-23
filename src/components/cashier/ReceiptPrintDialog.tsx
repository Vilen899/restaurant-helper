import { useState } from 'react';
import { Printer, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface OrderData {
  orderNumber: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  cashierName: string;
  locationName?: string;
}

interface ReceiptPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderData | null;
}

export function ReceiptPrintDialog({ open, onOpenChange, order }: ReceiptPrintDialogProps) {
  const [printing, setPrinting] = useState(false);

  if (!order) return null;

  const printReceipt = () => {
    setPrinting(true);

    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Чек #${order.orderNumber}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      padding: 10px; 
      width: 80mm; 
    }
    .header { 
      text-align: center; 
      margin-bottom: 10px; 
      padding-bottom: 8px;
      border-bottom: 1px dashed #000; 
    }
    .header h1 { font-size: 16px; margin-bottom: 4px; }
    .info { margin-bottom: 10px; font-size: 11px; }
    .items { 
      border-top: 1px dashed #000; 
      border-bottom: 1px dashed #000; 
      padding: 8px 0;
      margin: 8px 0;
    }
    .item { 
      display: flex; 
      justify-content: space-between; 
      margin: 4px 0; 
    }
    .item-name { flex: 1; }
    .item-qty { width: 30px; text-align: center; }
    .item-price { width: 60px; text-align: right; }
    .totals { padding: 8px 0; }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      margin: 4px 0; 
    }
    .total-row.final { 
      font-size: 14px; 
      font-weight: bold; 
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #000;
    }
    .footer { 
      text-align: center; 
      margin-top: 15px; 
      padding-top: 10px;
      border-top: 1px dashed #000;
      font-size: 10px; 
    }
    .footer p { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ЧЕК #${order.orderNumber}</h1>
    <p>${order.locationName || 'Ресторан'}</p>
  </div>
  
  <div class="info">
    <p>Дата: ${format(new Date(), 'dd.MM.yyyy HH:mm:ss')}</p>
    <p>Кассир: ${order.cashierName}</p>
  </div>
  
  <div class="items">
    ${order.items.map(item => `
      <div class="item">
        <span class="item-name">${item.name}</span>
        <span class="item-qty">×${item.quantity}</span>
        <span class="item-price">${(item.price * item.quantity).toLocaleString()} ֏</span>
      </div>
    `).join('')}
  </div>
  
  <div class="totals">
    <div class="total-row">
      <span>Подытог:</span>
      <span>${order.subtotal.toLocaleString()} ֏</span>
    </div>
    <div class="total-row final">
      <span>ИТОГО:</span>
      <span>${order.total.toLocaleString()} ֏</span>
    </div>
    <div class="total-row">
      <span>Оплата:</span>
      <span>${order.paymentMethod}</span>
    </div>
    ${order.cashReceived ? `
    <div class="total-row">
      <span>Получено:</span>
      <span>${order.cashReceived.toLocaleString()} ֏</span>
    </div>
    <div class="total-row">
      <span>Сдача:</span>
      <span>${(order.change || 0).toLocaleString()} ֏</span>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Спасибо за покупку!</p>
    <p>Ждём вас снова</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setPrinting(false);
        onOpenChange(false);
      }, 250);
    } else {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-6 w-6" />
            Заказ #{order.orderNumber} оплачен!
          </DialogTitle>
          <DialogDescription>
            Сумма: {order.total.toLocaleString()} ֏
            {order.change ? ` • Сдача: ${order.change.toLocaleString()} ֏` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name} ×{item.quantity}</span>
                <span>{(item.price * item.quantity).toLocaleString()} ֏</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-sm text-muted-foreground">
                +{order.items.length - 3} ещё...
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Закрыть
          </Button>
          <Button onClick={printReceipt} disabled={printing}>
            <Printer className="h-4 w-4 mr-2" />
            {printing ? 'Печать...' : 'Печать чека'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
