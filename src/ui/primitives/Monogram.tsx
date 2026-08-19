import { clsx } from 'clsx';

export interface MonogramProps {
  readonly text: string;
  readonly color?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

export function Monogram({ text, color, size = 'md', className }: MonogramProps) {
  const displayInitials = (text || 'SM').substring(0, 2).toUpperCase();

  const sizeClasses = {
    sm: 'size-6 text-xs',
    md: 'size-8 text-sm',
    lg: 'size-12 text-lg',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-extrabold rounded-lg text-white select-none shrink-0',
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color || '#1D4ED8' }}
      aria-hidden="true"
    >
      {displayInitials}
    </span>
  );
}
