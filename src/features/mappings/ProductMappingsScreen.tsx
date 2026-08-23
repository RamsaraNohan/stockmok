import type { ProductMapping } from '@stockmok/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Link2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  canManageMappings,
  disableMapping,
  formatFactorMilli,
  listMappings,
} from '@/services/mappings/mappingService';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Modal } from '@/ui/primitives/Modal';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

type MappingStatusFilter = 'VERIFIED' | 'DISABLED';

export function ProductMappingsScreen() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeMembership, activeRole } = useWorkspace();
  const [status, setStatus] = useState<MappingStatusFilter>('VERIFIED');
  const [disableTarget, setDisableTarget] = useState<ProductMapping | null>(null);
  const [isDisabling, setDisabling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAuthorized = canManageMappings(activeRole);
  const mappingsQuery = useQuery({
    queryKey: ['network', 'mappings', activeMembership?.organizationId, status],
    queryFn: async () => {
      if (!repositories) return null;
      return listMappings(repositories, status);
    },
    enabled: Boolean(repositories && activeMembership && isAuthorized),
  });

  const confirmDisable = async () => {
    if (!activeMembership || !disableTarget) return;
    setActionError(null);
    setSuccessMessage(null);
    setDisabling(true);
    try {
      await disableMapping(activeMembership.organizationId, disableTarget.mappingId);
      setSuccessMessage(
        `${disableTarget.buyerProductNameSnapshot} mapping disabled. Historical orders remain available.`,
      );
      setDisableTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['network', 'mappings'] });
    } catch {
      setActionError('The mapping changed or could not be disabled. Refresh and try again.');
    } finally {
      setDisabling(false);
    }
  };

  if (!isAuthorized) {
    return (
      <ErrorState
        message="Product Mappings are available to Owners, Admins and Procurement Managers."
        title="Product Mappings access is restricted"
      />
    );
  }

  const mappings = mappingsQuery.data?.items ?? [];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Link to="new">
            <Button>
              <Link2 aria-hidden="true" className="size-4" />
              New mapping
            </Button>
          </Link>
        }
        title="Product Mappings"
      />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {actionError && <ErrorState message={actionError} title="Mapping action failed" />}
        {successMessage && (
          <p
            aria-live="polite"
            className="border-success/30 bg-success/10 rounded-panel border p-4 text-sm font-bold"
          >
            {successMessage}
          </p>
        )}

        <section
          aria-label="Mapping filters"
          className="border-border bg-surface rounded-panel border p-4 shadow-sm"
        >
          <label className="block max-w-xs text-sm font-bold" htmlFor="mapping-status-filter">
            Status
            <select
              className="border-border bg-surface text-text mt-1.5 min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-primary"
              id="mapping-status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as MappingStatusFilter);
                setActionError(null);
                setSuccessMessage(null);
              }}
            >
              <option value="VERIFIED">Verified</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
          <p className="text-text-muted mt-3 text-sm">
            Mappings are created directly as Verified. Disabled mappings are retained for history
            and cannot be restored.
          </p>
        </section>

        {mappingsQuery.isLoading ? (
          <div aria-label="Loading product mappings" className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : mappingsQuery.isError ? (
          <ErrorState
            message="Refresh the page to retry the bounded mapping query."
            title="Product mappings could not be loaded"
          />
        ) : mappings.length === 0 ? (
          <EmptyState
            action={
              status === 'VERIFIED' ? (
                <Link to="new">
                  <Button>New mapping</Button>
                </Link>
              ) : undefined
            }
            description={
              status === 'VERIFIED'
                ? 'Create a verified link between one active product and one published supplier item.'
                : 'Disabled mappings remain here when retained history exists.'
            }
            title={status === 'VERIFIED' ? 'No verified mappings' : 'No disabled mappings'}
          />
        ) : (
          <MappingRows
            mappings={mappings}
            onDisable={(mapping) => {
              setActionError(null);
              setSuccessMessage(null);
              setDisableTarget(mapping);
            }}
          />
        )}
      </div>

      <Modal
        description="This blocks the mapping from new connected order lines. Existing purchase-order history and snapshots remain available. This action has no restore path."
        isOpen={Boolean(disableTarget)}
        onClose={() => {
          if (!isDisabling) setDisableTarget(null);
        }}
        title={`Disable mapping for ${disableTarget?.buyerProductNameSnapshot ?? 'product'}?`}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={isDisabling}
            onClick={() => {
              setDisableTarget(null);
            }}
            type="button"
            variant="ghost"
          >
            Keep mapping
          </Button>
          <Button
            isLoading={isDisabling}
            onClick={() => void confirmDisable()}
            type="button"
            variant="danger"
          >
            Disable mapping
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MappingRows({
  mappings,
  onDisable,
}: {
  readonly mappings: readonly ProductMapping[];
  readonly onDisable: (mapping: ProductMapping) => void;
}) {
  return (
    <section
      aria-labelledby="mapping-table-title"
      className="border-border bg-surface overflow-hidden rounded-panel border shadow-sm"
    >
      <h2 className="sr-only" id="mapping-table-title">
        Product mappings
      </h2>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="bg-background border-border border-b">
            <tr>
              {[
                'Buyer product / SKU',
                'Supplier item / SKU',
                'Conversion',
                'Status',
                'Verified by',
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
            {mappings.map((mapping) => (
              <tr key={mapping.mappingId}>
                <td className="px-4 py-4">
                  <p className="font-bold">{mapping.buyerProductNameSnapshot}</p>
                  <p className="text-text-muted text-sm">{mapping.buyerSkuSnapshot}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-bold">{mapping.supplierDisplayNameSnapshot}</p>
                  <p className="text-text-muted text-sm">{mapping.supplierPartnerSkuSnapshot}</p>
                </td>
                <td className="px-4 py-4 text-sm font-bold">
                  1 {mapping.supplierOrderUnit} ={' '}
                  {formatFactorMilli(mapping.supplierToBuyerBaseFactorMilli)}{' '}
                  {mapping.buyerBaseUnit}
                </td>
                <td className="px-4 py-4">
                  <StatusPill status={mapping.status} />
                </td>
                <td className="px-4 py-4 text-sm">{mapping.semanticConfirmedByName}</td>
                <td className="px-4 py-4">
                  {mapping.status === 'VERIFIED' ? (
                    <Button
                      onClick={() => {
                        onDisable(mapping);
                      }}
                      size="sm"
                      variant="danger"
                    >
                      <Ban aria-hidden="true" className="size-4" />
                      Disable mapping
                    </Button>
                  ) : (
                    <span className="text-text-muted text-sm">No actions</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-border divide-y md:hidden">
        {mappings.map((mapping) => (
          <article className="space-y-4 p-4" key={mapping.mappingId}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{mapping.buyerProductNameSnapshot}</h3>
                <p className="text-text-muted text-sm">{mapping.buyerSkuSnapshot}</p>
              </div>
              <StatusPill status={mapping.status} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">Supplier item</dt>
                <dd className="font-bold">{mapping.supplierDisplayNameSnapshot}</dd>
                <dd className="text-text-muted">{mapping.supplierPartnerSkuSnapshot}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Conversion</dt>
                <dd className="font-bold">
                  1 {mapping.supplierOrderUnit} ={' '}
                  {formatFactorMilli(mapping.supplierToBuyerBaseFactorMilli)}{' '}
                  {mapping.buyerBaseUnit}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Verified by</dt>
                <dd>{mapping.semanticConfirmedByName}</dd>
              </div>
            </dl>
            {mapping.status === 'VERIFIED' && (
              <Button
                className="w-full"
                onClick={() => {
                  onDisable(mapping);
                }}
                variant="danger"
              >
                <Ban aria-hidden="true" className="size-4" />
                Disable mapping
              </Button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
