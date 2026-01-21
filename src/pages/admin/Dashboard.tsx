import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Users, Package, ShoppingCart, DollarSign, 
  AlertTriangle, Clock, MapPin, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  avgOrderValue: number;
  activeStaff: number;
  lowStockItems: number;
  menuItems: number;
  locations: number;
}

interface RecentOrder {
  id: string;
  order_number: number;
  total: number;
  status: string;
  created_at: string;
  location_name?: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
  location_name: string;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    avgOrderValue: 0,
    activeStaff: 0,
    lowStockItems: 0,
    menuItems: 0,
    locations: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [hourlyData, setHourlyData] = useState<Array<{ hour: string; orders: number; revenue: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all stats in parallel
      const [
        ordersResult,
        todayOrdersResult,
        menuResult,
        staffResult,
        locationsResult,
        recentOrdersResult,
        inventoryResult,
      ] = await Promise.all([
        supabase.from('orders').select('total, status').eq('status', 'completed'),
        supabase.from('orders').select('total, created_at, status').gte('created_at', today.toISOString()),
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select(`
          id, order_number, total, status, created_at,
          locations(name)
        `).order('created_at', { ascending: false }).limit(5),
        supabase.from('inventory').select(`
          id, quantity,
          ingredients(id, name, min_stock),
          locations(name)
        `),
      ]);

      const totalRevenue = ordersResult.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const todayRevenue = todayOrdersResult.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const todayOrders = todayOrdersResult.data?.length || 0;

      // Process low stock items
      const lowStock: LowStockItem[] = [];
      inventoryResult.data?.forEach((inv: any) => {
        if (inv.ingredients && inv.quantity < (inv.ingredients.min_stock || 0)) {
          lowStock.push({
            id: inv.ingredients.id,
            name: inv.ingredients.name,
            quantity: inv.quantity,
            min_stock: inv.ingredients.min_stock || 0,
            location_name: inv.locations?.name || 'Неизвестно',
          });
        }
      });

      // Process recent orders
      const recent = recentOrdersResult.data?.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        total: o.total,
        status: o.status,
        created_at: o.created_at,
        location_name: o.locations?.name,
      })) || [];

      // Generate hourly data for chart (mock for now, based on today's orders)
      const hourlyStats: Record<string, { orders: number; revenue: number }> = {};
      for (let i = 8; i <= 22; i++) {
        hourlyStats[`${i}:00`] = { orders: 0, revenue: 0 };
      }
      todayOrdersResult.data?.forEach((order: any) => {
        const hour = new Date(order.created_at).getHours();
        const key = `${hour}:00`;
        if (hourlyStats[key]) {
          hourlyStats[key].orders++;
          hourlyStats[key].revenue += Number(order.total);
        }
      });
      const hourlyArray = Object.entries(hourlyStats).map(([hour, data]) => ({
        hour,
        ...data,
      }));

      // Fetch category sales data
      const { data: categoryOrders } = await supabase
        .from('order_items')
        .select(`
          quantity, total_price,
          menu_items(category_id, menu_categories(name))
        `);

      const categoryStats: Record<string, number> = {};
      categoryOrders?.forEach((item: any) => {
        const catName = item.menu_items?.menu_categories?.name || 'Другое';
        categoryStats[catName] = (categoryStats[catName] || 0) + Number(item.total_price);
      });
      const catArray = Object.entries(categoryStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setStats({
        totalOrders: ordersResult.data?.length || 0,
        todayOrders,
        totalRevenue,
        todayRevenue,
        avgOrderValue: todayOrders ? todayRevenue / todayOrders : 0,
        activeStaff: staffResult.count || 0,
        lowStockItems: lowStock.length,
        menuItems: menuResult.count || 0,
        locations: locationsResult.count || 0,
      });
      setRecentOrders(recent);
      setLowStockItems(lowStock.slice(0, 5));
      setHourlyData(hourlyArray);
      setCategoryData(catArray);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₽${value.toLocaleString('ru-RU')}`;
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Ожидает', variant: 'secondary' },
      preparing: { label: 'Готовится', variant: 'default' },
      ready: { label: 'Готов', variant: 'outline' },
      completed: { label: 'Выполнен', variant: 'default' },
      cancelled: { label: 'Отменён', variant: 'destructive' },
    };
    const { label, variant } = variants[status] || { label: status, variant: 'secondary' };
    return <Badge variant={variant}>{label}</Badge>;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Обзор</h1>
          <p className="text-muted-foreground">
            Сводка по {stats.locations} {stats.locations === 1 ? 'точке' : 'точкам'}
          </p>
        </div>
        <Button variant="outline" onClick={fetchAllData}>
          Обновить
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выручка сегодня
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              Всего: {formatCurrency(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заказов сегодня
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">
              Всего: {stats.totalOrders} заказов
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Средний чек
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{formatCurrency(Math.round(stats.avgOrderValue))}</div>
            <p className="text-xs text-muted-foreground">
              За сегодня
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${stats.lowStockItems > 0 ? 'from-red-500/10 to-red-600/5 border-red-500/20' : 'from-gray-500/10 to-gray-600/5 border-gray-500/20'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Мало на складе
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.lowStockItems > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStockItems > 0 ? 'text-red-500' : ''}`}>
              {stats.lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockItems > 0 ? 'Требуется заказ' : 'Всё в норме'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hourly Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Продажи по часам
            </CardTitle>
            <CardDescription>Сегодняшняя активность</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₽${v}`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Sales Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Продажи по категориям
            </CardTitle>
            <CardDescription>Топ-5 категорий</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center w-full">Нет данных о продажах</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Последние заказы
              </CardTitle>
              <CardDescription>5 последних заказов</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/reports')}>
              Все заказы
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">#{order.order_number}</span>
                      </div>
                      <div>
                        <p className="font-medium">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.location_name || 'Точка'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(order.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Нет заказов</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${lowStockItems.length > 0 ? 'text-red-500' : ''}`} />
              Низкие остатки
            </CardTitle>
            <CardDescription>Требуется пополнение</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id + item.location_name} className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.location_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">мин: {item.min_stock}</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => navigate('/admin/inventory')}>
                  Перейти на склад
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <Package className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-muted-foreground">Все остатки в норме</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.activeStaff}</p>
                <p className="text-xs text-muted-foreground">Сотрудников</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.menuItems}</p>
                <p className="text-xs text-muted-foreground">Позиций в меню</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.locations}</p>
                <p className="text-xs text-muted-foreground">Точек продаж</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Всего заказов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
