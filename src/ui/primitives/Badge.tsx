import { clsx } from 'clsx';

export interface BadgeProps {
  readonly count: number;
  readonly isCapped?: boolean;
  readonly className?: string;
}

export function Badge({ count, isCapped = false, className }: BadgeProps) {
  if (count <= 0) return null;

  const displayText = count >= 50 || isCapped ? '50+' : String(count);

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white min-w-[18px] leading-none',
        className,
      )}
      aria-label={`${displayText} unread notifications`}
    >
      {displayText}
    </span>
  );
}
