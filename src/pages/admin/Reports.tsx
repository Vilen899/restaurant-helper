import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, ShoppingCart, MapPin, ChefHat } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type Location = Tables<'locations'>;
type MenuItem = Tables<'menu_items'>;

interface OrderWithLocation extends Order {
  location?: Location;
}

interface PopularItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface LocationSales {
  name: string;
  revenue: number;
  orders: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  
  // Chart data
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [locationSales, setLocationSales] = useState<LocationSales[]>([]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [period, selectedLocation]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
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
      // Build query
      let ordersQuery = supabase
        .from('orders')
        .select('*, location:locations(*)')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);

      if (selectedLocation !== 'all') {
        ordersQuery = ordersQuery.eq('location_id', selectedLocation);
      }

      const { data: orders } = await ordersQuery;

      if (!orders || orders.length === 0) {
        setTotalRevenue(0);
        setTotalOrders(0);
        setAvgOrderValue(0);
        setDailySales([]);
        setPopularItems([]);
        setLocationSales([]);
        setLoading(false);
        return;
      }

      // Calculate totals
      const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const ordersCount = orders.length;
      
      setTotalRevenue(revenue);
      setTotalOrders(ordersCount);
      setAvgOrderValue(ordersCount > 0 ? revenue / ordersCount : 0);

      // Daily sales
      const dailyMap = new Map<string, { revenue: number; orders: number }>();
      orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
        dailyMap.set(date, {
          revenue: existing.revenue + Number(order.total),
          orders: existing.orders + 1,
        });
      });
      setDailySales(Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
      })));

      // Location sales
      const locationMap = new Map<string, { name: string; revenue: number; orders: number }>();
      orders.forEach(order => {
        const locName = (order as OrderWithLocation).location?.name || 'Неизвестно';
        const existing = locationMap.get(locName) || { name: locName, revenue: 0, orders: 0 };
        locationMap.set(locName, {
          name: locName,
          revenue: existing.revenue + Number(order.total),
          orders: existing.orders + 1,
        });
      });
      setLocationSales(Array.from(locationMap.values()));

      // Popular items
      const orderIds = orders.map(o => o.id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, menu_item:menu_items(*)')
        .in('order_id', orderIds);

      const itemsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      orderItems?.forEach(item => {
        const name = (item as any).menu_item?.name || 'Неизвестно';
        const existing = itemsMap.get(name) || { name, quantity: 0, revenue: 0 };
        itemsMap.set(name, {
          name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.total_price),
        });
      });
      
      const sortedItems = Array.from(itemsMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      setPopularItems(sortedItems);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки отчётов');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold">Отчёты</h1>
          <p className="text-muted-foreground">Аналитика продаж и статистика</p>
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
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выручка
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽{totalRevenue.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заказов
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Средний чек
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽{Math.round(avgOrderValue).toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Продажи</TabsTrigger>
          <TabsTrigger value="popular">Популярные блюда</TabsTrigger>
          <TabsTrigger value="locations">По точкам</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Динамика продаж</CardTitle>
              <CardDescription>Выручка и количество заказов по дням</CardDescription>
            </CardHeader>
            <CardContent>
              {dailySales.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Нет данных за выбранный период
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? `₽${value.toLocaleString()}` : value,
                        name === 'revenue' ? 'Выручка' : 'Заказов'
                      ]}
                    />
                    <Legend formatter={(value) => value === 'revenue' ? 'Выручка' : 'Заказов'} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="revenue" />
                    <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="orders" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Топ-10 блюд
                </CardTitle>
                <CardDescription>По количеству продаж</CardDescription>
              </CardHeader>
              <CardContent>
                {popularItems.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Блюдо</TableHead>
                        <TableHead className="text-right">Продано</TableHead>
                        <TableHead className="text-right">Выручка</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {popularItems.map((item, index) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₽{item.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Распределение продаж</CardTitle>
                <CardDescription>Доля каждого блюда в выручке</CardDescription>
              </CardHeader>
              <CardContent>
                {popularItems.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={popularItems.slice(0, 6)}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {popularItems.slice(0, 6).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₽${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Выручка по точкам
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locationSales.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={locationSales} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value: number) => `₽${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Детализация по точкам</CardTitle>
              </CardHeader>
              <CardContent>
                {locationSales.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Точка</TableHead>
                        <TableHead className="text-right">Заказов</TableHead>
                        <TableHead className="text-right">Выручка</TableHead>
                        <TableHead className="text-right">Ср. чек</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationSales.map(loc => (
                        <TableRow key={loc.name}>
                          <TableCell className="font-medium">{loc.name}</TableCell>
                          <TableCell className="text-right">{loc.orders}</TableCell>
                          <TableCell className="text-right">₽{loc.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            ₽{Math.round(loc.revenue / loc.orders).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
