import type { ConnectionProjection } from '@stockmok/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LockKeyhole, Search } from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';

import { CatalogActionLink } from '@/features/catalog/CatalogActionLink';
import {
  canManageSupplierCatalog,
  findActiveSupplierConnection,
  listBuyerPartnerCatalog,
  lookupBuyerPartnerCatalogSku,
  type BuyerCatalogProjection,
} from '@/services/catalog/catalogService';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

const CALLABLE_CATALOG_LIMIT = 100;

export function BuyerPartnerCatalogScreen() {
  const { handle = '', supplierOrgId = '' } = useParams<{
    readonly handle: string;
    readonly supplierOrgId: string;
  }>();
  const repositories = useRepositories();
  const { activeMembership, activeRole } = useWorkspace();
  const [localSearch, setLocalSearch] = useState('');
  const [exactSku, setExactSku] = useState('');
  const [lookupResult, setLookupResult] = useState<BuyerCatalogProjection | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setLookingUp] = useState(false);
  const isAuthorized = canManageSupplierCatalog(activeRole);

  const connectionQuery = useQuery({
    queryKey: ['catalog', 'buyer-connection', activeMembership?.organizationId, supplierOrgId],
    queryFn: async () => {
      if (!repositories || !activeMembership || !supplierOrgId) return null;
      return findActiveSupplierConnection(
        repositories,
        activeMembership.organizationId,
        supplierOrgId,
      );
    },
    enabled: Boolean(repositories && activeMembership && supplierOrgId && isAuthorized),
  });

  const connection = connectionQuery.data;
  const catalogQuery = useQuery({
    queryKey: ['catalog', 'buyer-list', activeMembership?.organizationId, connection?.connectionId],
    queryFn: async () => {
      if (!activeMembership || !connection) return [];
      return listBuyerPartnerCatalog(
        activeMembership.organizationId,
        connection.connectionId,
        CALLABLE_CATALOG_LIMIT,
      );
    },
    enabled: Boolean(activeMembership && connection && isAuthorized),
  });

  const rows = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    if (!term) return catalogQuery.data ?? [];
    return (catalogQuery.data ?? []).filter(
      (item) =>
        item.displayName.toLowerCase().includes(term) ||
        item.partnerSku.toLowerCase().includes(term) ||
        item.packDescription?.toLowerCase().includes(term),
    );
  }, [catalogQuery.data, localSearch]);

  const runExactLookup = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const partnerSku = exactSku.trim();
    if (!activeMembership || !connection || !partnerSku) return;
    setLookingUp(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const item = await lookupBuyerPartnerCatalogSku(
        activeMembership.organizationId,
        connection.connectionId,
        partnerSku,
      );
      setLookupResult(item);
    } catch {
      setLookupError('No published partner item uses that exact SKU.');
    } finally {
      setLookingUp(false);
    }
  };

  if (!isAuthorized) {
    return (
      <ErrorState
        message="Partner Catalog is available to Owners, Admins and Procurement Managers."
        title="Partner Catalog access is restricted"
      />
    );
  }

  if (connectionQuery.isLoading) return <CatalogLoading />;

  if (connectionQuery.isError || !connection) {
    return (
      <div className="space-y-6">
        <PageHeader title="Partner Catalog" />
        <ErrorState
          message="An ACTIVE supplier connection is required. No catalog callable was issued."
          title="Partner catalog unavailable"
        />
      </div>
    );
  }

  const supplierName = connection.supplierName;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <CatalogActionLink
            outline
            to={`/app/${handle}/network/connections/${connection.connectionId}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to connection
          </CatalogActionLink>
        }
        title={`${supplierName} Partner Catalog`}
      />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <SupplierIdentity connection={connection} />

        <section
          aria-labelledby="buyer-catalog-privacy-title"
          className="border-primary/25 bg-primary-subtle rounded-panel border p-5"
        >
          <div className="flex items-start gap-3">
            <span className="bg-surface text-primary mt-0.5 rounded-full p-2">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-bold" id="buyer-catalog-privacy-title">
                Partner projection, not supplier inventory
              </h2>
              <p className="text-text-muted mt-1 max-w-3xl text-sm">
                This is a partner projection, not {supplierName}&apos;s inventory. Exact stock,
                costs, warehouses and other private data are not shared.
              </p>
            </div>
          </div>
        </section>

        <section className="border-border bg-surface rounded-panel border p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-bold" htmlFor="buyer-catalog-search">
              Search returned items
              <input
                className="border-border bg-surface text-text mt-1.5 min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-primary"
                id="buyer-catalog-search"
                placeholder="Partner item, SKU or pack description"
                type="search"
                value={localSearch}
                onChange={(event) => {
                  setLocalSearch(event.target.value);
                }}
              />
            </label>

            <form className="flex items-end gap-2" onSubmit={(event) => void runExactLookup(event)}>
              <label className="flex-1 text-sm font-bold" htmlFor="buyer-catalog-exact-sku">
                Exact partner SKU
                <input
                  className="border-border bg-surface text-text mt-1.5 min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-primary"
                  id="buyer-catalog-exact-sku"
                  maxLength={80}
                  placeholder="Enter exact SKU"
                  value={exactSku}
                  onChange={(event) => {
                    setExactSku(event.target.value);
                  }}
                />
              </label>
              <Button disabled={!exactSku.trim()} isLoading={isLookingUp} type="submit">
                <Search aria-hidden="true" className="size-4" />
                Look up
              </Button>
            </form>
          </div>
        </section>

        {lookupError && <ErrorState message={lookupError} title="Partner SKU not found" />}
        {lookupResult && (
          <section
            aria-live="polite"
            className="border-primary/30 bg-surface rounded-panel border p-5 shadow-sm"
          >
            <p className="text-text-muted text-xs font-bold uppercase tracking-wide">
              Exact SKU match
            </p>
            <div className="mt-3">
              <BuyerCatalogCard
                connectionId={connection.connectionId}
                handle={handle}
                item={lookupResult}
              />
            </div>
          </section>
        )}

        {catalogQuery.isLoading ? (
          <CatalogLoading />
        ) : catalogQuery.isError ? (
          <ErrorState
            message="The connection may have changed. Refresh before trying the callable again."
            title="Published catalog could not be loaded"
          />
        ) : !rows.length ? (
          <EmptyState
            description={
              localSearch.trim()
                ? 'Clear the local search to see the bounded callable result.'
                : `${supplierName} has not published any items to connected buyers.`
            }
            title={localSearch.trim() ? 'No matching published items' : 'No published items'}
          />
        ) : (
          <BuyerCatalogRows connectionId={connection.connectionId} handle={handle} items={rows} />
        )}
      </div>
    </div>
  );
}

function SupplierIdentity({ connection }: { readonly connection: ConnectionProjection }) {
  return (
    <section
      aria-label="Connected supplier"
      className="border-border bg-surface rounded-panel border p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="bg-primary-subtle text-primary flex size-11 items-center justify-center rounded-full font-bold">
          {connection.supplierName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </span>
        <div>
          <h2 className="font-bold">{connection.supplierName}</h2>
          <p className="text-text-muted text-sm">@{connection.supplierHandle}</p>
        </div>
        <StatusPill className="ml-auto" label="Connected" status="ACTIVE" variant="success" />
      </div>
    </section>
  );
}

function BuyerCatalogRows({
  connectionId,
  handle,
  items,
}: {
  readonly connectionId: string;
  readonly handle: string;
  readonly items: readonly BuyerCatalogProjection[];
}) {
  return (
    <section
      aria-labelledby="buyer-catalog-table-title"
      className="border-border bg-surface overflow-hidden rounded-panel border shadow-sm"
    >
      <h2 className="sr-only" id="buyer-catalog-table-title">
        Published partner catalog items
      </h2>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead className="bg-background border-border border-b">
            <tr>
              {[
                'Supplier item',
                'Partner SKU',
                'Order unit',
                'Pack description',
                'Availability',
                'Wholesale price',
                'Action',
              ].map((heading) => (
                <th
                  className="text-text-muted px-4 py-3 text-xs font-bold uppercase tracking-wide"
                  key={heading}
                  scope="col"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {items.map((item) => (
              <tr key={item.catalogItemId}>
                <td className="px-4 py-4 font-bold">{item.displayName}</td>
                <td className="px-4 py-4 text-sm font-bold">{item.partnerSku}</td>
                <td className="px-4 py-4 text-sm">{item.orderUnit}</td>
                <td className="text-text-muted px-4 py-4 text-sm">
                  {item.packDescription ?? 'Not provided'}
                </td>
                <td className="px-4 py-4">
                  <AvailabilityPill value={item.availabilityState} />
                </td>
                <td className="px-4 py-4 text-sm tabular-nums">{formatWholesalePrice(item)}</td>
                <td className="px-4 py-4">
                  <MappingLink connectionId={connectionId} handle={handle} item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-border divide-y md:hidden">
        {items.map((item) => (
          <BuyerCatalogCard
            connectionId={connectionId}
            handle={handle}
            item={item}
            key={item.catalogItemId}
          />
        ))}
      </div>
    </section>
  );
}

function BuyerCatalogCard({
  connectionId,
  handle,
  item,
}: {
  readonly connectionId: string;
  readonly handle: string;
  readonly item: BuyerCatalogProjection;
}) {
  return (
    <article className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{item.displayName}</h3>
          <p className="text-text-muted text-sm">{item.partnerSku}</p>
        </div>
        <AvailabilityPill value={item.availabilityState} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <CatalogField label="Order unit" value={item.orderUnit} />
        <CatalogField label="Pack" value={item.packDescription ?? 'Not provided'} />
        <CatalogField label="Wholesale price" value={formatWholesalePrice(item)} />
      </dl>
      <MappingLink connectionId={connectionId} handle={handle} item={item} />
    </article>
  );
}

function CatalogField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function AvailabilityPill({ value }: { readonly value: 'IN_STOCK' | 'OUT_OF_STOCK' }) {
  return (
    <StatusPill
      label={value === 'IN_STOCK' ? 'Available' : 'Unavailable'}
      status={value}
      variant={value === 'IN_STOCK' ? 'success' : 'neutral'}
    />
  );
}

function MappingLink({
  connectionId,
  handle,
  item,
}: {
  readonly connectionId: string;
  readonly handle: string;
  readonly item: BuyerCatalogProjection;
}) {
  const query = new URLSearchParams({
    connectionId,
    catalogItemId: item.catalogItemId,
    partnerSku: item.partnerSku,
  });
  return (
    <CatalogActionLink compact to={`/app/${handle}/network/mappings/new?${query.toString()}`}>
      Start mapping
    </CatalogActionLink>
  );
}

function formatWholesalePrice(item: BuyerCatalogProjection): string {
  if (item.wholesalePriceMinor === undefined || !item.currency) return 'Not provided';
  return `${item.currency} ${(item.wholesalePriceMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CatalogLoading() {
  return (
    <div aria-label="Loading partner catalog" className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
