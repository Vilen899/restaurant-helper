import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UtensilsCrossed,
  LayoutDashboard,
  ChefHat,
  ClipboardList,
  Warehouse,
  Users,
  Settings,
  LogOut,
  Menu,
  MapPin,
  BarChart3,
  Package,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Обзор', roles: ['admin', 'manager'] },
  { path: '/admin/menu', icon: UtensilsCrossed, label: 'Меню', roles: ['admin', 'manager'] },
  { path: '/admin/categories', icon: FolderOpen, label: 'Категории', roles: ['admin', 'manager'] },
  { path: '/admin/recipes', icon: ChefHat, label: 'Рецепты', roles: ['admin', 'manager'] },
  { path: '/admin/ingredients', icon: Package, label: 'Ингредиенты', roles: ['admin', 'manager'] },
  { path: '/admin/inventory', icon: Warehouse, label: 'Склад', roles: ['admin', 'manager'] },
  { path: '/admin/orders', icon: ClipboardList, label: 'Заказы', roles: ['admin', 'manager'] },
  { path: '/admin/staff', icon: Users, label: 'Персонал', roles: ['admin'] },
  { path: '/admin/locations', icon: MapPin, label: 'Точки', roles: ['admin'] },
  { path: '/admin/reports', icon: BarChart3, label: 'Отчёты', roles: ['admin', 'manager'] },
  { path: '/admin/settings', icon: Settings, label: 'Настройки', roles: ['admin'] },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredMenu = menuItems.filter(item => {
    if (isAdmin) return true;
    if (isManager) return item.roles.includes('manager');
    return false;
  });

  const NavItem = ({ item }: { item: typeof menuItems[0] }) => {
    const isActive = location.pathname === item.path;
    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-3',
          !sidebarOpen && 'justify-center px-2'
        )}
        onClick={() => {
          navigate(item.path);
          setMobileMenuOpen(false);
        }}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {sidebarOpen && <span>{item.label}</span>}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <UtensilsCrossed className="text-primary-foreground h-5 w-5" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg">RestoManager</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {filteredMenu.map(item => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="p-4 border-t">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <Separator className="my-3" />
          <Button
            variant="ghost"
            className={cn('w-full justify-start gap-3 text-destructive', !sidebarOpen && 'justify-center px-2')}
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Выйти</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="h-16 flex items-center justify-between px-4 border-b lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <UtensilsCrossed className="text-primary-foreground h-4 w-4" />
            </div>
            <span className="font-bold">RestoManager</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
