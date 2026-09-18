import type { QueryCursor } from '@stockmok/data';
import type { PurchaseOrder } from '@stockmok/shared';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';

import { useRepositories } from '@/services/data/useRepositories';
import {
  buildPurchaseOrderReportCsv,
  describePurchaseOrderReportFilters,
  loadPurchaseOrderReportPage,
  loadPurchaseOrderStatusCounts,
  PURCHASE_ORDER_STATUS_FAMILIES,
  purchaseOrderDateFilters,
  type PurchaseOrderReportFilters,
  type PurchaseOrderStatusFamily,
} from '@/services/reports/reportService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

const PurchaseOrderStatusChart = lazy(() => import('./PurchaseOrderStatusChart'));
const PAGE_SIZE = 25;

interface FilterFormState {
  readonly statusFamily?: PurchaseOrderStatusFamily;
  readonly supplierKind?: 'PRIVATE' | 'CONNECTED';
  readonly fromDate?: string;
  readonly toDate?: string;
}

function changeFilter(
  current: FilterFormState,
  patch: Partial<FilterFormState>,
  clearKey?: keyof FilterFormState,
): FilterFormState {
  const next = { ...current, ...patch };
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  if (clearKey) delete next[clearKey];
  return next;
}

function toRepositoryFilters(filters: FilterFormState): PurchaseOrderReportFilters {
  return {
    ...(filters.statusFamily ? { statusFamily: filters.statusFamily } : {}),
    ...(filters.supplierKind ? { supplierKind: filters.supplierKind } : {}),
    ...purchaseOrderDateFilters(filters.fromDate, filters.toDate),
  };
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function formatDate(value: PurchaseOrder['createdAt'] | undefined): string {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value.toDate())
    : '—';
}

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function statusClass(status: PurchaseOrder['status']): string {
  if (status === 'RECEIVED') return 'bg-success/10 text-success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-danger/10 text-danger';
  if (status === 'DRAFT') return 'bg-background text-text-muted';
  if (status === 'ORDERED' || status === 'SUBMITTED') return 'bg-warning-subtle text-warning';
  return 'bg-primary-subtle text-primary';
}

export function PurchaseOrderReport() {
  const repositories = useRepositories();
  const { activeMembership } = useWorkspace();
  const orgId = activeMembership?.organizationId;
  const [draftFilters, setDraftFilters] = useState<FilterFormState>({});
  const [filters, setFilters] = useState<FilterFormState>({});
  const [dateError, setDateError] = useState<string>();
  const [cursor, setCursor] = useState<QueryCursor<PurchaseOrder>>();
  const [cursorHistory, setCursorHistory] = useState<
    readonly (QueryCursor<PurchaseOrder> | undefined)[]
  >([]);
  const repositoryFilters = useMemo(() => toRepositoryFilters(filters), [filters]);

  const reportQuery = useQuery({
    queryKey: [
      'purchase-order-report',
      orgId,
      filters.statusFamily ?? '',
      filters.supplierKind ?? '',
      filters.fromDate ?? '',
      filters.toDate ?? '',
      cursor?.signature ?? '',
      cursor?.snapshot.id ?? '',
    ],
    queryFn: async () => {
      if (!repositories) throw new Error('Report data is not available.');
      return loadPurchaseOrderReportPage(repositories, repositoryFilters, {
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });
    },
    enabled: Boolean(repositories && orgId),
  });

  const countsQuery = useQuery({
    queryKey: [
      'purchase-order-report-status-counts',
      orgId,
      filters.statusFamily ?? '',
      filters.supplierKind ?? '',
      filters.fromDate ?? '',
      filters.toDate ?? '',
    ],
    queryFn: async () => {
      if (!repositories) throw new Error('Report data is not available.');
      return loadPurchaseOrderStatusCounts(repositories, repositoryFilters);
    },
    enabled: Boolean(repositories && orgId),
  });

  const rows = reportQuery.data?.items ?? [];
  const counts = countsQuery.data ?? [];
  const filterDescription = describePurchaseOrderReportFilters(repositoryFilters);

  const resetPaging = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const applyFilters = () => {
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setDateError('The start date must be on or before the end date.');
      return;
    }
    setDateError(undefined);
    setFilters(draftFilters);
    resetPaging();
  };

  const clearFilters = () => {
    setDateError(undefined);
    setDraftFilters({});
    setFilters({});
    resetPaging();
  };

  const exportCurrentPage = () => {
    const csv = buildPurchaseOrderReportCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'purchase-orders.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const showPreviousPage = () => {
    setCursor(cursorHistory.at(-1));
    setCursorHistory(cursorHistory.slice(0, -1));
  };

  const showNextPage = () => {
    const next = reportQuery.data?.nextCursor;
    if (!next) return;
    setCursorHistory([...cursorHistory, cursor]);
    setCursor(next);
  };

  return (
    <section aria-labelledby="purchase-order-report-heading" className="space-y-5">
      <div className="flex items-start justify-between gap-4 max-md:flex-col">
        <div>
          <h2 className="text-xl font-bold text-text" id="purchase-order-report-heading">
            Purchase Orders
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Private and connected orders visible to your organization.
          </p>
        </div>
        <div className="hidden md:block">
          <Button
            aria-label="Export current purchase-order report page as CSV"
            disabled={rows.length === 0 || reportQuery.isFetching}
            onClick={exportCurrentPage}
            variant="outline"
          >
            <Download aria-hidden="true" className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <form
        className="grid gap-4 rounded-panel border border-border bg-surface p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted" htmlFor="po-status">
            Status
          </label>
          <select
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary max-md:h-11"
            id="po-status"
            onChange={(event) => {
              const value = event.target.value;
              setDraftFilters((current) =>
                value
                  ? changeFilter(current, { statusFamily: value as PurchaseOrderStatusFamily })
                  : changeFilter(current, {}, 'statusFamily'),
              );
            }}
            value={draftFilters.statusFamily ?? ''}
          >
            <option value="">All statuses</option>
            {PURCHASE_ORDER_STATUS_FAMILIES.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted" htmlFor="po-kind">
            Kind
          </label>
          <select
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary max-md:h-11"
            id="po-kind"
            onChange={(event) => {
              const value = event.target.value;
              setDraftFilters((current) =>
                value
                  ? changeFilter(current, { supplierKind: value as 'PRIVATE' | 'CONNECTED' })
                  : changeFilter(current, {}, 'supplierKind'),
              );
            }}
            value={draftFilters.supplierKind ?? ''}
          >
            <option value="">All kinds</option>
            <option value="PRIVATE">Private</option>
            <option value="CONNECTED">Connected</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted" htmlFor="po-from">
            From date
          </label>
          <input
            aria-describedby={dateError ? 'po-date-error' : undefined}
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary max-md:h-11"
            id="po-from"
            onChange={(event) => {
              const fromDate = event.target.value;
              setDraftFilters((current) =>
                fromDate
                  ? changeFilter(current, { fromDate })
                  : changeFilter(current, {}, 'fromDate'),
              );
            }}
            type="date"
            value={draftFilters.fromDate ?? ''}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted" htmlFor="po-to">
            To date
          </label>
          <input
            aria-describedby={dateError ? 'po-date-error' : undefined}
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary max-md:h-11"
            id="po-to"
            onChange={(event) => {
              const toDate = event.target.value;
              setDraftFilters((current) =>
                toDate ? changeFilter(current, { toDate }) : changeFilter(current, {}, 'toDate'),
              );
            }}
            type="date"
            value={draftFilters.toDate ?? ''}
          />
        </div>

        {dateError ? (
          <p
            className="text-sm text-danger md:col-span-2 xl:col-span-4"
            id="po-date-error"
            role="alert"
          >
            {dateError}
          </p>
        ) : null}

        <div className="flex gap-2 max-md:flex-col md:col-span-2 xl:col-span-4">
          <Button type="submit">Apply filters</Button>
          <Button onClick={clearFilters} type="button" variant="ghost">
            Clear filters
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
        {reportQuery.isLoading ? (
          <div aria-label="Loading purchase-order report" className="space-y-3 p-6">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <div className="p-6">
            <ErrorState
              message={
                reportQuery.error instanceof Error
                  ? reportQuery.error.message
                  : 'The purchase-order report could not be loaded.'
              }
              onRetry={() => void reportQuery.refetch()}
              title="Report unavailable"
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              action={
                <Button onClick={clearFilters} type="button" variant="secondary">
                  Clear filters
                </Button>
              }
              description="No purchase orders match these filters."
              title="No purchase orders"
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <caption className="sr-only">
                  Purchase orders matching the selected status, date, and kind filters
                </caption>
                <thead className="border-b border-border bg-background/50">
                  <tr>
                    {[
                      'PO Number',
                      'Counterparty',
                      'Private/Connected',
                      'Status',
                      'Total',
                      'Created',
                      'Expected',
                    ].map((heading) => (
                      <th
                        className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted ${heading === 'Total' ? 'text-right' : ''}`}
                        key={heading}
                        scope="col"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr className="hover:bg-background/50" key={row.purchaseOrderId}>
                      <th className="px-4 py-3 text-sm font-medium text-text" scope="row">
                        {row.orderNumber ?? row.purchaseOrderId}
                      </th>
                      <td className="px-4 py-3 text-sm text-text">{row.counterpartyName}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {row.supplierKind === 'CONNECTED' ? 'Connected' : 'Private'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status)}`}
                        >
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-text">
                        {formatMoney(row.totalMinor, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {formatDate(row.expectedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {rows.map((row) => (
                <article
                  aria-label={row.orderNumber ?? row.purchaseOrderId}
                  className="space-y-3 p-4"
                  key={row.purchaseOrderId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-text">
                        {row.orderNumber ?? row.purchaseOrderId}
                      </h3>
                      <p className="text-sm text-text-muted">{row.counterpartyName}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status)}`}
                    >
                      {formatStatus(row.status)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-text-muted">Kind</dt>
                    <dd className="text-right text-text">
                      {row.supplierKind === 'CONNECTED' ? 'Connected' : 'Private'}
                    </dd>
                    <dt className="text-text-muted">Total</dt>
                    <dd className="text-right font-bold tabular-nums text-text">
                      {formatMoney(row.totalMinor, row.currency)}
                    </dd>
                    <dt className="text-text-muted">Created</dt>
                    <dd className="text-right text-text">{formatDate(row.createdAt)}</dd>
                    <dt className="text-text-muted">Expected</dt>
                    <dd className="text-right text-text">{formatDate(row.expectedDate)}</dd>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <nav
        aria-label="Purchase-order report pages"
        className="flex items-center justify-between gap-3"
      >
        <Button
          disabled={cursorHistory.length === 0 || reportQuery.isFetching}
          onClick={showPreviousPage}
          type="button"
          variant="secondary"
        >
          Previous
        </Button>
        <span aria-live="polite" className="text-sm text-text-muted">
          Page {cursorHistory.length + 1}
        </span>
        <Button
          disabled={!reportQuery.data?.nextCursor || reportQuery.isFetching}
          onClick={showNextPage}
          type="button"
          variant="secondary"
        >
          Next
        </Button>
      </nav>

      <section aria-labelledby="status-summary-heading" className="space-y-3">
        <div>
          <h3 className="text-lg font-bold text-text" id="status-summary-heading">
            Status distribution
          </h3>
          <p className="mt-1 text-sm text-text-muted">Filters applied: {filterDescription}</p>
        </div>
        {countsQuery.isLoading ? (
          <div
            aria-label="Loading purchase-order status distribution"
            className="space-y-3 rounded-panel border border-border bg-surface p-5"
          >
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : countsQuery.isError ? (
          <ErrorState
            message={
              countsQuery.error instanceof Error
                ? countsQuery.error.message
                : 'The status distribution could not be loaded.'
            }
            onRetry={() => void countsQuery.refetch()}
            title="Status distribution unavailable"
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Complete purchase-order status-family counts for the applied filters
                </caption>
                <thead className="border-b border-border bg-background/50">
                  <tr>
                    <th
                      className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted"
                      scope="col"
                    >
                      Status
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted"
                      scope="col"
                    >
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {counts.map(({ key, label, count }) => (
                    <tr key={key}>
                      <th className="px-4 py-3 text-sm font-medium text-text" scope="row">
                        {label}
                      </th>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Suspense fallback={<Skeleton className="h-[312px] w-full" />}>
              <PurchaseOrderStatusChart counts={counts} />
            </Suspense>
          </>
        )}
      </section>
    </section>
  );
}
