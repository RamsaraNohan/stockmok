import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';

import { InventoryByLocationPanel } from './components/InventoryByLocationPanel';
import { KpiPanel } from './components/KpiPanel';
import { NeedsAttentionPanel } from './components/NeedsAttentionPanel';
import { NetworkTasksPanel } from './components/NetworkTasksPanel';
import { RecentMovementsPanel } from './components/RecentMovementsPanel';
import { RecentPurchaseOrdersPanel } from './components/RecentPurchaseOrdersPanel';

export function DashboardScreen() {
  const { activeMembership, activeRole } = useWorkspace();

  const isViewer = activeRole === 'VIEWER';

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={`Welcome back to ${activeMembership?.organizationName || 'workspace'}`}
        title="Dashboard"
      />

      <KpiPanel />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NeedsAttentionPanel />
        <InventoryByLocationPanel />
      </div>

      {!isViewer && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentMovementsPanel />
          <RecentPurchaseOrdersPanel />
        </div>
      )}

      <NetworkTasksPanel />
    </div>
  );
}
