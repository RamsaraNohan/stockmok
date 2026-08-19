import { clsx } from 'clsx';

export interface StatusPillProps {
  readonly status: string;
  readonly label?: string;
  readonly variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  readonly className?: string;
}

export function StatusPill({ status, label, variant, className }: StatusPillProps) {
  const displayLabel = label || status.replace(/_/g, ' ');

  const variantMap: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    OWNER: 'bg-blue-100 text-blue-800 border-blue-200',
    ADMIN: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    INVENTORY_MANAGER: 'bg-purple-100 text-purple-800 border-purple-200',
    PROCUREMENT_MANAGER: 'bg-amber-100 text-amber-800 border-amber-200',
    STOREKEEPER: 'bg-teal-100 text-teal-800 border-teal-200',
    ANALYST: 'bg-sky-100 text-sky-800 border-sky-200',
    VIEWER: 'bg-gray-100 text-gray-800 border-gray-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
    REMOVED: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const genericVariantMap: Record<string, string> = {
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const styleClass =
    (variant && genericVariantMap[variant]) ||
    variantMap[status] ||
    'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-bold text-xs capitalize',
        styleClass,
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
