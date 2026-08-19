import type { Role } from '@stockmok/shared';
import type { ReactNode } from 'react';

import { PermissionDeniedScreen } from '@/features/exceptions/PermissionDeniedScreen';
import { useWorkspace } from '@/services/workspace/useWorkspace';

interface RoleGuardProps {
  readonly allowedRoles: readonly Role[];
  readonly children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { activeRole, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!activeRole || !allowedRoles.includes(activeRole)) {
    return (
      <PermissionDeniedScreen
        message={`Access denied. This view requires one of the following roles: ${allowedRoles.join(', ')}. Your active role is ${activeRole ?? 'UNKNOWN'}.`}
      />
    );
  }

  return <>{children}</>;
}
