import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button';

export interface ErrorStateProps {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly action?: ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <div className="bg-red-50/50 border-red-200 flex flex-col items-center justify-center rounded-panel border p-8 text-center max-md:p-6">
      <AlertCircle className="text-red-600 mb-3 size-10" />
      <h3 className="text-red-950 text-lg font-bold">{title}</h3>
      <p className="text-red-800 mt-2 max-w-md text-sm leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        {onRetry && (
          <Button variant="danger" onClick={onRetry}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
