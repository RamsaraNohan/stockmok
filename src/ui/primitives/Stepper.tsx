import { clsx } from 'clsx';
import { Check } from 'lucide-react';

export interface StepItem {
  readonly id: number;
  readonly label: string;
}

export interface StepperProps {
  readonly steps: readonly StepItem[];
  readonly currentStep: number;
  readonly className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={clsx('w-full', className)}>
      <ol className="flex items-center justify-between gap-2 max-md:flex-col max-md:items-start max-md:gap-3">
        {steps.map((step) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-3 max-md:w-full">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors shrink-0',
                    isComplete
                      ? 'bg-primary text-surface'
                      : isCurrent
                        ? 'border-primary text-primary border-2 bg-surface'
                        : 'border-border text-text-muted border bg-background',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? <Check className="size-4" /> : step.id}
                </span>
                <span
                  className={clsx(
                    'text-xs font-bold',
                    isCurrent ? 'text-primary' : isComplete ? 'text-text' : 'text-text-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
