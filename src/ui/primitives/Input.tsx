import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string | undefined;
  readonly helperText?: string | undefined;
  readonly error?: string | undefined;
}

export function Input({
  label,
  helperText,
  error,
  id,
  className,
  disabled,
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className="text-text font-bold text-sm" htmlFor={inputId}>
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        aria-invalid={Boolean(error)}
        className={clsx(
          'border-border bg-surface text-text w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[40px] max-md:min-h-[44px]',
          error ? 'border-red-500 focus-visible:outline-red-500' : 'focus-visible:outline-primary',
          disabled && 'bg-background cursor-not-allowed opacity-60',
          className,
        )}
        disabled={disabled}
        id={inputId}
        required={required}
        {...props}
      />
      {error ? (
        <p className="text-red-500 text-xs font-semibold" id={errorId}>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-text-muted text-xs" id={helperId}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
