import { useState, useEffect } from 'react';
import { FileText, Printer, Banknote, CreditCard, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ZReportData {
  date: Date;
  locationName: string;
  cashierName: string;
  totalOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  otherRevenue: number;
  avgCheck: number;
  paymentBreakdown: { method: string; amount: number; count: number }[];
}

interface ZReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  userName: string;
  onConfirm: () => void;
}

export function ZReportDialog({
  open,
  onOpenChange,
  locationId,
  userName,
  onConfirm,
}: ZReportDialogProps) {
  const [reportData, setReportData] = useState<ZReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [discrepancy, setDiscrepancy] = useState(0);

  useEffect(() => {
    if (open) {
      fetchReportData();
      setActualCash('');
      setDiscrepancy(0);
    }
  }, [open, locationId]);

  useEffect(() => {
    if (reportData && actualCash) {
      const actual = parseFloat(actualCash) || 0;
      setDiscrepancy(actual - reportData.cashRevenue);
    }
  }, [actualCash, reportData]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersRes, locationRes, paymentMethodsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('total, payment_method, status')
          .eq('location_id', locationId)
          .gte('created_at', today.toISOString())
          .eq('status', 'completed'),
        supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single(),
        supabase
          .from('payment_methods')
          .select('code, name')
          .eq('is_active', true),
      ]);

      const orders = ordersRes.data || [];
      const paymentMethods = paymentMethodsRes.data || [];

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      
      // Build payment breakdown
      const breakdown = paymentMethods.map(pm => {
        const methodOrders = orders.filter(o => o.payment_method === pm.code);
        return {
          method: pm.name,
          amount: methodOrders.reduce((sum, o) => sum + Number(o.total), 0),
          count: methodOrders.length,
        };
      }).filter(b => b.count > 0);

      const cashRevenue = orders
        .filter(o => o.payment_method === 'cash')
        .reduce((sum, o) => sum + Number(o.total), 0);
      
      const cardRevenue = orders
        .filter(o => o.payment_method === 'card')
        .reduce((sum, o) => sum + Number(o.total), 0);

      setReportData({
        date: new Date(),
        locationName: locationRes.data?.name || 'Точка',
        cashierName: userName,
        totalOrders,
        totalRevenue,
        cashRevenue,
        cardRevenue,
        otherRevenue: totalRevenue - cashRevenue - cardRevenue,
        avgCheck: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        paymentBreakdown: breakdown,
      });
    } catch (error) {
      console.error('Error fetching Z-report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const printZReport = () => {
    if (!reportData) return;

    const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Z-Отчёт</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 80mm; }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .header h1 { font-size: 16px; margin-bottom: 5px; }
    .section { margin: 10px 0; padding: 10px 0; border-bottom: 1px dashed #000; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .row.bold { font-weight: bold; font-size: 14px; }
    .row.highlight { background: #f0f0f0; padding: 5px; margin: 5px -5px; }
    .discrepancy { margin: 10px 0; padding: 10px; border: 2px solid ${discrepancy === 0 ? '#22c55e' : '#ef4444'}; }
    .discrepancy.ok { color: #22c55e; }
    .discrepancy.error { color: #ef4444; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; }
    .signature { margin-top: 30px; border-top: 1px solid #000; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Z-ОТЧЁТ</h1>
    <p>ЗАКРЫТИЕ СМЕНЫ</p>
  </div>
  
  <div class="section">
    <div class="row"><span>Дата:</span><span>${format(reportData.date, 'dd.MM.yyyy')}</span></div>
    <div class="row"><span>Время:</span><span>${format(reportData.date, 'HH:mm:ss')}</span></div>
    <div class="row"><span>Точка:</span><span>${reportData.locationName}</span></div>
    <div class="row"><span>Кассир:</span><span>${reportData.cashierName}</span></div>
  </div>
  
  <div class="section">
    <div class="row bold"><span>ИТОГО ЗА СМЕНУ</span></div>
    <div class="row"><span>Заказов:</span><span>${reportData.totalOrders}</span></div>
    <div class="row"><span>Средний чек:</span><span>${Math.round(reportData.avgCheck).toLocaleString()} ֏</span></div>
    <div class="row bold highlight"><span>ВЫРУЧКА:</span><span>${reportData.totalRevenue.toLocaleString()} ֏</span></div>
  </div>
  
  <div class="section">
    <div class="row bold"><span>ПО СПОСОБАМ ОПЛАТЫ</span></div>
    ${reportData.paymentBreakdown.map(b => `
      <div class="row"><span>${b.method} (${b.count}):</span><span>${b.amount.toLocaleString()} ֏</span></div>
    `).join('')}
  </div>
  
  <div class="discrepancy ${discrepancy === 0 ? 'ok' : 'error'}">
    <div class="row bold"><span>КОНТРОЛЬ КАССЫ</span></div>
    <div class="row"><span>Наличные по системе:</span><span>${reportData.cashRevenue.toLocaleString()} ֏</span></div>
    <div class="row"><span>Фактически в кассе:</span><span>${parseFloat(actualCash || '0').toLocaleString()} ֏</span></div>
    <div class="row bold"><span>${discrepancy >= 0 ? 'ИЗЛИШЕК:' : 'НЕДОСТАЧА:'}</span><span>${Math.abs(discrepancy).toLocaleString()} ֏</span></div>
  </div>
  
  <div class="signature">
    <div class="row"><span>Кассир:</span><span>________________</span></div>
    <div class="row"><span>Менеджер:</span><span>________________</span></div>
  </div>
  
  <div class="footer">
    <p>*** КОНЕЦ Z-ОТЧЁТА ***</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=350,height=800');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleConfirm = () => {
    printZReport();
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Z-Отчёт (Закрытие смены)
          </DialogTitle>
          <DialogDescription>
            {format(new Date(), 'dd MMMM yyyy', { locale: ru })} • {userName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-2">Загрузка данных...</p>
          </div>
        ) : reportData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-sm text-muted-foreground">Заказов</p>
                  <p className="text-2xl font-bold">{reportData.totalOrders}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 text-center">
                  <p className="text-sm text-muted-foreground">Выручка</p>
                  <p className="text-2xl font-bold text-primary">{reportData.totalRevenue.toLocaleString()} ֏</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Breakdown */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">По способам оплаты</p>
                {reportData.paymentBreakdown.map((b, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {b.method.toLowerCase().includes('наличн') ? (
                        <Banknote className="h-4 w-4 text-green-600" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      )}
                      <span>{b.method}</span>
                      <span className="text-muted-foreground text-sm">({b.count})</span>
                    </div>
                    <span className="font-semibold">{b.amount.toLocaleString()} ֏</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cash Control */}
            <Card className="border-2">
              <CardContent className="p-4 space-y-4">
                <p className="font-medium">Контроль наличных</p>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">По системе:</span>
                  <span className="font-semibold">{reportData.cashRevenue.toLocaleString()} ֏</span>
                </div>

                <div className="space-y-2">
                  <Label>Фактически в кассе</Label>
                  <Input
                    type="number"
                    placeholder="Введите сумму..."
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                  />
                </div>

                {actualCash && (
                  <Alert variant={discrepancy === 0 ? 'default' : 'destructive'}>
                    <div className="flex items-center gap-2">
                      {discrepancy === 0 ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : discrepancy > 0 ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {discrepancy === 0 ? (
                          'Касса сходится!'
                        ) : discrepancy > 0 ? (
                          `Излишек: ${discrepancy.toLocaleString()} ֏`
                        ) : (
                          `Недостача: ${Math.abs(discrepancy).toLocaleString()} ֏`
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="outline" onClick={printZReport} disabled={!reportData}>
            <Printer className="h-4 w-4 mr-2" />
            Печать Z-отчёта
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!actualCash}>
            Закрыть смену
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
