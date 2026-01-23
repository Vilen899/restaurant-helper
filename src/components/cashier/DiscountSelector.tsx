import { useState, useEffect } from 'react';
import { Tag, Percent, Hash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Discount = Tables<'discounts'>;

interface AppliedDiscount {
  id: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  reason?: string;
}

interface DiscountSelectorProps {
  subtotal: number;
  onDiscountChange: (discount: AppliedDiscount | null) => void;
  appliedDiscount: AppliedDiscount | null;
}

export function DiscountSelector({ subtotal, onDiscountChange, appliedDiscount }: DiscountSelectorProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const loadDiscounts = async () => {
      const { data } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      setDiscounts(data || []);
    };
    loadDiscounts();
  }, []);

  const applyDiscount = (discount: Discount) => {
    onDiscountChange({
      id: discount.id,
      name: discount.name,
      type: discount.discount_type as 'percent' | 'fixed',
      value: Number(discount.value),
      reason: reason || undefined,
    });
    setOpen(false);
    setReason('');
  };

  const removeDiscount = () => {
    onDiscountChange(null);
  };

  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percent') {
      return Math.round(subtotal * appliedDiscount.value / 100);
    }
    return Math.min(appliedDiscount.value, subtotal);
  };

  const discountAmount = calculateDiscountAmount();

  if (appliedDiscount) {
    return (
      <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-600">{appliedDiscount.name}</p>
            {appliedDiscount.reason && (
              <p className="text-xs text-muted-foreground">{appliedDiscount.reason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-green-600">
            -{discountAmount.toLocaleString()} ֏
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={removeDiscount}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Tag className="h-4 w-4" />
          Добавить скидку
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Причина (необязательно)</Label>
            <Input
              placeholder="Например: День рождения"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Выберите скидку</Label>
            {discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Нет доступных скидок
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {discounts.map((discount) => {
                  const amount = discount.discount_type === 'percent'
                    ? Math.round(subtotal * Number(discount.value) / 100)
                    : Math.min(Number(discount.value), subtotal);
                  
                  return (
                    <Button
                      key={discount.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-auto py-2"
                      onClick={() => applyDiscount(discount)}
                    >
                      <div className="flex items-center gap-2">
                        {discount.discount_type === 'percent' ? (
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Hash className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{discount.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {discount.discount_type === 'percent' 
                            ? `${discount.value}%` 
                            : `${Number(discount.value).toLocaleString()} ֏`}
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          -{amount.toLocaleString()} ֏
                        </p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
