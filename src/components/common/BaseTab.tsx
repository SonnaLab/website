import type { ReactNode } from 'react';
import { RefreshCwIcon, AlertTriangleIcon } from '@icons';
import { Button } from '@/components/ui/button';

interface BaseTabProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

export function BaseTab({ loading, error, onRetry, children }: BaseTabProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCwIcon className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-sm text-destructive">
        <AlertTriangleIcon size={18} />
        <p>{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
