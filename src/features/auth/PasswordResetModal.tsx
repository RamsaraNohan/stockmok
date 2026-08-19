import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { requestPasswordReset } from '@/services/auth/authService';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';

const resetSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export interface PasswordResetModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setErrorMsg(null);
    try {
      await requestPasswordReset(data.email);
      setIsSuccess(true);
    } catch {
      // Neutral completion to avoid account enumeration
      setIsSuccess(true);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMsg(null);
    reset();
    onClose();
  };

  return (
    <Modal
      description="Enter your registered account email to receive a password reset link."
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset your password"
    >
      {isSuccess ? (
        <div className="flex flex-col gap-4 py-2">
          <div className="bg-green-50 border-green-200 text-green-800 rounded-lg border p-4 text-xs font-semibold">
            If an account exists with that email address, a password reset link has been sent.
            Please check your inbox.
          </div>
          <Button onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          {errorMsg && (
            <div className="bg-red-50 border-red-200 text-red-700 rounded-lg border p-3 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <Input
            error={errors.email?.message}
            label="Account Email"
            placeholder="user@company.com"
            required
            type="email"
            {...register('email')}
          />

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="ghost" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button isLoading={isSubmitting} type="submit">
              Send Reset Link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
