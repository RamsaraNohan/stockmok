import type { ReactNode } from 'react';

import { NotFoundScreen } from '@/features/exceptions/NotFoundScreen';
import { PermissionDeniedScreen } from '@/features/exceptions/PermissionDeniedScreen';
import { NETWORK_ROLES } from '@/services/network/networkAccess';
import { useWorkspace } from '@/services/workspace/useWorkspace';

export function NetworkFeatureGuard({ children }: { readonly children: ReactNode }) {
  const { activeRole, activeSettings, isWorkspaceDataLoading } = useWorkspace();

  if (isWorkspaceDataLoading) {
    return (
      <div
        aria-label="Loading workspace settings"
        className="bg-background flex min-h-[60vh] items-center justify-center"
        role="status"
      >
        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!activeRole || !NETWORK_ROLES.includes(activeRole as (typeof NETWORK_ROLES)[number])) {
    return (
      <PermissionDeniedScreen message="Your active role does not include access to Network." />
    );
  }

  if (!activeSettings?.networkEnabled) {
    return <NotFoundScreen message="The requested page could not be found or is not enabled." />;
  }

  return <>{children}</>;
}
