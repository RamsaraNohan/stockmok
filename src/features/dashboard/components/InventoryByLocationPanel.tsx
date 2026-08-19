import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { EmptyState } from '@/ui/primitives/EmptyState';

export function InventoryByLocationPanel() {
  const repositories = useRepositories();
  const { activeSettings } = useWorkspace();
  const currency = activeSettings?.currency ?? 'USD';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'inventoryByLocation'],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      const warehouses = await repositories.settings.listWarehouses('ACTIVE');
      if (warehouses.items.length === 0) return [];
      
      const warehouseIds = warehouses.items.map(w => w.warehouseId);
      const totals = await repositories.dashboard.getInventoryByLocation(warehouseIds);
      
      return totals.map(t => ({
        warehouseName: warehouses.items.find(w => w.warehouseId === t.warehouseId)?.name ?? 'Unknown',
        stockValueMinor: t.stockValueMinor,
      }));
    },
    enabled: !!repositories,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <ErrorState
        message="Please try again later."
        title="Failed to load inventory by location"
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        description="No active warehouses found."
        title="No Locations"
      />
    );
  }

  return (
    <div className="bg-surface border-border rounded-panel border shadow-sm">
      <div className="border-border border-b p-4">
        <h3 className="text-text font-bold">Value by Location</h3>
      </div>
      <ul className="divide-border divide-y">
        {data.map((location, i) => (
          <li key={i} className="flex items-center justify-between p-4">
            <span className="text-text font-medium">{location.warehouseName}</span>
            <span className="text-text font-bold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(location.stockValueMinor / 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
