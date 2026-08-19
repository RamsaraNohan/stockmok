import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { loginWithEmail } from '@/services/auth/authService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';

import { PasswordResetModal } from './PasswordResetModal';

const signInSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignInFormData = z.infer<typeof signInSchema>;

export function SignInScreen() {
  const navigate = useNavigate();
  const { refreshMemberships } = useWorkspace();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setAuthError(null);
    try {
      await loginWithEmail(data.email, data.password);
      const list = await refreshMemberships();
      const first = list[0];
      if (list.length === 0 || !first) {
        void navigate('/onboarding');
      } else if (list.length === 1) {
        void navigate(`/app/${first.handle}/dashboard`);
      } else {
        void navigate('/select-workspace');
      }
    } catch {
      setAuthError('Invalid email or password. Please check your credentials and try again.');
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface border-border w-full max-w-md rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="text-center">
          <div className="bg-primary text-surface inline-grid size-12 place-items-center rounded-xl font-extrabold text-xl">
            S
          </div>
          <h1 className="text-text mt-4 text-2xl font-bold">Sign in to Stockmok</h1>
          <p className="text-text-muted mt-1 text-sm">
            Access your multi-tenant inventory workspace
          </p>
        </div>

        {authError && (
          <div className="bg-red-50 border-red-200 text-red-700 mt-6 rounded-lg border p-3 text-xs font-semibold">
            {authError}
          </div>
        )}

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <Input
            error={errors.email?.message}
            label="Email Address"
            placeholder="user@company.com"
            required
            type="email"
            {...register('email')}
          />

          <div className="flex flex-col gap-1">
            <Input
              error={errors.password?.message}
              label="Password"
              required
              type="password"
              {...register('password')}
            />
            <div className="flex justify-end">
              <button
                className="text-primary hover:underline text-xs font-bold cursor-pointer"
                type="button"
                onClick={() => {
                  setIsResetOpen(true);
                }}
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button className="mt-2 w-full" isLoading={isSubmitting} type="submit">
            Sign In
          </Button>
        </form>

        <p className="text-text-muted mt-6 text-center text-xs">
          Don&apos;t have a workspace account?{' '}
          <Link className="text-primary font-bold hover:underline" to="/signup">
            Sign up
          </Link>
        </p>
      </div>

      <PasswordResetModal
        isOpen={isResetOpen}
        onClose={() => {
          setIsResetOpen(false);
        }}
      />
    </div>
  );
}
