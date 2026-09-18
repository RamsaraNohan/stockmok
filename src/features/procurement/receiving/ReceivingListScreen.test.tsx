// @vitest-environment jsdom

import type { PurchaseOrder } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRepositories } from '@/services/data/useRepositories';

import { ReceivingListScreen } from './ReceivingListScreen';

vi.mock('@/services/data/useRepositories', () => ({ useRepositories: vi.fn() }));

/**
 * Faithful Firestore Timestamp stand-in: the wire shape the SDK actually hands
 * back is a class instance whose own enumerable keys are `seconds` and
 * `nanoseconds`. Rendering that object directly is what raised React error #31
 * against the wide QA dataset, so the double must keep those keys.
 */
function timestamp(iso: string): PurchaseOrder['expectedDate'] {
  const millis = new Date(iso).getTime();
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
    toDate: () => new Date(millis),
    toMillis: () => millis,
  };
}

const EXPECTED_ISO = '2026-08-25T00:00:00.000Z';

function formatted(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

function order(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    purchaseOrderId: 'po-1',
    orderNumber: 'PO-0042',
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Green Farm Poultry',
    status: 'ORDERED',
    currency: 'LKR',
    totalMinor: 6_000_000,
    isProjection: false,
    createdBy: 'user-1',
    createdAt: timestamp('2026-08-20T00:00:00.000Z'),
    expectedDate: timestamp(EXPECTED_ISO),
    ...overrides,
  } as PurchaseOrder;
}

function createRepositories(listOrders: ReturnType<typeof vi.fn>) {
  return {
    procurement: { listOrders },
  } as unknown as NonNullable<ReturnType<typeof useRepositories>>;
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/app/qa-wide-01/procurement/receiving']}>
      <QueryClientProvider client={client}>
        <ReceivingListScreen />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ReceivingListScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a Firestore Timestamp expected date as readable text', async () => {
    const listOrders = vi.fn().mockResolvedValue({ items: [order()], nextCursor: null });
    vi.mocked(useRepositories).mockReturnValue(createRepositories(listOrders));

    renderScreen();

    expect(await screen.findByText('PO-0042')).toBeTruthy();
    expect(screen.getByText(formatted(EXPECTED_ISO))).toBeTruthy();
    // The raw Timestamp object must never reach the DOM.
    expect(document.body.textContent).not.toContain('seconds');
    expect(document.body.textContent).not.toContain('[object');
  });

  it('renders ORDERED rows normally', async () => {
    const listOrders = vi.fn().mockResolvedValue({ items: [order()], nextCursor: null });
    vi.mocked(useRepositories).mockReturnValue(createRepositories(listOrders));

    renderScreen();

    expect(await screen.findByText('PO-0042')).toBeTruthy();
    expect(screen.getByText('Green Farm Poultry')).toBeTruthy();
    expect(screen.getByText('ORDERED')).toBeTruthy();
    expect(listOrders).toHaveBeenCalledWith(['ORDERED']);
  });

  it('renders "-" when the expected date is missing', async () => {
    const listOrders = vi
      .fn()
      .mockResolvedValue({ items: [order({ expectedDate: undefined })], nextCursor: null });
    vi.mocked(useRepositories).mockReturnValue(createRepositories(listOrders));

    renderScreen();

    expect(await screen.findByText('PO-0042')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('renders PARTIALLY_RECEIVED rows with a Timestamp expected date', async () => {
    const listOrders = vi.fn().mockImplementation((statuses: readonly string[]) =>
      Promise.resolve({
        items: [
          order({
            purchaseOrderId: 'po-2',
            orderNumber: 'PO-0043',
            status: statuses[0] as PurchaseOrder['status'],
          }),
        ],
        nextCursor: null,
      }),
    );
    vi.mocked(useRepositories).mockReturnValue(createRepositories(listOrders));

    renderScreen();
    expect(await screen.findByText('PO-0043')).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'PARTIALLY_RECEIVED' } });

    await waitFor(() => {
      expect(listOrders).toHaveBeenCalledWith(['PARTIALLY_RECEIVED']);
    });
    expect(await screen.findByText('PARTIALLY_RECEIVED')).toBeTruthy();
    expect(screen.getByText(formatted(EXPECTED_ISO))).toBeTruthy();
  });
});
