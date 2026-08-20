import { useQuery } from '@tanstack/react-query';
import type { PoStatus } from '@stockmok/shared';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';

const ALL_PO_STATUSES: readonly PoStatus[] = [
  'DRAFT',
  'ORDERED',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'SHIPPED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
];

export function RecentPurchaseOrdersPanel() {
  const repositories = useRepositories();
  const { activeRole } = useWorkspace();

  const isViewer = activeRole === 'VIEWER';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'recentOrders'],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      return repositories.procurement.listOrders(ALL_PO_STATUSES, { limit: 5 });
    },
    enabled: !!repositories && !isViewer,
  });

  if (isViewer) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return <ErrorState message="Please try again later." title="Failed to load recent orders" />;
  }

  if (!data || data.items.length === 0) {
    return <EmptyState description="No purchase orders found." title="No Orders" />;
  }

  return (
    <div className="bg-surface border-border rounded-panel border shadow-sm">
      <div className="border-border border-b p-4">
        <h3 className="text-text font-bold">Recent Purchase Orders</h3>
      </div>
      <ul className="divide-border divide-y">
        {data.items.slice(0, 5).map((order) => (
          <li key={order.purchaseOrderId} className="flex items-center justify-between p-4">
            <div>
              <p className="text-text font-medium">
                {order.orderNumber ?? order.purchaseOrderId.slice(0, 8)}
              </p>
              <p className="text-text-muted text-sm">{order.counterpartyName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <StatusPill status={order.status} />
              <div className="text-right w-24">
                <p className="text-text font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: order.currency,
                  }).format(order.totalMinor / 100)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
