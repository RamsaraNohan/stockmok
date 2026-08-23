import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';

import { PurchaseOrderReport } from './PurchaseOrderReport';
import { StockOnHandReport } from './StockOnHandReport';

export interface ReportsScreenProps {
  readonly purchaseOrderReport?: ReactNode;
}

const PURCHASE_ORDER_REPORT_ROLES = new Set([
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'ANALYST',
]);

export function ReportsScreen({ purchaseOrderReport }: ReportsScreenProps) {
  const { activeRole } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const canViewPurchaseOrders = activeRole ? PURCHASE_ORDER_REPORT_ROLES.has(activeRole) : false;
  const purchaseOrdersRequested = requestedTab === 'purchase-orders';
  const activeTab = purchaseOrdersRequested ? 'purchase-orders' : 'stock-on-hand';

  const selectTab = (tab: 'stock-on-hand' | 'purchase-orders') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <PageHeader breadcrumbs={[{ label: 'Dashboard' }, { label: 'Reports' }]} title="Reports" />

        <div
          aria-label="Report type"
          className="mb-6 flex gap-6 border-b border-border"
          role="tablist"
        >
          <button
            aria-controls="stock-on-hand-panel"
            aria-selected={activeTab === 'stock-on-hand'}
            className="min-h-11 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary aria-selected:border-primary aria-selected:text-primary"
            id="stock-on-hand-tab"
            onClick={() => {
              selectTab('stock-on-hand');
            }}
            role="tab"
            type="button"
          >
            Stock on Hand
          </button>
          {canViewPurchaseOrders ? (
            <button
              aria-controls="purchase-orders-panel"
              aria-selected={activeTab === 'purchase-orders'}
              className="min-h-11 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary aria-selected:border-primary aria-selected:text-primary"
              id="purchase-orders-tab"
              onClick={() => {
                selectTab('purchase-orders');
              }}
              role="tab"
              type="button"
            >
              Purchase Orders
            </button>
          ) : null}
        </div>

        {purchaseOrdersRequested ? (
          canViewPurchaseOrders ? (
            <div
              aria-labelledby="purchase-orders-tab"
              id="purchase-orders-panel"
              role="tabpanel"
              tabIndex={0}
            >
              {purchaseOrderReport ?? <PurchaseOrderReport />}
            </div>
          ) : (
            <section
              aria-labelledby="report-permission-heading"
              className="rounded-panel border border-border bg-surface p-6"
              role="alert"
            >
              <h2 className="text-lg font-bold text-text" id="report-permission-heading">
                Purchase-order report unavailable
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Your current role can use the Stock on Hand report only.
              </p>
            </section>
          )
        ) : (
          <div
            aria-labelledby="stock-on-hand-tab"
            id="stock-on-hand-panel"
            role="tabpanel"
            tabIndex={0}
          >
            <StockOnHandReport />
          </div>
        )}
      </div>
    </div>
  );
}
