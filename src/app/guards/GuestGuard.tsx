import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/services/auth/useAuth';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { ErrorState } from '@/ui/primitives/ErrorState';

export function GuestGuard({ children }: { readonly children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    memberships,
    membershipsError,
    isLoading: isWsLoading,
    refreshMemberships,
  } = useWorkspace();

  if (isAuthLoading || (user && isWsLoading)) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    // A failed read is not evidence of zero memberships — never let it
    // masquerade as "route to onboarding."
    if (membershipsError) {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <ErrorState
            message="We could not confirm your workspace access. Please try again."
            onRetry={() => {
              void refreshMemberships();
            }}
            title="Workspace lookup failed"
          />
        </div>
      );
    }
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
