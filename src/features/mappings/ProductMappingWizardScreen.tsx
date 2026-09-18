import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LockKeyhole, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type {
  BuyerCatalogLookupItem,
  MappingRefusalState,
} from '@/services/mappings/mappingService';
import {
  MAPPING_REFUSAL_COPY,
  canManageMappings,
  createVerifiedMapping,
  listActiveBuyerProducts,
  listActiveSupplierConnections,
  lookupPartnerSku,
  mappingRefusalFromError,
  parsePositiveFactorMilli,
} from '@/services/mappings/mappingService';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { Stepper } from '@/ui/primitives/Stepper';
import { PageHeader } from '@/ui/shell/PageHeader';

const MAPPING_STEPS = [
  { id: 1, label: 'Supplier' },
  { id: 2, label: 'Supplier SKU' },
  { id: 3, label: 'Buyer product' },
  { id: 4, label: 'Conversion' },
  { id: 5, label: 'Review' },
] as const;

export function ProductMappingWizardScreen() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { handle = '' } = useParams<{ readonly handle: string }>();
  const { activeMembership, activeRole } = useWorkspace();
  const [connectionId, setConnectionId] = useState('');
  const [partnerSku, setPartnerSku] = useState('');
  const [matchedItem, setMatchedItem] = useState<BuyerCatalogLookupItem | null>(null);
  const [buyerProductId, setBuyerProductId] = useState('');
  const [factorInput, setFactorInput] = useState('');
  const [semanticConfirmed, setSemanticConfirmed] = useState(false);
  const [refusal, setRefusal] = useState<MappingRefusalState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLookingUp, setLookingUp] = useState(false);
  const [isCreating, setCreating] = useState(false);
  const [createdMappingId, setCreatedMappingId] = useState<string | null>(null);

  const isAuthorized = canManageMappings(activeRole);
  const connectionsQuery = useQuery({
    queryKey: ['network', 'mapping-connections', activeMembership?.organizationId],
    queryFn: async () => {
      if (!repositories) return null;
      return listActiveSupplierConnections(repositories);
    },
    enabled: Boolean(repositories && activeMembership && isAuthorized),
  });
  const productsQuery = useQuery({
    queryKey: ['inventory', 'mapping-products', activeMembership?.organizationId],
    queryFn: async () => {
      if (!repositories) return null;
      return listActiveBuyerProducts(repositories);
    },
    enabled: Boolean(repositories && activeMembership && isAuthorized),
  });

  const connections = useMemo(
    () =>
      (connectionsQuery.data?.items ?? []).filter(
        (connection) => connection.buyerOrgId === activeMembership?.organizationId,
      ),
    [activeMembership?.organizationId, connectionsQuery.data?.items],
  );
  const products = productsQuery.data?.items ?? [];
  const selectedConnection = connections.find(
    (connection) => connection.connectionId === connectionId,
  );
  const selectedProduct = products.find((product) => product.productId === buyerProductId);
  const factorMilli = parsePositiveFactorMilli(factorInput);
  const mappingsPath = `/app/${handle}/network/mappings`;
  const currentStep = getCurrentStep({
    connectionId,
    matchedItem,
    buyerProductId,
    factorMilli,
    semanticConfirmed,
  });

  const chooseConnection = (nextConnectionId: string) => {
    setConnectionId(nextConnectionId);
    setPartnerSku('');
    setMatchedItem(null);
    setRefusal(null);
    setActionError(null);
    setCreatedMappingId(null);
  };

  const runLookup = async () => {
    if (!activeMembership) return;
    if (!connectionId) {
      setRefusal('NO_ACTIVE_CONNECTION');
      return;
    }
    if (!partnerSku.trim()) {
      setRefusal('SKU_NOT_FOUND');
      return;
    }
    setRefusal(null);
    setActionError(null);
    setMatchedItem(null);
    setLookingUp(true);
    try {
      const item = await lookupPartnerSku(
        activeMembership.organizationId,
        connectionId,
        partnerSku,
      );
      setMatchedItem(item);
    } catch (error) {
      setRefusal(mappingRefusalFromError(error) ?? 'SKU_NOT_FOUND');
    } finally {
      setLookingUp(false);
    }
  };

  const runCreate = async () => {
    if (!activeMembership) return;
    if (!connectionId) {
      setRefusal('NO_ACTIVE_CONNECTION');
      return;
    }
    if (!matchedItem) {
      setRefusal('SKU_NOT_FOUND');
      return;
    }
    if (!semanticConfirmed) {
      setRefusal('SEMANTIC_NOT_CONFIRMED');
      return;
    }
    if (factorMilli === null) {
      setRefusal('INVALID_FACTOR');
      return;
    }
    if (!selectedProduct) {
      setActionError('Choose an active buyer product before creating the mapping.');
      return;
    }

    setRefusal(null);
    setActionError(null);
    setCreatedMappingId(null);
    setCreating(true);
    try {
      const result = await createVerifiedMapping(
        activeMembership.organizationId,
        {
          connectionId,
          buyerProductId: selectedProduct.productId,
          supplierCatalogItemId: matchedItem.catalogItemId,
          typedPartnerSku: partnerSku.trim(),
          supplierToBuyerBaseFactorMilli: factorMilli,
          semanticConfirmed: true,
        },
        crypto.randomUUID(),
      );
      setCreatedMappingId(result.mappingId);
      await queryClient.invalidateQueries({ queryKey: ['network', 'mappings'] });
    } catch (error) {
      const mappedRefusal = mappingRefusalFromError(error);
      if (mappedRefusal) setRefusal(mappedRefusal);
      else setActionError('The mapping could not be created. No partial mapping was saved.');
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthorized) {
    return (
      <ErrorState
        message="Product mappings are available to Owners, Admins and Procurement Managers."
        title="Create product mapping access is restricted"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Link to={mappingsPath}>
            <Button variant="outline">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to mappings
            </Button>
          </Link>
        }
        title="Create product mapping"
      />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <section
          aria-labelledby="mapping-privacy-title"
          className="border-primary/25 bg-primary-subtle rounded-panel border p-5"
        >
          <div className="flex items-start gap-3">
            <span className="bg-surface text-primary mt-0.5 rounded-full p-2">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-bold" id="mapping-privacy-title">
                Supplier inventory remains private
              </h2>
              <p className="text-text-muted mt-1 max-w-3xl text-sm">
                Exact SKU lookup uses the authorized partner projection. You can see the published
                item name, SKU, order unit and coarse availability—not supplier stock quantities,
                costs, warehouses or internal product identifiers.
              </p>
            </div>
          </div>
        </section>

        <section className="border-border bg-surface rounded-panel border p-5 shadow-sm md:p-6">
          <Stepper className="mb-8" currentStep={currentStep} steps={MAPPING_STEPS} />

          {(connectionsQuery.isLoading || productsQuery.isLoading) && (
            <div aria-label="Loading mapping options" className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {(connectionsQuery.isError || productsQuery.isError) && (
            <ErrorState
              message="Refresh before creating a mapping. No mapping command has been sent."
              title="Mapping options could not be loaded"
            />
          )}

          {!connectionsQuery.isLoading && !connectionsQuery.isError && connections.length === 0 && (
            <RefusalMessage state="NO_ACTIVE_CONNECTION" />
          )}

          {refusal && <RefusalMessage state={refusal} />}
          {actionError && <ErrorState message={actionError} title="Mapping could not be created" />}
          {createdMappingId && (
            <div
              aria-live="polite"
              className="border-success/30 bg-success/10 rounded-panel mb-6 border p-4"
            >
              <p className="font-bold">Verified mapping created</p>
              <p className="text-text-muted mt-1 text-sm">
                The server revalidated the connection, product, catalog item, semantic confirmation,
                conversion factor and duplicate guard. Reference: {createdMappingId}
              </p>
              <Button
                className="mt-3"
                onClick={() => void navigate(mappingsPath)}
                variant="outline"
              >
                View product mappings
              </Button>
            </div>
          )}

          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              void runCreate();
            }}
          >
            <fieldset className="space-y-3">
              <legend className="text-base font-bold">1. Choose an active supplier</legend>
              <label className="block text-sm font-bold" htmlFor="mapping-connection">
                Supplier connection
                <select
                  className="border-border bg-surface text-text mt-1.5 min-h-11 w-full rounded-lg border px-3 py-2 focus-visible:outline-primary"
                  id="mapping-connection"
                  value={connectionId}
                  onChange={(event) => {
                    chooseConnection(event.target.value);
                  }}
                >
                  <option value="">Choose an active supplier</option>
                  {connections.map((connection) => (
                    <option key={connection.connectionId} value={connection.connectionId}>
                      {connection.supplierName} (@{connection.supplierHandle})
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-base font-bold">2. Check the exact supplier SKU</legend>
              <div className="flex items-end gap-3 max-sm:flex-col max-sm:items-stretch">
                <label className="flex-1 text-sm font-bold" htmlFor="mapping-partner-sku">
                  Supplier SKU
                  <input
                    className="border-border bg-surface text-text mt-1.5 min-h-11 w-full rounded-lg border px-3 py-2 focus-visible:outline-primary"
                    id="mapping-partner-sku"
                    maxLength={80}
                    placeholder="For example CKN-B5"
                    type="text"
                    value={partnerSku}
                    onChange={(event) => {
                      setPartnerSku(event.target.value);
                      setMatchedItem(null);
                      setRefusal(null);
                    }}
                  />
                </label>
                <Button
                  disabled={!connectionId || !partnerSku.trim()}
                  isLoading={isLookingUp}
                  onClick={() => void runLookup()}
                  type="button"
                  variant="outline"
                >
                  <Search aria-hidden="true" className="size-4" />
                  Check supplier SKU
                </Button>
              </div>
            </fieldset>

            {matchedItem && (
              <section aria-labelledby="matched-supplier-item" className="space-y-3">
                <h3 className="text-base font-bold" id="matched-supplier-item">
                  Published supplier item found
                </h3>
                <ItemCard
                  item={matchedItem}
                  {...(selectedConnection ? { supplierName: selectedConnection.supplierName } : {})}
                />
              </section>
            )}

            <fieldset className="space-y-3">
              <legend className="text-base font-bold">3. Choose your matching product</legend>
              <label className="block text-sm font-bold" htmlFor="mapping-buyer-product">
                Buyer product
                <select
                  className="border-border bg-surface text-text mt-1.5 min-h-11 w-full rounded-lg border px-3 py-2 focus-visible:outline-primary"
                  id="mapping-buyer-product"
                  value={buyerProductId}
                  onChange={(event) => {
                    setBuyerProductId(event.target.value);
                    setCreatedMappingId(null);
                  }}
                >
                  <option value="">Choose an active product</option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName} ({product.internalSku})
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-base font-bold">4. Confirm the item and conversion</legend>
              <div className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  aria-labelledby="mapping-semantic-label"
                  checked={semanticConfirmed}
                  className="mt-1 size-5"
                  id="mapping-semantic"
                  type="checkbox"
                  onChange={(event) => {
                    setSemanticConfirmed(event.target.checked);
                    setRefusal(null);
                  }}
                />
                <span>
                  <span className="font-bold" id="mapping-semantic-label">
                    I confirm both records refer to the same real-world item.
                  </span>
                  <span className="text-text-muted mt-1 block">
                    A matching SKU alone is not sufficient to establish semantic equivalence.
                  </span>
                </span>
              </div>
              <label className="block text-sm font-bold" htmlFor="mapping-factor">
                Buyer base units per 1 supplier order unit
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="text-text-muted whitespace-nowrap">
                    1 {matchedItem?.orderUnit ?? 'supplier unit'} =
                  </span>
                  <input
                    aria-describedby="mapping-factor-help"
                    className="border-border bg-surface text-text min-h-11 min-w-0 flex-1 rounded-lg border px-3 py-2 focus-visible:outline-primary"
                    id="mapping-factor"
                    inputMode="decimal"
                    placeholder="5"
                    type="text"
                    value={factorInput}
                    onChange={(event) => {
                      setFactorInput(event.target.value);
                      setRefusal(null);
                    }}
                  />
                  <span className="text-text-muted whitespace-nowrap">
                    {selectedProduct?.unit ?? 'buyer units'}
                  </span>
                </div>
                <span className="text-text-muted mt-1 block font-normal" id="mapping-factor-help">
                  Use up to three decimal places. Example: 1 PACK = 5 KG.
                </span>
              </label>
            </fieldset>

            <section aria-labelledby="mapping-review-title" className="space-y-4">
              <h3 className="text-base font-bold" id="mapping-review-title">
                5. Review
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReviewCard
                  label="Buyer product"
                  primary={selectedProduct?.productName ?? 'Not selected'}
                  secondary={selectedProduct?.internalSku ?? 'Choose an active product'}
                />
                <ReviewCard
                  label="Supplier item"
                  primary={matchedItem?.displayName ?? 'Not checked'}
                  secondary={matchedItem?.partnerSku ?? 'Check the exact supplier SKU'}
                />
              </div>
              <div className="border-border bg-background rounded-lg border p-4">
                <p className="text-text-muted text-xs font-bold uppercase tracking-wide">
                  Worked conversion
                </p>
                <p className="mt-2 text-lg font-bold">
                  10 {matchedItem?.orderUnit ?? 'supplier units'} ={' '}
                  {factorMilli === null ? '—' : (factorMilli * 10) / 1000}{' '}
                  {selectedProduct?.unit ?? 'buyer units'}
                </p>
              </div>
            </section>

            <div className="border-border flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Link to={mappingsPath}>
                <Button className="w-full" type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button disabled={Boolean(createdMappingId)} isLoading={isCreating} type="submit">
                Create verified mapping
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function getCurrentStep({
  connectionId,
  matchedItem,
  buyerProductId,
  factorMilli,
  semanticConfirmed,
}: {
  readonly connectionId: string;
  readonly matchedItem: BuyerCatalogLookupItem | null;
  readonly buyerProductId: string;
  readonly factorMilli: number | null;
  readonly semanticConfirmed: boolean;
}): number {
  if (!connectionId) return 1;
  if (!matchedItem) return 2;
  if (!buyerProductId) return 3;
  if (factorMilli === null || !semanticConfirmed) return 4;
  return 5;
}

function RefusalMessage({ state }: { readonly state: MappingRefusalState }) {
  return (
    <div
      aria-live="polite"
      className="border-danger/30 bg-danger-subtle text-danger rounded-panel mb-6 border p-4 text-sm"
      data-mapping-state={state}
      role="alert"
    >
      <p className="font-bold">Mapping cannot continue</p>
      <p className="mt-1">{MAPPING_REFUSAL_COPY[state]}</p>
    </div>
  );
}

function ItemCard({
  item,
  supplierName,
}: {
  readonly item: BuyerCatalogLookupItem;
  readonly supplierName?: string;
}) {
  return (
    <article className="border-primary/30 bg-primary-subtle rounded-panel border p-4">
      <p className="text-text-muted text-xs font-bold uppercase tracking-wide">
        {supplierName ?? 'Connected supplier'} partner projection
      </p>
      <h4 className="mt-2 font-bold">{item.displayName}</h4>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-text-muted">Supplier SKU</dt>
          <dd className="font-bold">{item.partnerSku}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Order unit</dt>
          <dd className="font-bold">{item.orderUnit}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Availability</dt>
          <dd className="font-bold">
            {item.availabilityState === 'IN_STOCK' ? 'Available' : 'Unavailable'}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ReviewCard({
  label,
  primary,
  secondary,
}: {
  readonly label: string;
  readonly primary: string;
  readonly secondary: string;
}) {
  return (
    <article className="border-border rounded-panel border p-4">
      <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-2 font-bold">{primary}</p>
      <p className="text-text-muted mt-1 text-sm">{secondary}</p>
    </article>
  );
}
