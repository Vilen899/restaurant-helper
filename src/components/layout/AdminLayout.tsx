import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UtensilsCrossed,
  LayoutDashboard,
  ChefHat,
  Warehouse,
  Users,
  LogOut,
  Menu,
  MapPin,
  BarChart3,
  Package,
  FolderOpen,
  Truck,
  FileText,
  Settings,
  ChevronDown,
  Search,
  X,
  Soup,
  CreditCard,
  Clock,
  Printer,
  TrendingDown,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.webp';
import { LanguageSelector } from '@/components/LanguageSelector';

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  roles: string[];
}

interface MenuItem {
  path: string;
  icon: React.ElementType;
  label: string;
  roles: string[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Товары и склады',
    icon: Package,
    roles: ['admin', 'manager'],
    items: [
      { path: '/admin/menu', icon: UtensilsCrossed, label: 'Меню', roles: ['admin', 'manager'] },
      { path: '/admin/categories', icon: FolderOpen, label: 'Категории', roles: ['admin', 'manager'] },
      { path: '/admin/recipes', icon: ChefHat, label: 'Рецепты', roles: ['admin', 'manager'] },
      { path: '/admin/semi-finished', icon: Soup, label: 'Заготовки', roles: ['admin', 'manager'] },
      { path: '/admin/ingredients', icon: Package, label: 'Ингредиенты', roles: ['admin', 'manager'] },
      { path: '/admin/inventory', icon: Warehouse, label: 'Склад', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Складские документы',
    icon: Truck,
    roles: ['admin', 'manager'],
    items: [
      { path: '/admin/goods-receipt', icon: Package, label: 'Приход (MIGO)', roles: ['admin', 'manager'] },
      { path: '/admin/supply-docs', icon: FileText, label: 'Документы поставок', roles: ['admin', 'manager'] },
      { path: '/admin/stock-transfer', icon: Truck, label: 'Перемещение (MB1B)', roles: ['admin', 'manager'] },
      { path: '/admin/transfer-docs', icon: FileText, label: 'Документы перемещений', roles: ['admin', 'manager'] },
      { path: '/admin/physical-inventory', icon: Warehouse, label: 'Инвентаризация (MI01)', roles: ['admin', 'manager'] },
      { path: '/admin/stocktaking-docs', icon: FileText, label: 'Документы инвентаризации', roles: ['admin', 'manager'] },
      { path: '/admin/movement-journal', icon: Clock, label: 'Журнал движений (MB51)', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Отчёты',
    icon: BarChart3,
    roles: ['admin', 'manager'],
    items: [
      { path: '/admin/reports', icon: FileText, label: 'Продажи', roles: ['admin', 'manager'] },
      { path: '/admin/reports/inventory', icon: Warehouse, label: 'Остатки', roles: ['admin', 'manager'] },
      { path: '/admin/reports/negative-sales', icon: TrendingDown, label: 'Минусовые продажи', roles: ['admin', 'manager'] },
      { path: '/admin/documents', icon: FileText, label: 'Документы (чеки)', roles: ['admin', 'manager'] },
      { path: '/admin/work-time', icon: Clock, label: 'Рабочее время', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Настройки',
    icon: Settings,
    roles: ['admin'],
    items: [
      { path: '/admin/staff', icon: Users, label: 'Персонал', roles: ['admin'] },
      { path: '/admin/locations', icon: MapPin, label: 'Точки', roles: ['admin'] },
      { path: '/admin/payment-methods', icon: CreditCard, label: 'Способы оплаты', roles: ['admin'] },
      { path: '/admin/discounts', icon: Package, label: 'Скидки', roles: ['admin'] },
      { path: '/admin/customer-display', icon: Monitor, label: 'Экран покупателя', roles: ['admin'] },
      { path: '/admin/cashier-settings', icon: Clock, label: 'Настройки кассы', roles: ['admin'] },
      { path: '/admin/fiscal-settings', icon: Printer, label: 'Настройки ККТ', roles: ['admin'] },
    ],
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<string[]>(['Товары и склады']);
  const { user, signOut, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const filteredGroups = menuGroups
    .filter(group => {
      if (isAdmin) return true;
      if (isManager) return group.roles.includes('manager');
      return false;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (isAdmin) return true;
        if (isManager) return item.roles.includes('manager');
        return false;
      }).filter(item =>
        !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(group => group.items.length > 0);

  const NavItem = ({ item }: { item: MenuItem }) => {
    const isActive = location.pathname === item.path;
    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size="sm"
        className={cn(
          'w-full justify-start gap-3 h-9',
          isActive && 'bg-primary/10 text-primary border-l-2 border-primary rounded-l-none'
        )}
        onClick={() => {
          navigate(item.path);
          setMobileMenuOpen(false);
        }}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="text-sm">{item.label}</span>
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
        <div className="h-14 flex items-center justify-between px-3 border-b bg-[#1a1a2e]">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-8 w-8 object-contain rounded" />
            {sidebarOpen && (
              <span className="font-bold text-white text-sm">Crusty Admin</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 lg:flex hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по меню..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {/* Dashboard - always visible */}
            <Button
              variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'w-full justify-start gap-3 h-9 mb-2',
                location.pathname === '/admin' && 'bg-primary/10 text-primary'
              )}
              onClick={() => navigate('/admin')}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span className="text-sm">Обзор</span>}
            </Button>

            {/* Menu groups */}
            {filteredGroups.map((group) => (
              <Collapsible
                key={group.label}
                open={openGroups.includes(group.label)}
                onOpenChange={() => toggleGroup(group.label)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-between h-9 text-muted-foreground hover:text-foreground',
                      !sidebarOpen && 'justify-center px-2'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <group.icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen && <span className="text-sm font-medium">{group.label}</span>}
                    </div>
                    {sidebarOpen && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          openGroups.includes(group.label) && 'rotate-180'
                        )}
                      />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 pl-3 border-l border-border/50 space-y-1 py-1">
                    {group.items.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="p-3 border-t bg-muted/30">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name || 'Пользователь'}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || 'admin'}</p>
              </div>
            )}
            {sidebarOpen && (
              <div className="flex items-center gap-1">
                <LanguageSelector />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="h-14 flex items-center justify-between px-4 border-b lg:hidden bg-[#1a1a2e]">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-7 w-7 object-contain rounded" />
            <span className="font-bold text-white text-sm">Crusty Admin</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
