import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '@/services/data/useRepositories';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import type { PartnerStatus } from '@stockmok/shared';

export function PartnerListScreen({ partnerType }: { partnerType: 'SUPPLIER' | 'BUYER' }) {
  const navigate = useNavigate();
  const repositories = useRepositories();
  const [status, setStatus] = useState<PartnerStatus>('ACTIVE');

  const {
    data: page,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['partners', partnerType, status],
    queryFn: async () => {
      if (!repositories) return null;
      return repositories.partners.listPrivate(partnerType, status);
    },
    enabled: !!repositories,
  });

  const title = partnerType === 'SUPPLIER' ? 'Suppliers' : 'Buyers';

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={title}
        actions={
          <Button onClick={() => { void navigate('new'); }} variant="primary">
            Add {partnerType === 'SUPPLIER' ? 'Supplier' : 'Buyer'}
          </Button>
        }
      />
      <div className="p-4 md:p-8">
        <div className="mb-6 flex gap-4">
          <select
            className="h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none"
            value={status}
            onChange={(e) => { setStatus(e.target.value as PartnerStatus); }}
          >
            <option value="ACTIVE">Active</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <ErrorState title={`Failed to load ${title.toLowerCase()}`} message={String(error)} />
        ) : !page?.items.length ? (
          <EmptyState
            title={`No ${title.toLowerCase()} found`}
            description={`Get started by adding your first ${title.toLowerCase().slice(0, -1)}.`}
            action={
              <Button onClick={() => { void navigate('new'); }} variant="primary">
                Add {partnerType === 'SUPPLIER' ? 'Supplier' : 'Buyer'}
              </Button>
            }
          />
        ) : (
          <div className="bg-surface rounded-panel border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="p-4 font-medium text-text-muted text-sm">Name</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Contact Person</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Email</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Phone</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Orders Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.items.map((partner) => (
                  <tr
                    key={partner.partnerId}
                    className="hover:bg-background cursor-pointer transition-colors"
                    onClick={() => { void navigate(partner.partnerId); }}
                  >
                    <td className="p-4 text-sm font-medium">{partner.name}</td>
                    <td className="p-4 text-sm text-text-muted">{partner.contactPerson || '-'}</td>
                    <td className="p-4 text-sm text-text-muted">{partner.email || '-'}</td>
                    <td className="p-4 text-sm text-text-muted">{partner.phone || '-'}</td>
                    <td className="p-4 text-sm text-text-muted">{partner.ordersPlacedCount}</td>
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
