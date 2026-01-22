import { useState, useEffect } from 'react';
import { LogOut, TrendingUp, Hash, Banknote, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface ShiftSummary {
  totalOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  otherRevenue: number;
  avgOrderValue: number;
}

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
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchShiftSummary();
    }
  }, [open, locationId]);

  const fetchShiftSummary = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, payment_method, status')
        .eq('location_id', locationId)
        .gte('created_at', today.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const cashRevenue = orders?.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const cardRevenue = orders?.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const otherRevenue = totalRevenue - cashRevenue - cardRevenue;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setSummary({
        totalOrders,
        totalRevenue,
        cashRevenue,
        cardRevenue,
        otherRevenue,
        avgOrderValue,
      });
    } catch (error) {
      console.error('Error fetching shift summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    // Update shift end time if tracking shifts
    try {
      const { data: openShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .is('ended_at', null)
        .single();

      if (openShift) {
        await supabase
          .from('shifts')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', openShift.id);
      }
    } catch (error) {
      console.error('Error closing shift:', error);
    }

    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            Закрытие смены
          </DialogTitle>
          <DialogDescription>
            Кассир: {userName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-2">Загрузка итогов...</p>
          </div>
        ) : summary && (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="font-medium">Выручка за смену</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {summary.totalRevenue.toLocaleString()} ֏
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Заказов</p>
                    <p className="text-xl font-bold">{summary.totalOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Средний чек</p>
                    <p className="text-xl font-bold">{Math.round(summary.avgOrderValue).toLocaleString()} ֏</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-sm text-muted-foreground">Разбивка по оплате</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span>Наличные</span>
                    </div>
                    <span className="font-semibold">{summary.cashRevenue.toLocaleString()} ֏</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span>Карта</span>
                    </div>
                    <span className="font-semibold">{summary.cardRevenue.toLocaleString()} ֏</span>
                  </div>
                  {summary.otherRevenue > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Другое</span>
                      <span className="font-semibold">{summary.otherRevenue.toLocaleString()} ֏</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmClose}
            className="flex-1 gap-2"
          >
            <LogOut className="h-4 w-4" />
            Закрыть смену
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
