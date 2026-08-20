import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { executePartnerCreate } from '@/services/procurement/partnerService';
import type { PartnerCreatePayload } from '@/services/procurement/partnerService';

import { useAuth } from '@/services/auth/useAuth';

export function PartnerCreateScreen() {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const location = useLocation();
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Determine type from route
  const partnerType = location.pathname.includes('/buyers') ? 'BUYER' : 'SUPPLIER';

  const [formData, setFormData] = useState<Omit<PartnerCreatePayload, 'partnerTypes'>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!activeOrg?.organizationId || !user?.uid) return;

    setIsSubmitting(true);
    setError('');

    try {
      const payload: PartnerCreatePayload = {
        ...formData,
        partnerTypes: [partnerType],
      };
      const newPartnerId = crypto.randomUUID();
      await executePartnerCreate(activeOrg.organizationId, newPartnerId, payload, user.uid);
      void navigate(`/app/${handle ?? ''}/procurement/${partnerType === 'SUPPLIER' ? 'suppliers' : 'buyers'}/${newPartnerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader title={`Add ${partnerType === 'SUPPLIER' ? 'Supplier' : 'Buyer'}`} />

      <div className="p-4 md:p-8">
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
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="contact">
                Contact Person
              </label>
              <Input
                id="contact"
                value={formData.contactPerson}
                onChange={(e) => { setFormData({ ...formData, contactPerson: e.target.value }); }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="phone">
                Phone
              </label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="address">
                Address
              </label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => { setFormData({ ...formData, address: e.target.value }); }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="notes">
                Notes
              </label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => { setFormData({ ...formData, notes: e.target.value }); }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => { void navigate(-1); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Partner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
