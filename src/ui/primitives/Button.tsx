import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-bold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[40px] max-md:min-h-[44px] px-4 py-2 text-sm cursor-pointer';

  const variantClasses = {
    primary: 'bg-primary text-surface hover:bg-primary/90 focus-visible:outline-primary',
    secondary:
      'bg-surface text-text border border-border hover:bg-background focus-visible:outline-border',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
    outline:
      'border border-primary text-primary hover:bg-primary-subtle focus-visible:outline-primary',
    ghost: 'text-text-muted hover:bg-background hover:text-text focus-visible:outline-border',
  };

  const sizeClasses = {
    sm: 'text-xs min-h-[36px] max-md:min-h-[44px] px-3 py-1.5',
    md: 'text-sm min-h-[40px] max-md:min-h-[44px] px-4 py-2',
    lg: 'text-base min-h-[48px] px-6 py-3',
  };

  return (
    <button
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
