import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/services/data/useRepositories';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';

export function RecentMovementsPanel() {
  const repositories = useRepositories();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'recentMovements'],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      return repositories.dashboard.listRecentMovements();
    },
    enabled: !!repositories,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return <ErrorState message="Please try again later." title="Failed to load recent movements" />;
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState description="No stock movements recorded recently." title="No Recent Movements" />
    );
  }

  return (
    <div className="bg-surface border-border rounded-panel border shadow-sm">
      <div className="border-border border-b p-4">
        <h3 className="text-text font-bold">Recent Movements</h3>
      </div>
      <ul className="divide-border divide-y">
        {data.items.slice(0, 5).map((movement) => (
          <li key={movement.movementId} className="flex items-center justify-between p-4">
            <div>
              <p className="text-text font-medium">{movement.productNameSnapshot}</p>
              <p className="text-text-muted text-sm">
                {movement.createdAt.toDate().toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <StatusPill
                status={movement.movementType}
                variant={
                  movement.movementType.includes('IN') ||
                  movement.movementType === 'PURCHASE_RECEIPT'
                    ? 'success'
                    : movement.movementType.includes('OUT')
                      ? 'danger'
                      : 'info'
                }
              />
              <div className="text-right w-16">
                <p className="text-text font-medium">{movement.signedQuantityMilli / 1000}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
