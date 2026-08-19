import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { registerWithEmail } from '@/services/auth/authService';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';

const signUpSchema = z
  .object({
    displayName: z.string().min(1, 'Name is required').max(80, 'Name must be 80 chars or less'),
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpScreen() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setAuthError(null);
    try {
      await registerWithEmail(data.email, data.password);
      void navigate('/onboarding');
    } catch {
      setAuthError(
        'Unable to create account. Please verify your details or sign in if you already have an account.',
      );
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface border-border w-full max-w-md rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="text-center">
          <div className="bg-primary text-surface inline-grid size-12 place-items-center rounded-xl font-extrabold text-xl">
            S
          </div>
          <h1 className="text-text mt-4 text-2xl font-bold">Create your account</h1>
          <p className="text-text-muted mt-1 text-sm">
            Get started with Stockmok multi-tenant workspace
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
            error={errors.displayName?.message}
            label="Full Name"
            placeholder="Jane Doe"
            required
            {...register('displayName')}
          />

          <Input
            error={errors.email?.message}
            label="Work Email"
            placeholder="jane@company.com"
            required
            type="email"
            {...register('email')}
          />

          <Input
            error={errors.password?.message}
            helperText="Must be at least 8 characters"
            label="Password"
            required
            type="password"
            {...register('password')}
          />

          <Input
            error={errors.confirmPassword?.message}
            label="Confirm Password"
            required
            type="password"
            {...register('confirmPassword')}
          />

          <Button className="mt-2 w-full" isLoading={isSubmitting} type="submit">
            Create Account
          </Button>
        </form>

        <p className="text-text-muted mt-6 text-center text-xs">
          Already have an account?{' '}
          <Link className="text-primary font-bold hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
