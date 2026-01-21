import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon, RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

interface ActionButtonProps {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
}

export function ActionButton({ label, icon: Icon, onClick, variant = 'default' }: ActionButtonProps) {
  return (
    <Button variant={variant} onClick={onClick}>
      {Icon && <Icon className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}

export function PageHeader({ title, description, actions, onRefresh, loading }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
