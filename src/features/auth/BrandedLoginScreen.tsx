import { zodResolver } from '@hookform/resolvers/zod';
import type { OrganizationDirectory } from '@stockmok/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { fetchMembershipsForUserFromServer, loginWithEmail } from '@/services/auth/authService';
import { fetchDirectoryByHandle } from '@/services/workspace/workspaceService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Monogram } from '@/ui/primitives/Monogram';
import { NotFoundScreen } from '@/features/exceptions/NotFoundScreen';

const brandedLoginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type BrandedLoginFormData = z.infer<typeof brandedLoginSchema>;

export function BrandedLoginScreen() {
  const { handle } = useParams<{ readonly handle: string }>();
  const navigate = useNavigate();
  const { refreshMemberships } = useWorkspace();

  const [dir, setDir] = useState<OrganizationDirectory | null>(null);
  const [isLoadingDir, setIsLoadingDir] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) {
      return;
    }

    let isMounted = true;
    void fetchDirectoryByHandle(handle)
      .then((data) => {
        if (isMounted) setDir(data);
      })
      .catch(() => {
        if (isMounted) setDir(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDir(false);
      });

    return () => {
      isMounted = false;
    };
  }, [handle]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BrandedLoginFormData>({
    resolver: zodResolver(brandedLoginSchema),
  });

  if (!handle) {
    return <NotFoundScreen message="Invalid organization handle." />;
  }

  if (isLoadingDir) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!dir) {
    return <NotFoundScreen message={`Organization "@${handle}" was not found in the directory.`} />;
  }

  const onSubmit = async (data: BrandedLoginFormData) => {
    setAuthError(null);
    let user;
    try {
      user = await loginWithEmail(data.email, data.password);
    } catch {
      setAuthError('Invalid credentials. Please verify your email and password.');
      return;
    }

    try {
      // Forced-server read: see fetchMembershipsForUserFromServer — a "not a
      // member" conclusion here must be authoritative, not a possibly-
      // premature empty read from cache.
      const list = await fetchMembershipsForUserFromServer(user.uid);
      void refreshMemberships();
      const match = list.find((m) => m.handle.toLowerCase() === handle.toLowerCase());
      if (match) {
        void navigate(`/app/${match.handle}/dashboard`);
      } else {
        setAuthError(`Your account is not an active member of ${dir.name}.`);
      }
    } catch {
      setAuthError('We could not confirm your workspace access. Please try again.');
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface border-border w-full max-w-md rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="text-center">
          <Monogram color={dir.monogramColor} size="lg" text={dir.monogram} />
          <h1 className="text-text mt-4 text-2xl font-bold">{dir.name}</h1>
          <p className="text-text-muted mt-1 text-xs font-mono font-semibold">@{dir.handle}</p>
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

          <Input
            error={errors.password?.message}
            label="Password"
            required
            type="password"
            {...register('password')}
          />

          <Button className="mt-2 w-full" isLoading={isSubmitting} type="submit">
            Sign In to {dir.name}
          </Button>
        </form>

        <p className="text-text-muted mt-6 text-center text-xs">
          Looking for global login?{' '}
          <Link className="text-primary font-bold hover:underline" to="/login">
            Go to Stockmok Login
          </Link>
        </p>
      </div>
    </div>
  );
}
