import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  activeStaff: number;
  lowStockItems: number;
  menuItems: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    activeStaff: 0,
    lowStockItems: 0,
    menuItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch orders count
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        // Fetch menu items count
        const { count: menuCount } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Fetch active staff
        const { count: staffCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Fetch total revenue
        const { data: ordersData } = await supabase
          .from('orders')
          .select('total')
          .eq('status', 'completed');

        const totalRevenue = ordersData?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

        setStats({
          totalOrders: ordersCount || 0,
          totalRevenue,
          avgOrderValue: ordersCount ? totalRevenue / ordersCount : 0,
          activeStaff: staffCount || 0,
          lowStockItems: 0,
          menuItems: menuCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Выручка сегодня',
      value: `₽ ${stats.totalRevenue.toLocaleString('ru-RU')}`,
      icon: DollarSign,
      change: '+12%',
      positive: true,
    },
    {
      title: 'Заказов',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      change: '+5',
      positive: true,
    },
    {
      title: 'Средний чек',
      value: `₽ ${Math.round(stats.avgOrderValue).toLocaleString('ru-RU')}`,
      icon: TrendingUp,
      change: '+8%',
      positive: true,
    },
    {
      title: 'Сотрудников на смене',
      value: stats.activeStaff.toString(),
      icon: Users,
      change: '',
      positive: true,
    },
    {
      title: 'Позиций в меню',
      value: stats.menuItems.toString(),
      icon: Package,
      change: '',
      positive: true,
    },
    {
      title: 'Мало на складе',
      value: stats.lowStockItems.toString(),
      icon: BarChart3,
      change: stats.lowStockItems > 0 ? 'Требуется заказ' : 'Всё в норме',
      positive: stats.lowStockItems === 0,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Обзор</h1>
        <p className="text-muted-foreground">Сводка по всем точкам</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <p className={`text-xs ${stat.positive ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>Часто используемые функции</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <button className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors">
              ➕ Добавить блюдо в меню
            </button>
            <button className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors">
              📦 Оформить поставку
            </button>
            <button className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors">
              👤 Добавить сотрудника
            </button>
            <button className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors">
              🏪 Добавить точку
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние заказы</CardTitle>
            <CardDescription>За последний час</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Нет заказов за последний час
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
