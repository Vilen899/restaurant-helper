import { useState } from 'react';
import { Banknote, CreditCard, Wallet, QrCode, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NumericKeypad } from './NumericKeypad';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type PaymentMethod = Tables<'payment_methods'>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  paymentMethods: PaymentMethod[];
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
  processing: boolean;
}

const paymentIcons: Record<string, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  wallet: Wallet,
  qr: QrCode,
};

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  paymentMethods,
  onConfirm,
  processing,
}: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState('');

  const isCash = selectedMethod?.code === 'cash';
  const cashValue = parseFloat(cashReceived) || 0;
  const change = isCash ? Math.max(0, cashValue - total) : 0;
  const canPay = selectedMethod && (!isCash || cashValue >= total);

  const handleConfirm = () => {
    if (!selectedMethod) return;
    onConfirm(selectedMethod, isCash ? cashValue : undefined);
  };

  const quickAmounts = [1000, 2000, 5000, 10000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Оплата заказа</DialogTitle>
          <DialogDescription>
            К оплате: <span className="font-bold text-xl">{total.toLocaleString()} ֏</span>
          </DialogDescription>
        </DialogHeader>

        {/* Payment Methods */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {paymentMethods.map((method) => {
            const Icon = paymentIcons[method.code] || Wallet;
            return (
              <Button
                key={method.id}
                variant={selectedMethod?.id === method.id ? 'default' : 'outline'}
                className={cn(
                  'h-16 flex-col gap-1',
                  selectedMethod?.id === method.id && 'ring-2 ring-primary'
                )}
                onClick={() => {
                  setSelectedMethod(method);
                  setCashReceived('');
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{method.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Cash Input */}
        {isCash && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCashReceived(amount.toString())}
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>

            <NumericKeypad
              value={cashReceived}
              onChange={setCashReceived}
              quickAmounts={[]}
            />

            {cashValue > 0 && (
              <div className={cn(
                'p-4 rounded-lg text-center',
                cashValue >= total ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
              )}>
                {cashValue >= total ? (
                  <>
                    <p className="text-sm">Сдача:</p>
                    <p className="text-2xl font-bold">{change.toLocaleString()} ֏</p>
                  </>
                ) : (
                  <p className="font-medium">Недостаточно: нужно ещё {(total - cashValue).toLocaleString()} ֏</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={!canPay || processing}>
            <Check className="h-4 w-4 mr-2" />
            {processing ? 'Обработка...' : 'Подтвердить оплату'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
