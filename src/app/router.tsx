import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AuthGuard } from '@/app/guards/AuthGuard';
import { GuestGuard } from '@/app/guards/GuestGuard';
import { RoleGuard } from '@/app/guards/RoleGuard';
import { WorkspaceGuard } from '@/app/guards/WorkspaceGuard';
import { AcceptInviteScreen } from '@/features/auth/AcceptInviteScreen';
import { BrandedLoginScreen } from '@/features/auth/BrandedLoginScreen';
import { LandingScreen } from '@/features/auth/LandingScreen';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { SignUpScreen } from '@/features/auth/SignUpScreen';
import { NotFoundScreen } from '@/features/exceptions/NotFoundScreen';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { WorkspaceSelectorScreen } from '@/features/onboarding/WorkspaceSelectorScreen';
import { AuthProvider } from '@/services/auth/AuthContext';
import { isEmulatorMode } from '@/services/runtime/environment';
import { WorkspaceProvider } from '@/services/workspace/WorkspaceContext';
import { EmulatorRibbon } from '@/ui/EmulatorRibbon';
import { OrgLayout } from '@/ui/shell/OrgLayout';
import { PageHeader } from '@/ui/shell/PageHeader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { ProductListScreen } from '@/features/inventory/products/ProductListScreen';
import { ProductCreateScreen } from '@/features/inventory/products/ProductCreateScreen';
import { ProductDetailScreen } from '@/features/inventory/products/ProductDetailScreen';
import { ProductEditScreen } from '@/features/inventory/products/ProductEditScreen';
import { CategoryListScreen } from '@/features/inventory/categories/CategoryListScreen';
import { SupplierListScreen } from '@/features/procurement/partners/SupplierListScreen';
import { BuyerListScreen } from '@/features/procurement/partners/BuyerListScreen';
import { PartnerCreateScreen } from '@/features/procurement/partners/PartnerCreateScreen';
import { PartnerDetailScreen } from '@/features/procurement/partners/PartnerDetailScreen';
import { PurchaseOrderListScreen } from '@/features/procurement/purchase-orders/PurchaseOrderListScreen';
import { PurchaseOrderCreateScreen } from '@/features/procurement/purchase-orders/PurchaseOrderCreateScreen';
import { PurchaseOrderDetailScreen } from '@/features/procurement/purchase-orders/PurchaseOrderDetailScreen';
import { ReceivingListScreen } from '@/features/procurement/receiving/ReceivingListScreen';
import { ReceiveOrderScreen } from '@/features/procurement/receiving/ReceiveOrderScreen';
import { WarehouseListScreen } from '@/features/inventory/warehouses/WarehouseListScreen';
import { MovementHistoryScreen } from '@/features/movements/MovementHistoryScreen';

function SectionPlaceholder({ title }: { readonly title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="bg-surface border-border rounded-panel border p-8 text-center text-text-muted text-sm shadow-sm">
        {title} shell navigation entry. Content implementation is scheduled for subsequent phase
        modules.
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <GuestGuard>
        <LandingScreen />
      </GuestGuard>
    ),
  },
  {
    path: '/signup',
    element: (
      <GuestGuard>
        <SignUpScreen />
      </GuestGuard>
    ),
  },
  {
    path: '/login',
    element: (
      <GuestGuard>
        <SignInScreen />
      </GuestGuard>
    ),
  },
  {
    path: '/b/:handle',
    element: <BrandedLoginScreen />,
  },
  {
    path: '/invite/:token',
    element: <AcceptInviteScreen />,
  },
  {
    path: '/select-workspace',
    element: (
      <AuthGuard>
        <WorkspaceSelectorScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <AuthGuard>
        <OnboardingScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/app/:handle',
    element: (
      <AuthGuard>
        <WorkspaceGuard>
          <OrgLayout />
        </WorkspaceGuard>
      </AuthGuard>
    ),
    children: [
      {
        path: '',
        element: <Navigate replace to="dashboard" />,
      },
      {
        path: 'dashboard',
        element: <DashboardScreen />,
      },
      {
        path: 'inventory/products',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'INVENTORY_MANAGER',
              'PROCUREMENT_MANAGER',
              'STOREKEEPER',
              'ANALYST',
              'VIEWER',
            ]}
          >
            <ProductListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/products/new',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
            <ProductCreateScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/products/:productId',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'INVENTORY_MANAGER',
              'PROCUREMENT_MANAGER',
              'STOREKEEPER',
              'ANALYST',
              'VIEWER',
            ]}
          >
            <ProductDetailScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/products/:productId/edit',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
            <ProductEditScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/categories',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
            <CategoryListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/warehouses',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
            <WarehouseListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/movements',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'INVENTORY_MANAGER',
              'PROCUREMENT_MANAGER',
              'STOREKEEPER',
              'ANALYST',
            ]}
          >
            <MovementHistoryScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/purchase-orders',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'PROCUREMENT_MANAGER',
              'INVENTORY_MANAGER',
              'STOREKEEPER',
              'ANALYST',
            ]}
          >
            <PurchaseOrderListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/purchase-orders/new',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <PurchaseOrderCreateScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/purchase-orders/:poId',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'PROCUREMENT_MANAGER',
              'INVENTORY_MANAGER',
              'STOREKEEPER',
              'ANALYST',
            ]}
          >
            <PurchaseOrderDetailScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/suppliers',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <SupplierListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/suppliers/new',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <PartnerCreateScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/suppliers/:partnerId',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <PartnerDetailScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/buyers',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <BuyerListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/buyers/new',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <PartnerCreateScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/buyers/:partnerId',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <PartnerDetailScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'network/connections',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <SectionPlaceholder title="Connected Businesses" />
          </RoleGuard>
        ),
      },
      {
        path: 'network/partner-catalog',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <SectionPlaceholder title="Partner Catalog" />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/receiving',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'INVENTORY_MANAGER',
              'PROCUREMENT_MANAGER',
              'STOREKEEPER',
            ]}
          >
            <ReceivingListScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'procurement/receiving/:poId',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'INVENTORY_MANAGER',
              'PROCUREMENT_MANAGER',
              'STOREKEEPER',
            ]}
          >
            <ReceiveOrderScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'network/mappings',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER']}>
            <SectionPlaceholder title="Product Mappings" />
          </RoleGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleGuard
            allowedRoles={[
              'OWNER',
              'ADMIN',
              'INVENTORY_MANAGER',
              'PROCUREMENT_MANAGER',
              'ANALYST',
              'VIEWER',
            ]}
          >
            <SectionPlaceholder title="Reports" />
          </RoleGuard>
        ),
      },
      {
        path: 'team',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <SectionPlaceholder title="Team" />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <SectionPlaceholder title="Settings" />
          </RoleGuard>
        ),
      },
      {
        path: '*',
        element: <NotFoundScreen />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundScreen />,
  },
]);

export function AppRouter() {
  const useEmulators = isEmulatorMode(
    (import.meta.env as Record<string, string | undefined>).VITE_USE_EMULATORS,
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <a
            className="fixed top-2 left-2 z-50 -translate-y-[150%] rounded-control bg-primary px-3 py-2 text-surface focus:translate-y-0"
            href="#main-content"
          >
            Skip to main content
          </a>
          <EmulatorRibbon enabled={useEmulators} />
          <RouterProvider router={router} />
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
