import type { ReactNode } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="bg-surface border-border flex flex-col items-center justify-center rounded-panel border p-12 text-center max-md:p-6">
      {icon && <div className="text-text-muted mb-4 size-12">{icon}</div>}
      <h3 className="text-text text-lg font-bold">{title}</h3>
      <p className="text-text-muted mt-2 max-w-md text-sm leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
