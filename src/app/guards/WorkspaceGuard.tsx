import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { PermissionDeniedScreen } from '@/features/exceptions/PermissionDeniedScreen';
import { useWorkspace } from '@/services/workspace/useWorkspace';

export function WorkspaceGuard({ children }: { readonly children: ReactNode }) {
  const { handle } = useParams<{ readonly handle: string }>();
  const { setActiveHandle, activeMembership, isLoading: isWsLoading } = useWorkspace();
  const [isResolving, setIsResolving] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!handle) {
      queueMicrotask(() => {
        if (isMounted) {
          setHasPermission(false);
          setIsResolving(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }

    const resolveWorkspace = async () => {
      const success = await setActiveHandle(handle);
      if (isMounted) {
        setHasPermission(success);
        setIsResolving(false);
      }
    };

    void resolveWorkspace();

    return () => {
      isMounted = false;
    };
  }, [handle, setActiveHandle]);

  if (isWsLoading || isResolving) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (hasPermission === false || !activeMembership) {
    return (
      <PermissionDeniedScreen message="You do not have access to this organization workspace." />
    );
  }

  if (activeMembership.status !== 'ACTIVE') {
    return (
      <PermissionDeniedScreen message="Your membership in this organization is suspended or inactive." />
    );
  }

  return <>{children}</>;
}
