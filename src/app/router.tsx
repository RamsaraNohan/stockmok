import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AuthGuard } from '@/app/guards/AuthGuard';
import { GuestGuard } from '@/app/guards/GuestGuard';
import { NetworkFeatureGuard } from '@/app/guards/NetworkFeatureGuard';
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
import { PurchaseOrderRouteScreen } from '@/features/connected-orders/PurchaseOrderRouteScreen';
import { ReceivingListScreen } from '@/features/procurement/receiving/ReceivingListScreen';
import { ReceiveOrderRouteScreen } from '@/features/connected-orders/ReceiveOrderRouteScreen';
import { WarehouseListScreen } from '@/features/inventory/warehouses/WarehouseListScreen';
import { MovementHistoryScreen } from '@/features/movements/MovementHistoryScreen';
import { ConnectedBusinessesScreen } from '@/features/network/ConnectedBusinessesScreen';
import { ConnectionDetailScreen } from '@/features/network/ConnectionDetailScreen';
import { SupplierPartnerCatalogScreen } from '@/features/catalog/SupplierPartnerCatalogScreen';
import { BuyerPartnerCatalogScreen } from '@/features/catalog/BuyerPartnerCatalogScreen';
import { ProductMappingsScreen } from '@/features/mappings/ProductMappingsScreen';
import { ProductMappingWizardScreen } from '@/features/mappings/ProductMappingWizardScreen';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
import { ReportsScreen } from '@/features/reports/ReportsScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { TeamScreen } from '@/features/team/TeamScreen';
import { useWorkspace } from '@/services/workspace/useWorkspace';

function SettingsRouteScreen() {
  const { refreshWorkspaceData } = useWorkspace();
  return (
    <SettingsScreen
      onSettingsUpdated={() => {
        void refreshWorkspaceData();
      }}
    />
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
            <PurchaseOrderRouteScreen />
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
          <NetworkFeatureGuard>
            <ConnectedBusinessesScreen />
          </NetworkFeatureGuard>
        ),
      },
      {
        path: 'network/connections/:connectionId',
        element: (
          <NetworkFeatureGuard>
            <ConnectionDetailScreen />
          </NetworkFeatureGuard>
        ),
      },
      {
        path: 'network/partner-catalog',
        element: (
          <NetworkFeatureGuard>
            <SupplierPartnerCatalogScreen />
          </NetworkFeatureGuard>
        ),
      },
      {
        path: 'network/partner-catalog/:supplierOrgId',
        element: (
          <NetworkFeatureGuard>
            <BuyerPartnerCatalogScreen />
          </NetworkFeatureGuard>
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
            <ReceiveOrderRouteScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'network/mappings',
        element: (
          <NetworkFeatureGuard>
            <ProductMappingsScreen />
          </NetworkFeatureGuard>
        ),
      },
      {
        path: 'network/mappings/new',
        element: (
          <NetworkFeatureGuard>
            <ProductMappingWizardScreen />
          </NetworkFeatureGuard>
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
              'STOREKEEPER',
              'ANALYST',
              'VIEWER',
            ]}
          >
            <ReportsScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'notifications',
        element: <NotificationsScreen />,
      },
      {
        path: 'team',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <TeamScreen />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <SettingsRouteScreen />
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
