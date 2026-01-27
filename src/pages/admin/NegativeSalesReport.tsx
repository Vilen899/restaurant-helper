import { useState, useEffect } from 'react';
import { Calendar, TrendingDown, AlertTriangle, Package, MapPin, Download, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface NegativeSaleItem {
  id: string;
  order_number: number;
  order_date: string;
  location_name: string;
  menu_item_name: string;
  quantity_sold: number;
  ingredient_name: string;
  stock_before: number;
  stock_after: number;
  unit_abbr: string;
}

export default function NegativeSalesReport() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [reportData, setReportData] = useState<NegativeSaleItem[]>([]);
  const [search, setSearch] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalNegativeSales: 0,
    totalNegativeIngredients: 0,
    mostAffectedIngredient: '',
    mostAffectedLocation: '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [period, selectedLocation]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setLocations(data || []);
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
    }
    
    return { start: startDate.toISOString(), end: now.toISOString() };
  };

  const fetchReportData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Получаем все движения со статусом "sale" где количество ушло в минус
      let movementsQuery = supabase
        .from('inventory_movements')
        .select(`
          id,
          quantity,
          created_at,
          reference_id,
          ingredient:ingredients(id, name, unit:units(abbreviation)),
          location:locations(id, name)
        `)
        .eq('movement_type', 'sale')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (selectedLocation !== 'all') {
        movementsQuery = movementsQuery.eq('location_id', selectedLocation);
      }

      const { data: movements, error: movementsError } = await movementsQuery;
      
      if (movementsError) throw movementsError;

      // Получаем текущие остатки для всех ингредиентов
      let inventoryQuery = supabase
        .from('inventory')
        .select('ingredient_id, location_id, quantity');
      
      if (selectedLocation !== 'all') {
        inventoryQuery = inventoryQuery.eq('location_id', selectedLocation);
      }

      const { data: inventory } = await inventoryQuery;

      // Находим продажи, которые привели к минусовым остаткам
      // Проверяем текущий остаток + списанное количество = остаток до продажи
      const negativeItems: NegativeSaleItem[] = [];
      const ingredientCounts = new Map<string, number>();
      const locationCounts = new Map<string, number>();

      for (const movement of movements || []) {
        const ing = movement.ingredient as any;
        const loc = movement.location as any;
        
        if (!ing || !loc) continue;

        // Находим текущий остаток
        const currentInv = inventory?.find(
          i => i.ingredient_id === ing.id && i.location_id === loc.id
        );
        const currentQty = currentInv ? Number(currentInv.quantity) : 0;
        
        // Вычисляем примерный остаток до этой продажи
        // Это приблизительно, т.к. могли быть другие движения
        const qtyDeducted = Number(movement.quantity);
        
        // Если текущий остаток < 0 или остаток после списания был бы < 0
        if (currentQty < 0) {
          // Получаем информацию о заказе
          let orderInfo = { order_number: 0, menu_item_name: 'Неизвестно' };
          
          if (movement.reference_id) {
            const { data: order } = await supabase
              .from('orders')
              .select('order_number')
              .eq('id', movement.reference_id)
              .maybeSingle();
            
            if (order) {
              orderInfo.order_number = order.order_number;
            }
          }

          negativeItems.push({
            id: movement.id,
            order_number: orderInfo.order_number,
            order_date: movement.created_at,
            location_name: loc.name,
            menu_item_name: orderInfo.menu_item_name,
            quantity_sold: qtyDeducted,
            ingredient_name: ing.name,
            stock_before: currentQty + qtyDeducted,
            stock_after: currentQty,
            unit_abbr: ing.unit?.abbreviation || '',
          });

          // Статистика
          ingredientCounts.set(ing.name, (ingredientCounts.get(ing.name) || 0) + 1);
          locationCounts.set(loc.name, (locationCounts.get(loc.name) || 0) + 1);
        }
      }

      // Определяем самый проблемный ингредиент и локацию
      let mostAffectedIng = '';
      let maxIngCount = 0;
      ingredientCounts.forEach((count, name) => {
        if (count > maxIngCount) {
          maxIngCount = count;
          mostAffectedIng = name;
        }
      });

      let mostAffectedLoc = '';
      let maxLocCount = 0;
      locationCounts.forEach((count, name) => {
        if (count > maxLocCount) {
          maxLocCount = count;
          mostAffectedLoc = name;
        }
      });

      setReportData(negativeItems);
      setStats({
        totalNegativeSales: negativeItems.length,
        totalNegativeIngredients: ingredientCounts.size,
        mostAffectedIngredient: mostAffectedIng,
        mostAffectedLocation: mostAffectedLoc,
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки отчёта');
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация по поиску
  const filteredData = reportData.filter(item =>
    !search ||
    item.ingredient_name.toLowerCase().includes(search.toLowerCase()) ||
    item.location_name.toLowerCase().includes(search.toLowerCase())
  );

  // Экспорт в CSV
  const exportToCSV = () => {
    const headers = ['Дата', 'Заказ', 'Локация', 'Ингредиент', 'Списано', 'Ед.', 'Остаток до', 'Остаток после'];
    const rows = filteredData.map(item => [
      format(new Date(item.order_date), 'dd.MM.yyyy HH:mm'),
      `#${item.order_number}`,
      item.location_name,
      item.ingredient_name,
      item.quantity_sold.toFixed(3),
      item.unit_abbr,
      item.stock_before.toFixed(3),
      item.stock_after.toFixed(3),
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `negative_sales_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Отчёт экспортирован');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Минусовые продажи</h1>
          <p className="text-muted-foreground">Продажи, которые привели к отрицательным остаткам</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все точки</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV} disabled={filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Минусовых списаний
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.totalNegativeSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ингредиентов в минусе
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNegativeIngredients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Проблемный ингредиент
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats.mostAffectedIngredient || '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Проблемная точка
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats.mostAffectedLocation || '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по ингредиенту или точке..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>История минусовых продаж</CardTitle>
          <CardDescription>
            Все продажи, которые привели к отрицательному остатку ингредиентов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {reportData.length === 0
                ? 'Нет минусовых продаж за выбранный период'
                : 'Ничего не найдено'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Заказ</TableHead>
                  <TableHead>Точка</TableHead>
                  <TableHead>Ингредиент</TableHead>
                  <TableHead className="text-right">Списано</TableHead>
                  <TableHead className="text-right">Было</TableHead>
                  <TableHead className="text-right">Стало</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="bg-destructive/5">
                    <TableCell className="font-medium">
                      {format(new Date(item.order_date), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      {item.order_number ? `#${item.order_number}` : '—'}
                    </TableCell>
                    <TableCell>{item.location_name}</TableCell>
                    <TableCell>{item.ingredient_name}</TableCell>
                    <TableCell className="text-right">
                      −{item.quantity_sold.toFixed(3)} {item.unit_abbr}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item.stock_before < 0 ? 'text-destructive' : ''}>
                        {item.stock_before.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-mono">
                        {item.stock_after.toFixed(3)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
