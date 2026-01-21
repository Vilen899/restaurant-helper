import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || 'outline'}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          className="gap-2"
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success';
}

const cardVariants = {
  default: 'bg-card hover:bg-muted/50 border-border',
  primary: 'bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40',
  success: 'bg-green-500/5 hover:bg-green-500/10 border-green-500/20 hover:border-green-500/40',
};

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'default',
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border text-left transition-all duration-200 hover:scale-[1.02]',
        cardVariants[variant]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          variant === 'primary' && 'bg-primary/20 text-primary',
          variant === 'success' && 'bg-green-500/20 text-green-500',
          variant === 'default' && 'bg-muted text-foreground'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}
