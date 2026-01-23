import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FileText, Receipt, Printer, Search, Download, Eye, Truck, ClipboardCheck, RotateCcw, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import * as XLSX from 'xlsx';

interface Order {
  id: string;
  order_number: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  location: { name: string } | null;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    menu_item: { name: string } | null;
  }>;
}

interface Supply {
  id: string;
  invoice_number: string | null;
  supplier_name: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  location: { name: string } | null;
}

interface Stocktaking {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  total_items: number;
  items_with_difference: number;
  location: { name: string } | null;
}

interface ZReport {
  id: string;
  date: string;
  location: { name: string } | null;
  total_orders: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  cashier_name: string;
}

export default function DocumentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [stocktakings, setStocktakings] = useState<Stocktaking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliesRes, stocktakingsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, location:locations(name), order_items(quantity, unit_price, menu_item:menu_items(name))')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('supplies')
          .select('*, location:locations(name)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('stocktakings')
          .select('*, location:locations(name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      setOrders((ordersRes.data || []) as Order[]);
      setSupplies((suppliesRes.data || []) as Supply[]);
      setStocktakings((stocktakingsRes.data || []) as Stocktaking[]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки документов');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (order: Order) => {
    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Чек #${order.order_number}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 80mm; }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
    .header h1 { font-size: 18px; margin-bottom: 5px; }
    .info { margin: 10px 0; font-size: 11px; }
    .items { margin: 10px 0; border-bottom: 1px dashed #000; padding-bottom: 10px; }
    .item { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; }
    .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CRUSTY</h1>
    <p>Спасибо за заказ!</p>
  </div>
  <div class="info">
    <div>Чек: #${order.order_number}</div>
    <div>Дата: ${format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</div>
    <div>Точка: ${order.location?.name || '—'}</div>
  </div>
  <div class="items">
    ${order.order_items.map(item => `
      <div class="item">
        <span>${item.menu_item?.name || 'Товар'}</span>
        <span>x${item.quantity} = ${(item.unit_price * item.quantity).toLocaleString()} ֏</span>
      </div>
    `).join('')}
  </div>
  <div class="total">ИТОГО: ${Number(order.total).toLocaleString()} ֏</div>
  <div class="footer">
    <p>Приятного аппетита!</p>
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
      }, 250);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Документы');
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Экспорт завершён');
  };

  const exportOrders = () => {
    const data = filteredOrders.map(o => ({
      'Номер': o.order_number,
      'Дата': format(new Date(o.created_at), 'dd.MM.yyyy HH:mm'),
      'Сумма': Number(o.total),
      'Оплата': o.payment_method === 'cash' ? 'Наличные' : 'Карта',
      'Точка': o.location?.name || '',
    }));
    exportToExcel(data, 'orders');
  };

  const filteredOrders = orders.filter(o =>
    o.order_number.toString().includes(searchTerm) ||
    o.location?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSupplies = supplies.filter(s =>
    s.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStocktakings = stocktakings.filter(s =>
    s.location?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Документы"
        description="Архив всех документов системы"
        onRefresh={fetchDocuments}
        loading={loading}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Чеков" value={orders.length} icon={Receipt} />
        <StatCard title="Поставок" value={supplies.length} icon={Truck} variant="info" />
        <StatCard title="Инвентаризаций" value={stocktakings.length} icon={ClipboardCheck} variant="warning" />
        <StatCard 
          title="Выручка" 
          value={`${orders.reduce((sum, o) => sum + Number(o.total), 0).toLocaleString()} ֏`} 
          icon={FileText} 
          variant="success" 
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по документам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={exportOrders}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт Excel
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <Receipt className="h-4 w-4" />
            Чеки ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="supplies" className="gap-2">
            <Truck className="h-4 w-4" />
            Поставки ({filteredSupplies.length})
          </TabsTrigger>
          <TabsTrigger value="stocktakings" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Инвентаризации ({filteredStocktakings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Оплата</TableHead>
                  <TableHead>Точка</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.order_number}</TableCell>
                    <TableCell>{format(new Date(order.created_at), 'dd.MM.yy HH:mm')}</TableCell>
                    <TableCell className="font-semibold">{Number(order.total).toLocaleString()} ֏</TableCell>
                    <TableCell>
                      <Badge variant={order.payment_method === 'cash' ? 'default' : 'secondary'}>
                        {order.payment_method === 'cash' ? 'Наличные' : 'Карта'}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.location?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => printReceipt(order)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="supplies" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Накладная</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Точка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupplies.map(supply => (
                  <TableRow key={supply.id}>
                    <TableCell className="font-medium">{supply.invoice_number || '—'}</TableCell>
                    <TableCell>{format(new Date(supply.created_at), 'dd.MM.yy HH:mm')}</TableCell>
                    <TableCell>{supply.supplier_name || '—'}</TableCell>
                    <TableCell className="font-semibold">{Number(supply.total_amount).toLocaleString()} ֏</TableCell>
                    <TableCell>
                      <Badge variant={supply.status === 'received' ? 'default' : 'secondary'}>
                        {supply.status === 'received' ? 'Получено' : supply.status === 'pending' ? 'Ожидает' : 'Отменено'}
                      </Badge>
                    </TableCell>
                    <TableCell>{supply.location?.name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stocktakings" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Точка</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead>Расхождений</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocktakings.map(st => (
                  <TableRow key={st.id}>
                    <TableCell>{format(new Date(st.created_at), 'dd.MM.yy HH:mm')}</TableCell>
                    <TableCell>{st.location?.name || '—'}</TableCell>
                    <TableCell>{st.total_items}</TableCell>
                    <TableCell>
                      <Badge variant={st.items_with_difference > 0 ? 'destructive' : 'default'}>
                        {st.items_with_difference}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.status === 'completed' ? 'default' : 'secondary'}>
                        {st.status === 'completed' ? 'Завершена' : 'В процессе'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Чек #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {format(new Date(selectedOrder.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
              </div>
              <div className="border rounded-lg divide-y">
                {selectedOrder.order_items.map((item, i) => (
                  <div key={i} className="p-3 flex justify-between">
                    <span>{item.menu_item?.name} × {item.quantity}</span>
                    <span className="font-medium">{(item.unit_price * item.quantity).toLocaleString()} ֏</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Итого</span>
                <span className="text-primary">{Number(selectedOrder.total).toLocaleString()} ֏</span>
              </div>
              <Button className="w-full gap-2" onClick={() => printReceipt(selectedOrder)}>
                <Printer className="h-4 w-4" />
                Печать чека
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
