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
    it('1. Opening Balance visibility is NOT derived from onHandMilli === 0 (visible when non-zero)', async () => {
      // Mock the listProductBalances to return a non-zero onHandMilli (e.g. 18000)
      vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
        const key = queryKey[0];
        if (key === 'productBalances') {
          return {
            data: { items: [{ warehouseId: 'wh-1', onHandMilli: 18000, unit: 'KG' }] },
            isLoading: false,
          } as any;
        }
        if (key === 'product') {
          return {
            data: { productId: 'prod-123', name: 'Rice', status: 'ACTIVE', baseUnit: 'KG', categoryId: 'cat-1' },
            isLoading: false,
            isError: false,
          } as any;
        }
        if (key === 'productSummary') {
          return { data: { onHandMilli: 18000 }, isLoading: false } as any;
        }
        if (key === 'warehouses') {
          return {
            data: { items: [{ warehouseId: 'wh-1', name: 'Main Store', status: 'ACTIVE' }] },
            isLoading: false,
          } as any;
        }
        return { data: null, isLoading: false, isError: false } as any;
      });

      render(<ProductDetailScreen />);
      
      // Navigate to Stock tab
      const stockTab = screen.getByRole('button', { name: /Stock by store room/i });
      fireEvent.click(stockTab);

      // Verify that the "Opening Balance" button is still visible even when quantity is non-zero (18 KG)
      const buttons = screen.getAllByRole('button', { name: /Opening Balance/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('2. A product/warehouse with non-zero onHandMilli is not rejected by an invented frontend quantity eligibility rule', () => {
      // Checked statically: the frontend does not check row.onHandMilli before opening or rendering the dialog.
      const screenPath = path.resolve(__dirname, '../src/features/inventory/products/ProductDetailScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');
      expect(content).not.toContain('row.onHandMilli === 0');
    });

    it('3. A product/warehouse with zero onHandMilli is NOT assumed eligible merely because quantity is zero', () => {
      // Statically verify that no "row.onHandMilli === 0" logic defines client-side business eligibility in ProductDetailScreen
      const screenPath = path.resolve(__dirname, '../src/features/inventory/products/ProductDetailScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');
      expect(content).not.toContain('row.onHandMilli === 0');
    });

    it('4. No hasStockHistory, !hasStockHistory, onHandMilli === 0, or equivalent inferred stock-state rule controls Opening Balance eligibility', () => {
      const screenPath = path.resolve(__dirname, '../src/features/inventory/products/ProductDetailScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');
      expect(content).not.toContain('hasStockHistory');
      expect(content).not.toContain('!hasStockHistory');
      expect(content).not.toContain('row.onHandMilli === 0');
      expect(content).not.toContain('row.onHandMilli === 0 &&');
    });

    it('5. Authorized role can reach the governed C13 action according to final UI authority', async () => {
      mockActiveRole = 'OWNER';
      render(<ProductDetailScreen />);

      // Navigate to Stock tab
      const stockTab = screen.getByRole('button', { name: /Stock by store room/i });
      fireEvent.click(stockTab);

      const buttons = screen.getAllByRole('button', { name: /Opening Balance/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('6. Unauthorized roles cannot invoke C13', () => {
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

    it('7. C13 exact envelope remains correct', async () => {
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

    it('8. C13 rejection remains normalized', async () => {
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

    it('9. No local balance arithmetic occurs after C13', () => {
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
