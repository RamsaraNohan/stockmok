// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductDetailScreen } from '@/features/inventory/products/ProductDetailScreen';
import { router } from '@/app/router';
import {
  executeStockRecordOpeningBalanceCommand,
  executeStockAdjustCommand,
  executeStockTransferCommand,
} from '@/services/stock/stockService';
import * as fs from 'fs';
import * as path from 'path';

// Mock react-router-dom with partial mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useParams: () => ({ handle: 'test-org', productId: 'prod-123' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock workspace hook
let mockActiveRole = 'OWNER';
const mockActiveOrg = { organizationId: 'org-123' };
vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    activeRole: mockActiveRole,
    activeOrg: mockActiveOrg,
  }),
}));

// Mock react-query with partial mock to keep QueryClient etc.
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useQuery: vi.fn(),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

import { useQuery } from '@tanstack/react-query';

// Mock repositories hook
vi.mock('@/services/data/useRepositories', () => ({
  useRepositories: () => ({
    inventory: {
      getProduct: async () => ({ productId: 'prod-123', name: 'Rice', status: 'ACTIVE', baseUnit: 'KG', categoryId: 'cat-1' }),
      getSummary: async () => ({ onHandMilli: 0 }),
      listCategories: async () => ({ items: [{ categoryId: 'cat-1', name: 'Food' }], nextCursor: null }),
      listProductBalances: async () => ({ items: [{ warehouseId: 'wh-1', onHandMilli: 0, unit: 'KG' }], nextCursor: null }),
      listProductAudit: async () => ({ items: [], nextCursor: null }),
    },
    settings: {
      listWarehouses: async () => ({ items: [{ warehouseId: 'wh-1', name: 'Main Store', status: 'ACTIVE' }], nextCursor: null }),
    },
    movements: {
      list: async () => ({ items: [{ movementId: 'mov-1', warehouseId: 'wh-1', movementType: 'ADJUSTMENT_IN' }], nextCursor: null }),
    },
    network: {
      listProductMappings: async () => ({ items: [], nextCursor: null }),
    },
  }),
}));

// Mock firebase functions to verify envelopes
const mockHttpsCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockHttpsCallable),
}));

// Mock firebase client
vi.mock('@/data/firebase/client', () => ({
  functions: {},
}));

describe('F3 Stock Operations Frontend Certification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveRole = 'OWNER';
    window.alert = vi.fn();

    // Default useQuery mock implementation
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0];
      if (key === 'product') {
        return {
          data: { productId: 'prod-123', name: 'Rice', status: 'ACTIVE', baseUnit: 'KG', categoryId: 'cat-1' },
          isLoading: false,
          isError: false,
        } as any;
      }
      if (key === 'productSummary') {
        return { data: { onHandMilli: 0 }, isLoading: false } as any;
      }
      if (key === 'categories') {
        return { data: { items: [{ categoryId: 'cat-1', name: 'Food' }] }, isLoading: false } as any;
      }
      if (key === 'warehouses') {
        return {
          data: { items: [{ warehouseId: 'wh-1', name: 'Main Store', status: 'ACTIVE' }, { warehouseId: 'wh-2', name: 'Cold Room', status: 'ACTIVE' }] },
          isLoading: false,
        } as any;
      }
      if (key === 'productBalances') {
        return { data: { items: [{ warehouseId: 'wh-1', onHandMilli: 0, unit: 'KG' }, { warehouseId: 'wh-2', onHandMilli: 0, unit: 'KG' }] }, isLoading: false } as any;
      }
      if (key === 'movements') {
        return { data: { items: [{ movementId: 'mov-1', warehouseId: 'wh-1', movementType: 'ADJUSTMENT_IN' }] }, isLoading: false } as any;
      }
      return { data: null, isLoading: false, isError: false } as any;
    });
  });

  describe('OPENING BALANCE', () => {
    it('1. Authorized role does NOT lose the action because local/read data indicates previous stock history', async () => {
      render(<ProductDetailScreen />);
      
      // Navigate to Stock tab
      const stockTab = screen.getByRole('button', { name: /Stock by store room/i });
      fireEvent.click(stockTab);

      // Even though movements (history) exists, we expect the "Opening Balance" button to be visible
      const buttons = screen.getAllByRole('button', { name: /Opening Balance/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('2. Frontend does not treat movement/history state as authoritative C13 eligibility', () => {
      // Checked via the test above: we do not read movements/history to disable/hide the button.
      // We will perform a static check on ProductDetailScreen to ensure no "hasStockHistory" or movements-based eligibility logic is present.
      const componentPath = path.resolve(__dirname, '../src/features/inventory/products/ProductDetailScreen.tsx');
      const content = fs.readFileSync(componentPath, 'utf8');
      expect(content).not.toContain('hasStockHistory');
      expect(content).not.toContain('!hasStockHistory');
    });

    it('3. C13 uses exact approved command envelope', async () => {
      mockHttpsCallable.mockResolvedValueOnce({ data: { ok: true } });

      await executeStockRecordOpeningBalanceCommand('org-123', {
        productId: 'prod-123',
        warehouseId: 'wh-1',
        quantityMilli: 10000,
        effectiveAtMillis: 1692500000000,
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        orgId: 'org-123',
        operationId: expect.any(String),
        payload: {
          productId: 'prod-123',
          warehouseId: 'wh-1',
          quantityMilli: 10000,
          effectiveAt: expect.any(Object), // Timestamp
        },
      });
    });

    it('4. Unauthorized roles cannot invoke C13', () => {
      // In router, product/category/warehouse/stock/transfer write is allowed for OWNER, ADMIN, INVENTORY_MANAGER
      const appRoute = router.routes.find((r) => r.path === '/app/:handle');
      const productsNewRoute = appRoute?.children?.find((c) => c.path === 'inventory/products/new');
      const allowedRoles = (productsNewRoute?.element as any)?.props.allowedRoles ?? [];
      
      expect(allowedRoles).toContain('OWNER');
      expect(allowedRoles).toContain('ADMIN');
      expect(allowedRoles).toContain('INVENTORY_MANAGER');
      expect(allowedRoles).not.toContain('STOREKEEPER');
      expect(allowedRoles).not.toContain('ANALYST');
      expect(allowedRoles).not.toContain('VIEWER');
    });

    it('5. C13 rejection uses normalized error handling', async () => {
      mockHttpsCallable.mockRejectedValueOnce(new Error('Firebase callable error'));
      
      await expect(
        executeStockRecordOpeningBalanceCommand('org-123', {
          productId: 'prod-123',
          warehouseId: 'wh-1',
          quantityMilli: 10000,
          effectiveAtMillis: 1692500000000,
        })
      ).rejects.toThrow('Firebase callable error');
    });

    it('6. No local authoritative balance mutation occurs after C13', () => {
      // Ensure that we only trigger react-query invalidation and no manual balance state modification
      const dialogPath = path.resolve(__dirname, '../src/features/stock/OpeningBalanceDialog.tsx');
      const content = fs.readFileSync(dialogPath, 'utf8');
      
      expect(content).toContain('invalidateQueries');
      expect(content).not.toContain('onHandMilli =');
      expect(content).not.toContain('setStockBalance');
    });
  });

  describe('ADJUSTMENT', () => {
    it('7. C14 exact envelope remains correct', async () => {
      mockHttpsCallable.mockResolvedValueOnce({ data: { ok: true } });

      await executeStockAdjustCommand('org-123', {
        productId: 'prod-123',
        warehouseId: 'wh-1',
        signedQuantityMilli: -5000,
        adjustmentReason: 'WASTAGE',
        note: 'Some note',
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        orgId: 'org-123',
        operationId: expect.any(String),
        payload: {
          productId: 'prod-123',
          warehouseId: 'wh-1',
          signedQuantityMilli: -5000,
          adjustmentReason: 'WASTAGE',
          note: 'Some note',
        },
      });
    });

    it('8. No direct StockBalance/StockMovement write', () => {
      // Scan adjustment dialog for direct writes
      const dialogPath = path.resolve(__dirname, '../src/features/stock/StockAdjustmentDialog.tsx');
      const content = fs.readFileSync(dialogPath, 'utf8');
      
      expect(content).not.toContain('setDoc');
      expect(content).not.toContain('addDoc');
      expect(content).not.toContain('updateDoc');
      expect(content).not.toContain('deleteDoc');
    });

    it('9. Successful command uses governed invalidation/refetch rather than local arithmetic', () => {
      const dialogPath = path.resolve(__dirname, '../src/features/stock/StockAdjustmentDialog.tsx');
      const content = fs.readFileSync(dialogPath, 'utf8');
      
      expect(content).toContain('invalidateQueries');
      expect(content).not.toContain('onHandMilli =');
    });
  });

  describe('TRANSFER', () => {
    it('10. C33 exact envelope remains correct', async () => {
      mockHttpsCallable.mockResolvedValueOnce({ data: { ok: true } });

      await executeStockTransferCommand('org-123', {
        productId: 'prod-123',
        sourceWarehouseId: 'wh-1',
        destinationWarehouseId: 'wh-2',
        quantityMilli: 3000,
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        orgId: 'org-123',
        operationId: expect.any(String),
        payload: {
          productId: 'prod-123',
          sourceWarehouseId: 'wh-1',
          destinationWarehouseId: 'wh-2',
          quantityMilli: 3000,
        },
      });
    });

    it('11. Transfer is not implemented as two adjustments', () => {
      const dialogPath = path.resolve(__dirname, '../src/features/stock/StockTransferDialog.tsx');
      const content = fs.readFileSync(dialogPath, 'utf8');
      
      expect(content).toContain('executeStockTransferCommand');
      expect(content).not.toContain('executeStockAdjustCommand');
    });

    it('12. No direct stock write', () => {
      const dialogPath = path.resolve(__dirname, '../src/features/stock/StockTransferDialog.tsx');
      const content = fs.readFileSync(dialogPath, 'utf8');
      
      expect(content).not.toContain('setDoc');
      expect(content).not.toContain('addDoc');
      expect(content).not.toContain('updateDoc');
      expect(content).not.toContain('deleteDoc');
    });
  });

  describe('MOVEMENT HISTORY', () => {
    it('13. Movement query path remains governed through C2/@stockmok/data', () => {
      const screenPath = path.resolve(__dirname, '../src/features/movements/MovementHistoryScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');
      
      expect(content).toContain('repositories.movements.list');
    });

    it('14. Unauthorized query execution remains ZERO', () => {
      // Check router for Movements route guard
      const appRoute = router.routes.find((r) => r.path === '/app/:handle');
      const movementsRoute = appRoute?.children?.find((c) => c.path === 'inventory/movements');
      const allowedRoles = (movementsRoute?.element as any)?.props.allowedRoles ?? [];
      
      expect(allowedRoles).not.toContain('VIEWER');
    });
  });
});
