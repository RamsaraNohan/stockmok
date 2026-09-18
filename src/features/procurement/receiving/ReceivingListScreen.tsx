import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '@/services/data/useRepositories';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import type { PoStatus } from '@stockmok/shared';

export function ReceivingListScreen() {
  const navigate = useNavigate();
  const repositories = useRepositories();
  const [status, setStatus] = useState<PoStatus>('ORDERED');

  const {
    data: page,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['receivingOrders', status],
    queryFn: async () => {
      if (!repositories) return null;
      return repositories.procurement.listOrders([status]);
    },
    enabled: !!repositories,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Receiving" />
      <div className="p-4 md:p-8">
        <div className="mb-6 flex gap-4">
          <select
            className="h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PoStatus);
            }}
          >
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <ErrorState title="Failed to load orders" message={String(error)} />
        ) : !page?.items.length ? (
          <EmptyState
            title="No orders ready for receiving"
            description={`There are no orders with status ${status.replace('_', ' ').toLowerCase()}.`}
          />
        ) : (
          <div className="bg-surface rounded-panel border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="p-4 font-medium text-text-muted text-sm">PO Number</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Supplier</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Status</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Expected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.items.map((order) => (
                  <tr
                    key={order.purchaseOrderId}
                    className="hover:bg-background cursor-pointer transition-colors"
                    onClick={() => {
                      void navigate(order.purchaseOrderId);
                    }}
                  >
                    <td className="p-4 text-sm font-medium">{order.orderNumber || '-'}</td>
                    <td className="p-4 text-sm text-text-muted">{order.counterpartyName}</td>
                    <td className="p-4 text-sm text-text-muted">{order.status}</td>
                    <td className="p-4 text-sm text-text-muted">
                      {order.expectedDate ? (order.expectedDate as unknown as string) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
