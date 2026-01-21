import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const variantStyles = {
  default: {
    card: 'bg-card hover:bg-muted/50',
    icon: 'bg-muted text-foreground',
    value: 'text-foreground',
  },
  success: {
    card: 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40',
    icon: 'bg-green-500/20 text-green-500',
    value: 'text-green-500',
  },
  warning: {
    card: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 hover:border-amber-500/40',
    icon: 'bg-amber-500/20 text-amber-500',
    value: 'text-amber-500',
  },
  danger: {
    card: 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/40',
    icon: 'bg-red-500/20 text-red-500',
    value: 'text-red-500',
  },
  info: {
    card: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40',
    icon: 'bg-blue-500/20 text-blue-500',
    value: 'text-blue-500',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-default',
        styles.card,
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className={cn('text-2xl font-bold mt-1', styles.value)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-xs mt-1 flex items-center gap-1',
                  trend.value >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
