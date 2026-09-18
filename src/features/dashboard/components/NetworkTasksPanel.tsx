import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

export function NetworkTasksPanel() {
  const repositories = useRepositories();
  const { activeRole, activeSettings } = useWorkspace();

  const networkEnabled = activeSettings?.networkEnabled ?? false;
  const isPartnerWriter =
    activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'PROCUREMENT_MANAGER';
  const shouldFetch = networkEnabled && isPartnerWriter;

  const {
    data: pendingConnections,
    isLoading: loadingConnections,
    error: errorConnections,
  } = useQuery({
    queryKey: ['dashboard', 'pendingConnections'],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      const res = await repositories.dashboard.getPendingConnections();
      return res.count ?? 0;
    },
    enabled: !!repositories && shouldFetch,
  });

  const {
    data: connectedOrders,
    isLoading: loadingOrders,
    error: errorOrders,
  } = useQuery({
    queryKey: ['dashboard', 'connectedOrdersAwaitingResponse'],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      const res = await repositories.dashboard.getConnectedOrdersAwaitingResponse();
      return res.count ?? 0;
    },
    enabled: !!repositories && shouldFetch,
  });

  if (!shouldFetch) {
    return null;
  }

  if (loadingConnections || loadingOrders) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (errorConnections || errorOrders) {
    return <ErrorState message="Please try again later." title="Failed to load network tasks" />;
  }

  const hasTasks = (pendingConnections ?? 0) > 0 || (connectedOrders ?? 0) > 0;

  if (!hasTasks) {
    return null;
  }

  return (
    <div className="bg-surface border-border rounded-panel border shadow-sm">
      <div className="border-border border-b p-4">
        <h3 className="text-text font-bold">Network Tasks</h3>
      </div>
      <ul className="divide-border divide-y">
        {(pendingConnections ?? 0) > 0 && (
          <li className="flex items-center justify-between p-4">
            <span className="text-text font-medium">Pending Connection Requests</span>
            <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs font-bold">
              {pendingConnections}
            </span>
          </li>
        )}
        {(connectedOrders ?? 0) > 0 && (
          <li className="flex items-center justify-between p-4">
            <span className="text-text font-medium">Connected Orders Awaiting Response</span>
            <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs font-bold">
              {connectedOrders}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
