import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="bg-surface border-border fixed top-1/2 left-1/2 z-50 w-[min(calc(100%-2rem),36rem)] -translate-x-1/2 -translate-y-1/2 rounded-panel border p-6 shadow-2xl focus:outline-none max-md:w-[min(calc(100%-1.5rem),36rem)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-text text-lg font-bold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-text-muted mt-1 text-sm">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                className="text-text-muted hover:text-text focus-visible:outline-primary rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
