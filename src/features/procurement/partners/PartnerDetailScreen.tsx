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
import { executePartnerUpdate, executePartnerSetStatusCommand } from '@/services/procurement/partnerService';
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
      // Show success msg or just leave
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

  if (isLoading) return <div className='p-8'><Skeleton className='h-64 w-full' /></div>;
  if (isError || !partner) return <ErrorState title='Failed to load partner' message={String(loadError)} />;

  return (
    <div className='flex flex-col h-full max-w-3xl mx-auto w-full'>
      <PageHeader
        title={partner.name}
        actions={
          <div className='flex gap-2'>
            {partner.status === 'ACTIVE' ? (
              <Button onClick={() => void handleStatusChange('DEACTIVATED')} variant='secondary' disabled={isSubmitting}>
                Deactivate
              </Button>
            ) : (
              <Button onClick={() => void handleStatusChange('ACTIVE')} variant='secondary' disabled={isSubmitting}>
                Activate
              </Button>
            )}
          </div>
        }
      />

      <div className='p-4 md:p-8 space-y-6'>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className='bg-surface p-6 rounded-panel border border-border shadow-sm space-y-6'
        >
          {error && <div className='text-error text-sm font-medium'>{error}</div>}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='col-span-2'>
              <label className='block text-sm font-medium text-text mb-1' htmlFor='name'>
                Name
              </label>
              <Input
                id='name'
                required
                value={formData.name || ''}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
              />
            </div>
            
            <div>
              <label className='block text-sm font-medium text-text mb-1' htmlFor='contact'>
                Contact Person
              </label>
              <Input
                id='contact'
                value={formData.contactPerson || ''}
                onChange={(e) => { setFormData({ ...formData, contactPerson: e.target.value }); }}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-text mb-1' htmlFor='email'>
                Email
              </label>
              <Input
                id='email'
                type='email'
                value={formData.email || ''}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); }}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-text mb-1' htmlFor='phone'>
                Phone
              </label>
              <Input
                id='phone'
                value={formData.phone || ''}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); }}
              />
            </div>

            <div className='col-span-2'>
              <label className='block text-sm font-medium text-text mb-1' htmlFor='address'>
                Address
              </label>
              <Input
                id='address'
                value={formData.address || ''}
                onChange={(e) => { setFormData({ ...formData, address: e.target.value }); }}
              />
            </div>

            <div className='col-span-2'>
              <label className='block text-sm font-medium text-text mb-1' htmlFor='notes'>
                Notes
              </label>
              <Input
                id='notes'
                value={formData.notes || ''}
                onChange={(e) => { setFormData({ ...formData, notes: e.target.value }); }}
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-6 border-t border-border'>
            <Button type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
        
        {/* Open orders section could go here later using Q-039 / Q-040 */}
      </div>
    </div>
  );
}

