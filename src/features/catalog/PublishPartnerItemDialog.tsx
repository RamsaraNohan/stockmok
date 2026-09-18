import type { Product } from '@stockmok/shared';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';

import {
  publishPartnerCatalogItem,
  toWholesalePriceMinor,
} from '@/services/catalog/catalogService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';

export interface PublishPartnerItemDialogProps {
  readonly isOpen: boolean;
  readonly product: Product | null;
  readonly isProductLoading?: boolean;
  readonly onClose: () => void;
  readonly onPublished: (productName: string) => void;
}

interface PublishFormState {
  readonly partnerSku: string;
  readonly displayName: string;
  readonly packDescription: string;
  readonly wholesalePrice: string;
}

const emptyForm: PublishFormState = {
  partnerSku: '',
  displayName: '',
  packDescription: '',
  wholesalePrice: '',
};

export function PublishPartnerItemDialog({
  isOpen,
  product,
  isProductLoading = false,
  onClose,
  onPublished,
}: PublishPartnerItemDialogProps) {
  const { activeMembership } = useWorkspace();
  const [form, setForm] = useState<PublishFormState>(emptyForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Q-014 may resolve after Radix has opened; initialize the form at that boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(
      product
        ? {
            partnerSku: product.internalSku,
            displayName: product.name,
            packDescription: '',
            wholesalePrice: '',
          }
        : emptyForm,
    );
    setSubmitError(null);
  }, [isOpen, product]);

  const wholesalePriceMinor = useMemo(
    () => toWholesalePriceMinor(form.wholesalePrice),
    [form.wholesalePrice],
  );
  const validationError = getValidationError(form, wholesalePriceMinor);
  const productUnavailableReason = getProductUnavailableReason(product);

  const close = () => {
    if (isSubmitting) return;
    setForm(emptyForm);
    setSubmitError(null);
    onClose();
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !activeMembership ||
      !product ||
      validationError ||
      productUnavailableReason ||
      Number.isNaN(wholesalePriceMinor)
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await publishPartnerCatalogItem(activeMembership.organizationId, {
        sourceProductId: product.productId,
        partnerSku: form.partnerSku.trim(),
        displayName: form.displayName.trim(),
        orderUnit: product.baseUnit,
        ...(form.packDescription.trim() ? { packDescription: form.packDescription.trim() } : {}),
        ...(wholesalePriceMinor === undefined ? {} : { wholesalePriceMinor }),
      });
      onPublished(product.name);
      setForm(emptyForm);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The item could not be published.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      description="Publish an allow-listed partner projection for connected buyers."
      isOpen={isOpen}
      onClose={close}
      title="Publish partner item"
    >
      {isProductLoading ? (
        <p aria-live="polite" className="text-text-muted py-8 text-center text-sm">
          Loading source product…
        </p>
      ) : !product ? (
        <ErrorState
          message="Choose an active source product before opening this dialog."
          title="Source product unavailable"
        />
      ) : (
        <form className="space-y-5" onSubmit={(event) => void submit(event)}>
          <section
            aria-label="Partner projection privacy"
            className="border-primary/25 bg-primary-subtle rounded-panel border p-4"
          >
            <h3 className="font-bold">Only partner-safe fields are shared</h3>
            <p className="text-text-muted mt-1 text-sm">
              Connected buyers will see the partner fields below. They cannot see your stock
              quantities, your costs, your warehouses or any other private data.
            </p>
          </section>

          {productUnavailableReason && (
            <ErrorState
              message={productUnavailableReason}
              title="This product cannot be published"
            />
          )}
          {submitError && <ErrorState message={submitError} title="Publish failed" />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              disabled
              label="Internal product"
              value={`${product.name} · ${product.internalSku}`}
            />
            <Input
              disabled
              helperText="Order unit must match the product's base unit in this release."
              label="Order unit"
              value={product.baseUnit}
            />
            <Input
              label="Partner SKU"
              maxLength={80}
              required
              value={form.partnerSku}
              onChange={(event) => {
                setForm((current) => ({ ...current, partnerSku: event.target.value }));
              }}
            />
            <Input
              label="Partner item name"
              maxLength={120}
              required
              value={form.displayName}
              onChange={(event) => {
                setForm((current) => ({ ...current, displayName: event.target.value }));
              }}
            />
            <div className="sm:col-span-2">
              <Input
                helperText="Optional public-safe description of the package or unit."
                label="Pack description"
                maxLength={120}
                value={form.packDescription}
                onChange={(event) => {
                  setForm((current) => ({ ...current, packDescription: event.target.value }));
                }}
              />
            </div>
            <Input
              inputMode="decimal"
              label={`Wholesale price (${product.currency})`}
              min="0"
              placeholder="Optional"
              step="0.01"
              type="number"
              value={form.wholesalePrice}
              onChange={(event) => {
                setForm((current) => ({ ...current, wholesalePrice: event.target.value }));
              }}
            />
            <Input
              disabled
              helperText="A coarse value is calculated by the trusted command; exact stock is never shared."
              label="Availability"
              value="Calculated at publish time"
            />
          </div>

          <section aria-label="Buyer preview" className="border-border rounded-panel border p-4">
            <h3 className="font-bold">Connected buyer preview</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <PreviewField label="Item" value={form.displayName.trim() || '—'} />
              <PreviewField label="Partner SKU" value={form.partnerSku.trim() || '—'} />
              <PreviewField label="Order unit" value={product.baseUnit} />
              <PreviewField
                label="Pack description"
                value={form.packDescription.trim() || 'Not provided'}
              />
              <PreviewField label="Availability" value="In stock or out of stock only" />
              <PreviewField
                label="Wholesale price"
                value={formatDraftPrice(wholesalePriceMinor, product.currency)}
              />
            </dl>
          </section>

          {validationError && (
            <p className="text-red-600 text-sm font-semibold" role="alert">
              {validationError}
            </p>
          )}

          <div className="border-border flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button disabled={isSubmitting} onClick={close} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={Boolean(validationError || productUnavailableReason)}
              isLoading={isSubmitting}
              type="submit"
            >
              Publish partner item
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PreviewField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-text-muted font-medium">{label}</dt>
      <dd className="mt-0.5 font-bold">{value}</dd>
    </div>
  );
}

function getProductUnavailableReason(product: Product | null): string | null {
  if (!product) return 'The selected product could not be loaded.';
  if (product.status !== 'ACTIVE') return 'Archived products cannot be published.';
  if (product.partnerPublished) return 'This product is already published to the partner catalog.';
  return null;
}

function getValidationError(
  form: PublishFormState,
  wholesalePriceMinor: number | undefined,
): string | null {
  if (!form.partnerSku.trim()) return 'Enter a partner SKU.';
  if (!form.displayName.trim()) return 'Enter a partner item name.';
  if (form.packDescription.trim().length > 120)
    return 'Pack description must be 120 characters or fewer.';
  if (Number.isNaN(wholesalePriceMinor))
    return 'Wholesale price must be a non-negative amount with at most two decimal places.';
  return null;
}

function formatDraftPrice(value: number | undefined, currency: string): string {
  if (value === undefined || Number.isNaN(value)) return 'Not provided';
  return `${currency} ${(value / 100).toFixed(2)}`;
}
