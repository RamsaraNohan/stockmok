import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { useRepositories } from '@/services/data/useRepositories';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { ErrorState } from '@/ui/primitives/ErrorState';
import {
  executePartnerUpdate,
  executePartnerSetStatusCommand,
} from '@/services/procurement/partnerService';
import type { PartnerUpdatePayload } from '@/services/procurement/partnerService';
import type { PartnerStatus } from '@stockmok/shared';

import { useAuth } from '@/services/auth/useAuth';

export function PartnerDetailScreen() {
  const { partnerId } = useParams<{ handle: string; partnerId: string }>();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    data: partner,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: async () => {
      if (!repositories || !partnerId) return null;
      return repositories.partners.getPrivate(partnerId);
    },
    enabled: !!repositories && !!partnerId,
  });

  const { data: openOrders, isLoading: openOrdersLoading } = useQuery({
    queryKey: ['partner-open-orders', partnerId],
    queryFn: async () => {
      if (!repositories || !partnerId) return null;
      return repositories.partners.listOpenOrders(partnerId);
    },
    enabled: !!repositories && !!partnerId,
  });

  const { data: orderHistory, isLoading: orderHistoryLoading } = useQuery({
    queryKey: ['partner-order-history', partnerId],
    queryFn: async () => {
      if (!repositories || !partnerId) return null;
      return repositories.partners.listOrderHistory(partnerId);
    },
    enabled: !!repositories && !!partnerId,
  });

  const [formData, setFormData] = useState<PartnerUpdatePayload>({});

  useEffect(() => {
    if (partner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: partner.name,
        contactPerson: partner.contactPerson || '',
        email: partner.email || '',
        phone: partner.phone || '',
        address: partner.address || '',
        notes: partner.notes || '',
      });
    }
  }, [partner]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!activeOrg?.organizationId || !user?.uid || !partnerId) return;

    setIsSubmitting(true);
    setError('');

    try {
      await executePartnerUpdate(activeOrg.organizationId, partnerId, formData, user.uid);
      await queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: PartnerStatus) => {
    if (!activeOrg?.organizationId || !partnerId) return;
    setIsSubmitting(true);
    try {
      await executePartnerSetStatusCommand(activeOrg.organizationId, partnerId, newStatus);
      await queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !partner)
    return <ErrorState title="Failed to load partner" message={String(loadError)} />;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader
        title={partner.name}
        actions={
          <div className="flex gap-2">
            {partner.status === 'ACTIVE' ? (
              <Button
                onClick={() => void handleStatusChange('DEACTIVATED')}
                variant="secondary"
                disabled={isSubmitting}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                onClick={() => void handleStatusChange('ACTIVE')}
                variant="secondary"
                disabled={isSubmitting}
              >
                Activate
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-6"
        >
          {error && <div className="text-error text-sm font-medium">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="name">
                Name
              </label>
              <Input
                id="name"
                required
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="contact">
                Contact Person
              </label>
              <Input
                id="contact"
                value={formData.contactPerson || ''}
                onChange={(e) => {
                  setFormData({ ...formData, contactPerson: e.target.value });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="phone">
                Phone
              </label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="address">
                Address
              </label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="notes">
                Notes
              </label>
              <Input
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => {
                  setFormData({ ...formData, notes: e.target.value });
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        <div className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-4">
          <h2 className="text-lg font-medium">Open Orders</h2>
          {openOrdersLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : openOrders?.items.length ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="p-4 font-medium text-text-muted text-sm">PO Number</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Status</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {openOrders.items.map((order) => (
                  <tr key={order.purchaseOrderId} className="hover:bg-background transition-colors">
                    <td className="p-4 text-sm font-medium">{order.orderNumber || 'Draft'}</td>
                    <td className="p-4 text-sm text-text-muted">{order.status}</td>
                    <td className="p-4 text-sm text-text-muted">
                      {order.totalMinor / 100} {order.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-sm text-text-muted">No open orders.</div>
          )}
        </div>

        <div className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-4">
          <h2 className="text-lg font-medium">Order History</h2>
          {orderHistoryLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : orderHistory?.items.length ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="p-4 font-medium text-text-muted text-sm">PO Number</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Status</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orderHistory.items.map((order) => (
                  <tr key={order.purchaseOrderId} className="hover:bg-background transition-colors">
                    <td className="p-4 text-sm font-medium">{order.orderNumber || 'Draft'}</td>
                    <td className="p-4 text-sm text-text-muted">{order.status}</td>
                    <td className="p-4 text-sm text-text-muted">
                      {order.totalMinor / 100} {order.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-sm text-text-muted">No order history.</div>
          )}
        </div>
      </div>
    </div>
  );
}
