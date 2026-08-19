import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ variant = 'text', className, ...props }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      aria-hidden="true"
      className={clsx('bg-border/60 animate-pulse', variantClasses[variant], className)}
      {...props}
    />
  );
}
