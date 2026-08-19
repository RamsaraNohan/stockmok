import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

export function KpiPanel() {
  const repositories = useRepositories();
  const { activeRole, activeSettings } = useWorkspace();

  const isViewer = activeRole === 'VIEWER';
  const includeProcurement = !isViewer;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'kpis', includeProcurement],
    queryFn: async () => {
      if (!repositories) throw new Error('No repositories');
      return repositories.dashboard.getKpis(includeProcurement);
    },
    enabled: !!repositories,
  });

  const currency = activeSettings?.currency ?? 'USD';

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="There was an error loading key performance indicators."
        title="Failed to load KPIs"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard label="Active SKUs" value={data?.activeSkus ?? 0} />
      <KpiCard label="Low Stock" value={data?.lowStock ?? 0} />
      <KpiCard label="Out of Stock" value={data?.outOfStock ?? 0} />
      <KpiCard
        label="Inventory Value"
        value={formatCurrency(data?.inventoryValueMinor ?? 0, currency)}
      />
      {includeProcurement && (
        <>
          <KpiCard label="Open POs" value={data?.openPurchaseOrders ?? 0} />
          <KpiCard label="Awaiting Receipt" value={data?.awaitingReceipt ?? 0} />
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className="bg-surface border-border rounded-panel flex flex-col border p-4 shadow-sm">
      <span className="text-text-muted text-sm font-medium">{label}</span>
      <span className="text-text mt-2 text-2xl font-bold">{value}</span>
    </div>
  );
}

function formatCurrency(minorUnits: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(minorUnits / 100);
}
