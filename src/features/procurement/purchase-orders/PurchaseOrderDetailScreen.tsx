import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { useRepositories } from '@/services/data/useRepositories';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { executePoOrderCommand, executePoCancelCommand } from '@/services/procurement/poService';

export function PurchaseOrderDetailScreen() {
  const { poId } = useParams<{ handle: string; poId: string }>();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeOrg } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    data: order,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ['order', poId],
    queryFn: async () => {
      if (!repositories || !poId) return null;
      return repositories.procurement.getOrder(poId);
    },
    enabled: !!repositories && !!poId,
  });

  const handleOrder = async () => {
    if (!activeOrg?.organizationId || !poId) return;
    setIsSubmitting(true);
    try {
      await executePoOrderCommand(activeOrg.organizationId, poId);
      await queryClient.invalidateQueries({ queryKey: ['order', poId] });
      await queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to order PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeOrg?.organizationId || !poId) return;
    setIsSubmitting(true);
    try {
      await executePoCancelCommand(activeOrg.organizationId, poId);
      await queryClient.invalidateQueries({ queryKey: ['order', poId] });
      await queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  if (isError || !order) return <ErrorState title="Failed to load order" message={String(loadError)} />;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      <PageHeader
        title={order.orderNumber || 'Draft PO'}
        actions={
          <div className="flex gap-2">
            {order.status === 'DRAFT' && (
              <>
                <Button onClick={() => { void handleCancel(); }} variant="secondary" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={() => { void handleOrder(); }} variant="primary" disabled={isSubmitting}>
                  Order
                </Button>
              </>
            )}
            {order.status === 'ORDERED' && (
              <Button onClick={() => { void handleCancel(); }} variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        {error && <div className="text-error text-sm font-medium">{error}</div>}

        <div className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-4">
          <h2 className="text-lg font-medium">Order Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Supplier:</span>
              <div className="font-medium">{order.counterpartyName}</div>
            </div>
            <div>
              <span className="text-text-muted">Status:</span>
              <div className="font-medium">{order.status}</div>
            </div>
            <div>
              <span className="text-text-muted">Total:</span>
              <div className="font-medium">{order.totalMinor / 100} {order.currency}</div>
            </div>
            <div>
              <span className="text-text-muted">Expected:</span>
              <div className="font-medium">{order.expectedDate ? String(order.expectedDate) : '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
