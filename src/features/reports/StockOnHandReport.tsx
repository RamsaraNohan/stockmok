import type { QueryCursor } from '@stockmok/data';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useRepositories } from '@/services/data/useRepositories';
import {
  buildStockReportCsv,
  groupStockReportRows,
  loadStockOnHandPage,
  loadStockReportFilterOptions,
  type StockReportFilters,
  type StockReportRow,
} from '@/services/reports/reportService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

const PAGE_SIZE = 25;

function formatQuantity(row: StockReportRow): string {
  return `${(row.onHandMilli / 1000).toFixed(3)} ${row.unit}`;
}

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function rowKey(row: StockReportRow): string {
  return 'warehouseId' in row ? `${row.productId}:${row.warehouseId}` : row.productId;
}

export function StockOnHandReport() {
  const repositories = useRepositories();
  const { activeMembership, activeSettings } = useWorkspace();
  const orgId = activeMembership?.organizationId;
  const currency = activeSettings?.currency ?? 'LKR';
  const [draftFilters, setDraftFilters] = useState<StockReportFilters>({});
  const [filters, setFilters] = useState<StockReportFilters>({});
  const [cursor, setCursor] = useState<QueryCursor<StockReportRow>>();
  const [cursorHistory, setCursorHistory] = useState<
    readonly (QueryCursor<StockReportRow> | undefined)[]
  >([]);

  const optionsQuery = useQuery({
    queryKey: ['stock-report-options', orgId],
    queryFn: async () => {
      if (!repositories) throw new Error('Report data is not available.');
      return loadStockReportFilterOptions(repositories);
    },
    enabled: Boolean(repositories && orgId),
  });

  const reportQuery = useQuery({
    queryKey: [
      'stock-on-hand-report',
      orgId,
      filters.warehouseId ?? '',
      filters.categoryId ?? '',
      cursor?.signature ?? '',
      cursor?.snapshot.id ?? '',
    ],
    queryFn: async () => {
      if (!repositories) throw new Error('Report data is not available.');
      return loadStockOnHandPage(repositories, filters, {
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });
    },
    enabled: Boolean(repositories && orgId),
  });

  const categories = useMemo(() => optionsQuery.data?.categories ?? [], [optionsQuery.data]);
  const warehouses = optionsQuery.data?.warehouses ?? [];
  const rows = useMemo(() => reportQuery.data?.items ?? [], [reportQuery.data]);
  const groups = useMemo(() => groupStockReportRows(rows, categories), [categories, rows]);
  const totalStockValueMinor = useMemo(
    () => rows.reduce((total, row) => total + row.stockValueMinor, 0),
    [rows],
  );

  const resetPaging = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    resetPaging();
  };

  const clearFilters = () => {
    setDraftFilters({});
    setFilters({});
    resetPaging();
  };

  const exportCurrentPage = () => {
    const csv = buildStockReportCsv(rows, categories);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stock-on-hand.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const showPreviousPage = () => {
    const previous = cursorHistory.at(-1);
    setCursor(previous);
    setCursorHistory(cursorHistory.slice(0, -1));
  };

  const showNextPage = () => {
    const next = reportQuery.data?.nextCursor;
    if (!next) return;
    setCursorHistory([...cursorHistory, cursor]);
    setCursor(next);
  };

  return (
    <section aria-labelledby="stock-on-hand-heading" className="space-y-5">
      <div className="flex items-start justify-between gap-4 max-md:flex-col">
        <div>
          <h2 id="stock-on-hand-heading" className="text-xl font-bold text-text">
            Stock on Hand
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Unit cost and stock value use the current replacement cost.
          </p>
        </div>
        <div className="hidden md:block">
          <Button
            aria-label="Export current stock-on-hand page as CSV"
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
        className="grid gap-4 rounded-panel border border-border bg-surface p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted" htmlFor="report-room">
            Store room
          </label>
          <select
            id="report-room"
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary max-md:h-11"
            value={draftFilters.warehouseId ?? ''}
            onChange={(event) => {
              const warehouseId = event.target.value;
              setDraftFilters((current) => ({
                ...(current.categoryId ? { categoryId: current.categoryId } : {}),
                ...(warehouseId ? { warehouseId } : {}),
              }));
            }}
          >
            <option value="">All store rooms</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-1 block text-xs font-medium text-text-muted"
            htmlFor="report-category"
          >
            Category
          </label>
          <select
            id="report-category"
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary max-md:h-11"
            value={draftFilters.categoryId ?? ''}
            onChange={(event) => {
              const categoryId = event.target.value;
              setDraftFilters((current) => ({
                ...(current.warehouseId ? { warehouseId: current.warehouseId } : {}),
                ...(categoryId ? { categoryId } : {}),
              }));
            }}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 max-md:flex-col max-md:items-stretch md:col-span-2 xl:col-span-1">
          <Button type="submit">Apply filters</Button>
          <Button onClick={clearFilters} type="button" variant="ghost">
            Clear filters
          </Button>
        </div>
      </form>

      {optionsQuery.isError ? (
        <ErrorState
          message={
            optionsQuery.error instanceof Error
              ? optionsQuery.error.message
              : 'Report filters could not be loaded.'
          }
          title="Report filters unavailable"
        />
      ) : null}

      <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
        {reportQuery.isLoading ? (
          <div aria-label="Loading stock-on-hand report" className="space-y-3 p-6">
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
                  : 'The stock-on-hand report could not be loaded.'
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
              description="No stock rows match the selected store room and category."
              title="No report rows"
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <caption className="sr-only">
                  Stock on hand by product, with category subtotals and a final inventory value
                  total
                </caption>
                <thead className="border-b border-border bg-background/50">
                  <tr>
                    {['Product', 'SKU', 'Category', 'On hand', 'Unit cost', 'Stock value'].map(
                      (heading) => (
                        <th
                          key={heading}
                          className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted ${
                            ['On hand', 'Unit cost', 'Stock value'].includes(heading)
                              ? 'text-right'
                              : ''
                          }`}
                          scope="col"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody className="border-b border-border" key={group.categoryId}>
                    {group.rows.map((row) => (
                      <tr className="hover:bg-background/50" key={rowKey(row)}>
                        <th className="px-4 py-3 text-sm font-medium text-text" scope="row">
                          {row.productName}
                        </th>
                        <td className="px-4 py-3 text-sm text-text-muted">{row.internalSku}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{group.categoryName}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-text">
                          {formatQuantity(row)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-text-muted">
                          {formatMoney(row.baseUnitPriceMinor, currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-text">
                          {formatMoney(row.stockValueMinor, currency)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-background/60">
                      <th
                        className="px-4 py-3 text-sm font-medium text-text"
                        colSpan={5}
                        scope="row"
                      >
                        {group.categoryName} subtotal
                      </th>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text">
                        {formatMoney(group.stockValueMinor, currency)}
                      </td>
                    </tr>
                  </tbody>
                ))}
                <tfoot>
                  <tr className="bg-primary-subtle">
                    <th className="px-4 py-4 font-bold text-text" colSpan={5} scope="row">
                      Total inventory value · {groups.length}{' '}
                      {groups.length === 1 ? 'category' : 'categories'}
                    </th>
                    <td className="px-4 py-4 text-right font-bold tabular-nums text-text">
                      {formatMoney(totalStockValueMinor, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {groups.map((group) => (
                <section aria-labelledby={`category-${group.categoryId}`} key={group.categoryId}>
                  <h3
                    className="bg-background/60 px-4 py-3 text-sm font-bold text-text"
                    id={`category-${group.categoryId}`}
                  >
                    {group.categoryName}
                  </h3>
                  <div className="divide-y divide-border">
                    {group.rows.map((row) => (
                      <article className="space-y-3 p-4" key={rowKey(row)}>
                        <div>
                          <h4 className="font-bold text-text">{row.productName}</h4>
                          <p className="text-xs text-text-muted">SKU {row.internalSku}</p>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <dt className="text-text-muted">Category</dt>
                          <dd className="text-right text-text">{group.categoryName}</dd>
                          <dt className="text-text-muted">On hand</dt>
                          <dd className="text-right tabular-nums text-text">
                            {formatQuantity(row)}
                          </dd>
                          <dt className="text-text-muted">Unit cost</dt>
                          <dd className="text-right tabular-nums text-text">
                            {formatMoney(row.baseUnitPriceMinor, currency)}
                          </dd>
                          <dt className="text-text-muted">Stock value</dt>
                          <dd className="text-right font-bold tabular-nums text-text">
                            {formatMoney(row.stockValueMinor, currency)}
                          </dd>
                        </dl>
                      </article>
                    ))}
                  </div>
                  <p className="border-t border-border px-4 py-3 text-right text-sm font-bold text-text">
                    {group.categoryName} subtotal: {formatMoney(group.stockValueMinor, currency)}
                  </p>
                </section>
              ))}
              <p className="bg-primary-subtle px-4 py-4 text-right font-bold text-text">
                Total inventory value: {formatMoney(totalStockValueMinor, currency)}
              </p>
            </div>
          </>
        )}
      </div>

      <nav
        aria-label="Stock-on-hand report pages"
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
    </section>
  );
}
