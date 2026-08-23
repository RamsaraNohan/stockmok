// @vitest-environment jsdom

import type { PartnerCatalogItem, Product } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as CatalogServiceModule from '@/services/catalog/catalogService';

const catalogMocks = vi.hoisted(() => ({
  getPublishSourceProduct: vi.fn(),
  listOwnCatalog: vi.fn(),
  publishPartnerCatalogItem: vi.fn(),
  unpublishPartnerCatalogItem: vi.fn(),
}));

vi.mock('@/services/data/useRepositories', () => ({
  useRepositories: () => ({ inventory: {}, network: {} }),
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    activeMembership: { organizationId: 'supplier-org' },
    activeRole: 'PROCUREMENT_MANAGER',
  }),
}));

vi.mock('@/services/catalog/catalogService', async (importOriginal) => ({
  ...(await importOriginal<typeof CatalogServiceModule>()),
  getPublishSourceProduct: catalogMocks.getPublishSourceProduct,
  listOwnCatalog: catalogMocks.listOwnCatalog,
  publishPartnerCatalogItem: catalogMocks.publishPartnerCatalogItem,
  unpublishPartnerCatalogItem: catalogMocks.unpublishPartnerCatalogItem,
}));

import { SupplierPartnerCatalogScreen } from './SupplierPartnerCatalogScreen';

function timestamp(iso: string) {
  return { toDate: () => new Date(iso) } as PartnerCatalogItem['updatedAt'];
}

const catalogItem = {
  catalogItemId: 'catalog-1',
  sourceProductId: 'product-1',
  internalProductNameSnapshot: 'Fresh Chicken Breast 5 KG Pack',
  internalSkuSnapshot: 'CKN-005',
  partnerSku: 'CKN-B5',
  partnerSkuNormalized: 'ckn-b5',
  displayName: 'Chicken Breast Partner Pack',
  orderUnit: 'PACK',
  packDescription: '5 KG per pack',
  availabilityState: 'IN_STOCK',
  wholesalePriceMinor: 125000,
  currency: 'LKR',
  published: true,
  updatedAt: timestamp('2026-08-21T00:00:00Z'),
} as PartnerCatalogItem;

const sourceProduct = {
  productId: 'product-1',
  internalSku: 'CKN-005',
  internalSkuNormalized: 'ckn-005',
  name: 'Fresh Chicken Breast 5 KG Pack',
  categoryId: 'category-1',
  baseUnit: 'PACK',
  purchaseCostMinor: 999999,
  currency: 'LKR',
  minimumStockMilli: 5000,
  reorderTargetMilli: 10000,
  status: 'ACTIVE',
  partnerPublished: false,
  storefrontPublished: false,
  createdBy: 'owner-1',
  updatedBy: 'owner-1',
  createdAt: timestamp('2026-08-01T00:00:00Z'),
  updatedAt: timestamp('2026-08-21T00:00:00Z'),
} as Product;

function renderCatalog(url = '/app/freshfoods/network/partner-catalog?productId=product-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            element={<SupplierPartnerCatalogScreen />}
            path="/app/:handle/network/partner-catalog"
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SupplierPartnerCatalogScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogMocks.listOwnCatalog.mockResolvedValue({ items: [catalogItem], nextCursor: null });
    catalogMocks.getPublishSourceProduct.mockResolvedValue(sourceProduct);
    catalogMocks.publishPartnerCatalogItem.mockResolvedValue({
      catalogItemId: 'catalog-2',
      partnerSku: 'CKN-005',
      published: true,
    });
    catalogMocks.unpublishPartnerCatalogItem.mockResolvedValue(undefined);
  });

  it('renders the supplier-only table and a prominent privacy allow-list', async () => {
    renderCatalog('/app/freshfoods/network/partner-catalog');

    expect(await screen.findAllByText('Fresh Chicken Breast 5 KG Pack')).toHaveLength(2);
    expect(screen.getByText('Your inventory stays private')).toBeTruthy();
    expect(screen.getByText(/Exact stock, purchase costs, margins, warehouses/)).toBeTruthy();
    expect(catalogMocks.listOwnCatalog).toHaveBeenCalledWith(expect.anything(), true, undefined);
  });

  it('locks orderUnit to baseUnit and sends only the exact C-21 payload', async () => {
    renderCatalog();

    const orderUnit = await screen.findByLabelText('Order unit');
    expect(orderUnit).toHaveProperty('value', 'PACK');
    expect(orderUnit.getAttribute('disabled')).not.toBeNull();
    const availabilityFields = screen.getAllByLabelText('Availability');
    const availabilityInput = availabilityFields.find((field) => field.tagName === 'INPUT');
    if (!availabilityInput) throw new Error('Expected the read-only publish availability field.');
    expect(availabilityInput.getAttribute('disabled')).not.toBeNull();
    expect(screen.queryByText('9999.99')).toBeNull();

    const dialog = screen.getByRole('dialog');
    fireEvent.change(getDialogInput(dialog, 'Partner SKU'), { target: { value: 'CKN-B5' } });
    fireEvent.change(getDialogInput(dialog, 'Partner item name'), {
      target: { value: 'Chicken Breast Partner Pack' },
    });
    fireEvent.change(getDialogInput(dialog, 'Pack description'), {
      target: { value: '5 KG per pack' },
    });
    fireEvent.change(getDialogInput(dialog, 'Wholesale price (LKR)'), {
      target: { value: '1250.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish partner item' }));

    await waitFor(() => {
      expect(catalogMocks.publishPartnerCatalogItem).toHaveBeenCalledWith('supplier-org', {
        sourceProductId: 'product-1',
        partnerSku: 'CKN-B5',
        displayName: 'Chicken Breast Partner Pack',
        orderUnit: 'PACK',
        packDescription: '5 KG per pack',
        wholesalePriceMinor: 125000,
      });
    });
    const payload = catalogMocks.publishPartnerCatalogItem.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty('availabilityState');
    expect(payload).not.toHaveProperty('currency');
    expect(payload).not.toHaveProperty('purchaseCostMinor');
  });

  it('requires a named confirmation and sends only catalogItemId to C-22', async () => {
    renderCatalog('/app/freshfoods/network/partner-catalog');
    await screen.findAllByText('Fresh Chicken Breast 5 KG Pack');

    const [unpublishButton] = screen.getAllByRole('button', { name: 'Unpublish' });
    if (!unpublishButton) throw new Error('Expected a published catalog action.');
    fireEvent.click(unpublishButton);
    expect(
      screen.getByRole('heading', { name: 'Unpublish Fresh Chicken Breast 5 KG Pack?' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Unpublish Fresh Chicken Breast 5 KG Pack' }),
    );

    await waitFor(() => {
      expect(catalogMocks.unpublishPartnerCatalogItem).toHaveBeenCalledWith(
        'supplier-org',
        'catalog-1',
      );
    });
  });
});

function getDialogInput(dialog: HTMLElement, labelText: string): HTMLInputElement {
  const label = Array.from(dialog.querySelectorAll('label')).find((candidate) =>
    candidate.textContent.startsWith(labelText),
  );
  const input = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Expected dialog input labelled ${labelText}.`);
  }
  return input;
}
