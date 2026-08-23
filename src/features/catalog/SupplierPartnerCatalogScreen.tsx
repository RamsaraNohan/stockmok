import type { PartnerCatalogItem } from '@stockmok/shared';
import type { QueryCursor } from '@stockmok/data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LockKeyhole, PackagePlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { CatalogActionLink } from '@/features/catalog/CatalogActionLink';
import { PublishPartnerItemDialog } from '@/features/catalog/PublishPartnerItemDialog';
import {
  canManageSupplierCatalog,
  getPublishSourceProduct,
  listOwnCatalog,
  unpublishPartnerCatalogItem,
} from '@/services/catalog/catalogService';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Modal } from '@/ui/primitives/Modal';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

type PublishedFilter = 'PUBLISHED' | 'UNPUBLISHED';
type AvailabilityFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

export function SupplierPartnerCatalogScreen() {
  const { handle = '' } = useParams<{ readonly handle: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceProductId = searchParams.get('productId')?.trim() ?? '';
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeMembership, activeRole } = useWorkspace();
  const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>('PUBLISHED');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL');
  const [search, setSearch] = useState('');
  const [pageCursor, setPageCursor] = useState<QueryCursor<PartnerCatalogItem> | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [publishOpen, setPublishOpen] = useState(Boolean(sourceProductId));
  const [unpublishTarget, setUnpublishTarget] = useState<PartnerCatalogItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUnpublishing, setUnpublishing] = useState(false);

  const isAuthorized = canManageSupplierCatalog(activeRole);
  const published = publishedFilter === 'PUBLISHED';

  const catalogQuery = useQuery({
    queryKey: ['catalog', 'own', activeMembership?.organizationId, published, pageNumber],
    queryFn: async () => {
      if (!repositories) return null;
      return listOwnCatalog(
        repositories,
        published,
        pageCursor ? { cursor: pageCursor } : undefined,
      );
    },
    enabled: Boolean(repositories && activeMembership && isAuthorized),
  });

  const productQuery = useQuery({
    queryKey: ['catalog', 'source-product', activeMembership?.organizationId, sourceProductId],
    queryFn: async () => {
      if (!repositories || !sourceProductId) return null;
      return getPublishSourceProduct(repositories, sourceProductId);
    },
    enabled: Boolean(repositories && activeMembership && isAuthorized && sourceProductId),
  });

  const rows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (catalogQuery.data?.items ?? []).filter((item) => {
      const matchesAvailability =
        availabilityFilter === 'ALL' || item.availabilityState === availabilityFilter;
      const matchesSearch =
        !normalized ||
        item.internalProductNameSnapshot.toLowerCase().includes(normalized) ||
        item.internalSkuSnapshot.toLowerCase().includes(normalized) ||
        item.partnerSku.toLowerCase().includes(normalized);
      return matchesAvailability && matchesSearch;
    });
  }, [availabilityFilter, catalogQuery.data?.items, search]);

  const resetPage = () => {
    setPageCursor(null);
    setPageNumber(0);
  };

  const closePublish = () => {
    setPublishOpen(false);
    if (sourceProductId) {
      const next = new URLSearchParams(searchParams);
      next.delete('productId');
      setSearchParams(next, { replace: true });
    }
  };

  const confirmUnpublish = async () => {
    if (!activeMembership || !unpublishTarget) return;
    setActionError(null);
    setSuccessMessage(null);
    setUnpublishing(true);
    try {
      await unpublishPartnerCatalogItem(
        activeMembership.organizationId,
        unpublishTarget.catalogItemId,
      );
      setSuccessMessage(
        `${unpublishTarget.internalProductNameSnapshot} unpublished from the partner catalog.`,
      );
      setUnpublishTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'own'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The item could not be unpublished.');
    } finally {
      setUnpublishing(false);
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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          sourceProductId ? (
            <Button
              onClick={() => {
                setPublishOpen(true);
              }}
            >
              <PackagePlus aria-hidden="true" className="size-4" />
              Publish selected product
            </Button>
          ) : (
            <CatalogActionLink to={`/app/${handle}/inventory/products`}>
              <PackagePlus aria-hidden="true" className="size-4" />
              Choose source product
            </CatalogActionLink>
          )
        }
        title="Partner Catalog"
      />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <section
          aria-labelledby="catalog-privacy-title"
          className="border-primary/25 bg-primary-subtle rounded-panel border p-5"
        >
          <div className="flex items-start gap-3">
            <span className="bg-surface text-primary mt-0.5 rounded-full p-2">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-bold" id="catalog-privacy-title">
                Your inventory stays private
              </h2>
              <p className="text-text-muted mt-1 max-w-3xl text-sm">
                Only the partner SKU, partner item name, order unit, pack description, coarse
                availability and optional wholesale price are shared. Exact stock, purchase costs,
                margins, warehouses, members, settings and other private records are never included.
              </p>
            </div>
          </div>
        </section>

        {actionError && <ErrorState message={actionError} title="Catalog action failed" />}
        {successMessage && (
          <p
            aria-live="polite"
            className="border-success/30 bg-success/10 rounded-panel border p-4 text-sm font-bold"
          >
            {successMessage}
          </p>
        )}

        <section
          aria-label="Catalog filters"
          className="border-border bg-surface rounded-panel border p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold" htmlFor="catalog-search">
              Search this page
              <input
                className="border-border bg-surface text-text mt-1.5 min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-primary"
                id="catalog-search"
                placeholder="Internal product, internal SKU or partner SKU"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </label>
            <label className="text-sm font-bold" htmlFor="catalog-published-filter">
              Publication
              <select
                className="border-border bg-surface text-text mt-1.5 min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-primary"
                id="catalog-published-filter"
                value={publishedFilter}
                onChange={(event) => {
                  setPublishedFilter(event.target.value as PublishedFilter);
                  resetPage();
                }}
              >
                <option value="PUBLISHED">Published</option>
                <option value="UNPUBLISHED">Unpublished</option>
              </select>
            </label>
            <label className="text-sm font-bold" htmlFor="catalog-availability-filter">
              Availability
              <select
                className="border-border bg-surface text-text mt-1.5 min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-primary"
                id="catalog-availability-filter"
                value={availabilityFilter}
                onChange={(event) => {
                  setAvailabilityFilter(event.target.value as AvailabilityFilter);
                }}
              >
                <option value="ALL">All</option>
                <option value="IN_STOCK">Available</option>
                <option value="OUT_OF_STOCK">Unavailable</option>
              </select>
            </label>
          </div>
        </section>

        {catalogQuery.isLoading ? (
          <div className="space-y-3" aria-label="Loading catalog">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : catalogQuery.isError ? (
          <ErrorState
            message="Refresh the page to try the bounded catalog query again."
            title="Partner catalog could not be loaded"
          />
        ) : !rows.length ? (
          <EmptyState
            action={
              publishedFilter === 'PUBLISHED' ? (
                <CatalogActionLink to={`/app/${handle}/inventory/products`}>
                  Choose source product
                </CatalogActionLink>
              ) : undefined
            }
            description={
              publishedFilter === 'PUBLISHED'
                ? 'Publish selected product details for connected buyers.'
                : 'No retained unpublished items match these filters.'
            }
            title={
              publishedFilter === 'PUBLISHED'
                ? 'No partner items published'
                : 'No unpublished partner items'
            }
          />
        ) : (
          <CatalogRows
            handle={handle}
            items={rows}
            onUnpublish={(item) => {
              setActionError(null);
              setSuccessMessage(null);
              setUnpublishTarget(item);
            }}
          />
        )}

        {catalogQuery.data?.nextCursor && (
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setPageCursor(catalogQuery.data?.nextCursor ?? null);
                setPageNumber((current) => current + 1);
              }}
              variant="outline"
            >
              Next page
            </Button>
          </div>
        )}
      </div>

      <PublishPartnerItemDialog
        isOpen={publishOpen}
        isProductLoading={productQuery.isLoading}
        product={productQuery.data ?? null}
        onClose={closePublish}
        onPublished={(productName) => {
          setSuccessMessage(`${productName} published to the partner catalog.`);
          void queryClient.invalidateQueries({ queryKey: ['catalog', 'own'] });
        }}
      />

      <Modal
        description="Connected buyers will no longer find this item for new mappings. Existing history will remain available."
        isOpen={Boolean(unpublishTarget)}
        onClose={() => {
          if (!isUnpublishing) setUnpublishTarget(null);
        }}
        title={`Unpublish ${unpublishTarget?.internalProductNameSnapshot ?? 'partner item'}?`}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={isUnpublishing}
            onClick={() => {
              setUnpublishTarget(null);
            }}
            type="button"
            variant="ghost"
          >
            Keep published
          </Button>
          <Button
            isLoading={isUnpublishing}
            onClick={() => void confirmUnpublish()}
            type="button"
            variant="danger"
          >
            Unpublish {unpublishTarget?.internalProductNameSnapshot ?? 'item'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CatalogRows({
  items,
  handle,
  onUnpublish,
}: {
  readonly items: readonly PartnerCatalogItem[];
  readonly handle: string;
  readonly onUnpublish: (item: PartnerCatalogItem) => void;
}) {
  return (
    <section
      aria-labelledby="catalog-table-title"
      className="border-border bg-surface overflow-hidden rounded-panel border shadow-sm"
    >
      <h2 className="sr-only" id="catalog-table-title">
        Supplier partner catalog
      </h2>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="bg-background border-border border-b">
            <tr>
              {[
                'Internal product',
                'Internal SKU',
                'Partner SKU',
                'Order unit',
                'Availability',
                'Published',
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
                <td className="px-4 py-4 font-bold">{item.internalProductNameSnapshot}</td>
                <td className="text-text-muted px-4 py-4 text-sm">{item.internalSkuSnapshot}</td>
                <td className="px-4 py-4 text-sm font-bold">{item.partnerSku}</td>
                <td className="px-4 py-4 text-sm">{item.orderUnit}</td>
                <td className="px-4 py-4">
                  <StatusPill
                    label={item.availabilityState === 'IN_STOCK' ? 'Available' : 'Unavailable'}
                    status={item.availabilityState}
                    variant={item.availabilityState === 'IN_STOCK' ? 'success' : 'neutral'}
                  />
                </td>
                <td className="px-4 py-4">
                  <StatusPill
                    label={item.published ? 'Published' : 'Unpublished'}
                    status={item.published ? 'PUBLISHED' : 'UNPUBLISHED'}
                    variant={item.published ? 'success' : 'neutral'}
                  />
                </td>
                <td className="px-4 py-4">
                  <RowActions handle={handle} item={item} onUnpublish={onUnpublish} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-border divide-y md:hidden">
        {items.map((item) => (
          <article className="space-y-4 p-4" key={item.catalogItemId}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{item.internalProductNameSnapshot}</h3>
                <p className="text-text-muted text-sm">{item.internalSkuSnapshot}</p>
              </div>
              <StatusPill
                label={item.published ? 'Published' : 'Unpublished'}
                status={item.published ? 'PUBLISHED' : 'UNPUBLISHED'}
                variant={item.published ? 'success' : 'neutral'}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-muted">Partner SKU</dt>
                <dd className="font-bold">{item.partnerSku}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Order unit</dt>
                <dd className="font-bold">{item.orderUnit}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Availability</dt>
                <dd>{item.availabilityState === 'IN_STOCK' ? 'Available' : 'Unavailable'}</dd>
              </div>
            </dl>
            <RowActions handle={handle} item={item} onUnpublish={onUnpublish} />
          </article>
        ))}
      </div>
    </section>
  );
}

function RowActions({
  item,
  handle,
  onUnpublish,
}: {
  readonly item: PartnerCatalogItem;
  readonly handle: string;
  readonly onUnpublish: (item: PartnerCatalogItem) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <CatalogActionLink
        compact
        outline
        to={`/app/${handle}/inventory/products/${item.sourceProductId}`}
      >
        <Eye aria-hidden="true" className="size-4" />
        Source product
      </CatalogActionLink>
      {item.published && (
        <Button
          onClick={() => {
            onUnpublish(item);
          }}
          size="sm"
          variant="danger"
        >
          Unpublish
        </Button>
      )}
    </div>
  );
}
