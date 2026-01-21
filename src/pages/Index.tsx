import { useState, useEffect } from "react";
import { 
  UtensilsCrossed, 
  ClipboardList, 
  Users, 
  Warehouse, 
  BarChart3, 
  Settings,
  ChefHat,
  CreditCard,
  Calendar,
  Bell
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  onClick?: () => void;
}

const ModuleCard = ({ icon, title, description, badge, badgeVariant = "default", onClick }: ModuleCardProps) => (
  <Card 
    className="glass p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:glow-primary active:scale-[0.98] group"
    onClick={onClick}
  >
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-xl bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          {badge && (
            <Badge variant={badgeVariant} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>
    </div>
  </Card>
);

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("ru-RU", { 
    hour: "2-digit", 
    minute: "2-digit" 
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("ru-RU", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const modules = [
    {
      icon: <ClipboardList size={24} />,
      title: "Заказы",
      description: "Управление заказами и чеками",
      badge: "12 активных",
      badgeVariant: "default" as const,
    },
    {
      icon: <UtensilsCrossed size={24} />,
      title: "Меню",
      description: "Блюда, категории и цены",
    },
    {
      icon: <ChefHat size={24} />,
      title: "Кухня",
      description: "Очередь приготовления",
      badge: "5 в работе",
      badgeVariant: "secondary" as const,
    },
    {
      icon: <Users size={24} />,
      title: "Персонал",
      description: "Сотрудники и смены",
    },
    {
      icon: <Warehouse size={24} />,
      title: "Склад",
      description: "Ингредиенты и остатки",
      badge: "3 мало",
      badgeVariant: "destructive" as const,
    },
    {
      icon: <Calendar size={24} />,
      title: "Столы",
      description: "Бронирование и рассадка",
    },
    {
      icon: <CreditCard size={24} />,
      title: "Касса",
      description: "Платежи и закрытие смены",
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Отчёты",
      description: "Аналитика и статистика",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <UtensilsCrossed className="text-primary-foreground" size={22} />
              </div>
              <div>
                <h1 className="font-bold text-lg">RestoManager</h1>
                <p className="text-xs text-muted-foreground">Смена открыта</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse-glow" />
              </button>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Settings size={20} />
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{currentTime}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("ru-RU", { 
                    day: "numeric", 
                    month: "short" 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="glass p-4 text-center">
            <p className="text-2xl font-bold text-accent">₽ 45,230</p>
            <p className="text-xs text-muted-foreground">Выручка</p>
          </Card>
          <Card className="glass p-4 text-center">
            <p className="text-2xl font-bold">28</p>
            <p className="text-xs text-muted-foreground">Заказов</p>
          </Card>
          <Card className="glass p-4 text-center">
            <p className="text-2xl font-bold">₽ 1,615</p>
            <p className="text-xs text-muted-foreground">Ср. чек</p>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <ModuleCard
              key={index}
              icon={module.icon}
              title={module.title}
              description={module.description}
              badge={module.badge}
              badgeVariant={module.badgeVariant}
              onClick={() => console.log(`Открыть: ${module.title}`)}
            />
          ))}
        </div>
      </div>

      {/* Install Banner */}
      <InstallBanner />
    </div>
  );
};

const InstallBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 glass border-t border-border/50 animate-slide-in">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Установить приложение</p>
          <p className="text-sm text-muted-foreground">Работайте офлайн как с обычной программой</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setDismissed(true)}
            className="px-4 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
          >
            Позже
          </button>
          <button 
            onClick={handleInstall}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Установить
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
