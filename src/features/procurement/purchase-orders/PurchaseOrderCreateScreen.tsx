import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { useAuth } from '@/services/auth/useAuth';
import { useRepositories } from '@/services/data/useRepositories';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { executePrivatePoHeaderCreate } from '@/services/procurement/poService';
import type { PrivatePoHeaderCreatePayload } from '@/services/procurement/poService';

export function PurchaseOrderCreateScreen() {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const { activeOrg, activeSettings } = useWorkspace();
  const { user } = useAuth();
  const repositories = useRepositories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<{ privateSupplierId: string; expectedDate: string }>({
    privateSupplierId: '',
    expectedDate: '',
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      if (!repositories) return null;
      return repositories.partners.listPrivate('SUPPLIER', 'ACTIVE');
    },
    enabled: !!repositories,
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!activeOrg?.organizationId || !user?.uid) return;

    setIsSubmitting(true);
    setError('');

    try {
      const supplier = suppliers?.items.find((s) => s.partnerId === formData.privateSupplierId);
      if (!supplier) throw new Error('Please select a valid supplier');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const payload: PrivatePoHeaderCreatePayload = {
        counterpartyName: supplier.name,
        privateSupplierId: supplier.partnerId,
        currency: activeSettings?.currency ?? 'USD',
        expectedDate: formData.expectedDate ? (formData.expectedDate as any) : undefined,
        totalMinor: 0 as any,
      };
      
      const newPoId = crypto.randomUUID();
      await executePrivatePoHeaderCreate(activeOrg.organizationId, newPoId, payload, user.uid);
      void navigate(`/app/${handle ?? ''}/procurement/purchase-orders/${newPoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader title="Create Purchase Order" />

      <div className="p-4 md:p-8">
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-6"
        >
          {error && <div className="text-error text-sm font-medium">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="supplier">
                Supplier
              </label>
              <select
                id="supplier"
                required
                className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.privateSupplierId}
                onChange={(e) => { setFormData({ ...formData, privateSupplierId: e.target.value }); }}
              >
                <option value="" disabled>Select supplier...</option>
                {suppliers?.items.map((s) => (
                  <option key={s.partnerId} value={s.partnerId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="expected-date">
                Expected Date
              </label>
              <Input
                id="expected-date"
                type="date"
                value={formData.expectedDate}
                onChange={(e) => { setFormData({ ...formData, expectedDate: e.target.value }); }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => { void navigate(-1); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !formData.privateSupplierId}>
              {isSubmitting ? 'Creating...' : 'Create PO'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
