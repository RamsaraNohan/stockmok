import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function CatalogActionLink({
  children,
  to,
  compact = false,
  outline = false,
}: {
  readonly children: ReactNode;
  readonly to: string;
  readonly compact?: boolean;
  readonly outline?: boolean;
}) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 max-md:min-h-[44px] ${
        compact ? 'min-h-9 px-3 py-1.5 text-xs' : 'min-h-10 px-4 py-2 text-sm'
      } ${
        outline
          ? 'border-primary text-primary hover:bg-primary-subtle focus-visible:outline-primary'
          : 'border-primary bg-primary text-surface hover:bg-primary/90 focus-visible:outline-primary'
      }`}
      to={to}
    >
      {children}
    </Link>
  );
}
