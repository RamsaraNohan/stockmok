import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/services/data/useRepositories';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

export function NeedsAttentionPanel() {
  const repositories = useRepositories();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'needsAttention'],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      return repositories.dashboard.getNeedsAttention();
    },
    enabled: !!repositories,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <ErrorState message="Please try again later." title="Failed to load needs attention items" />
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyState description="No products need attention right now." title="All good!" />;
  }

  return (
    <div className="bg-surface border-border rounded-panel border shadow-sm">
      <div className="border-border border-b p-4 flex items-center justify-between">
        <h3 className="text-text font-bold">Needs Attention</h3>
        <div className="text-text-muted text-sm space-x-4">
          <span>{data.outOfStockCount} out of stock</span>
          <span>{data.lowStockCount} low stock</span>
        </div>
      </div>
      <ul className="divide-border divide-y">
        {data.items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between p-4">
            <div>
              <p className="text-text font-medium">{item.productName}</p>
              <p className="text-text-muted text-sm">{item.internalSkuNormalized}</p>
            </div>
            <div className="text-right">
              <p className="text-text font-medium">{item.onHandMilli / 1000} in stock</p>
              <p className="text-text-muted text-sm">
                Low stock threshold: {item.minimumStockMilli / 1000}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
