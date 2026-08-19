import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/services/auth/useAuth';
import { useWorkspace } from '@/services/workspace/useWorkspace';

export function GuestGuard({ children }: { readonly children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { memberships, isLoading: isWsLoading } = useWorkspace();

  if (isAuthLoading || (user && isWsLoading)) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    const first = memberships[0];
    if (memberships.length === 0) {
      return <Navigate replace to="/onboarding" />;
    }
    if (memberships.length === 1 && first) {
      return <Navigate replace to={`/app/${first.handle}/dashboard`} />;
    }
    return <Navigate replace to="/select-workspace" />;
  }

  return <>{children}</>;
}
