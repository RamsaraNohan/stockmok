import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AuthGuard } from '@/app/guards/AuthGuard';
import { GuestGuard } from '@/app/guards/GuestGuard';
import { NetworkFeatureGuard } from '@/app/guards/NetworkFeatureGuard';
import { RoleGuard } from '@/app/guards/RoleGuard';
import { WorkspaceGuard } from '@/app/guards/WorkspaceGuard';
const AcceptInviteScreen = lazy(() =>
  import('@/features/auth/AcceptInviteScreen').then((m) => ({ default: m.AcceptInviteScreen })),
);
const BrandedLoginScreen = lazy(() =>
  import('@/features/auth/BrandedLoginScreen').then((m) => ({ default: m.BrandedLoginScreen })),
);
const LandingScreen = lazy(() =>
  import('@/features/auth/LandingScreen').then((m) => ({ default: m.LandingScreen })),
);
const SignInScreen = lazy(() =>
  import('@/features/auth/SignInScreen').then((m) => ({ default: m.SignInScreen })),
);
const SignUpScreen = lazy(() =>
  import('@/features/auth/SignUpScreen').then((m) => ({ default: m.SignUpScreen })),
);
const NotFoundScreen = lazy(() =>
  import('@/features/exceptions/NotFoundScreen').then((m) => ({ default: m.NotFoundScreen })),
);
const OnboardingScreen = lazy(() =>
  import('@/features/onboarding/OnboardingScreen').then((m) => ({ default: m.OnboardingScreen })),
);
const WorkspaceSelectorScreen = lazy(() =>
  import('@/features/onboarding/WorkspaceSelectorScreen').then((m) => ({
    default: m.WorkspaceSelectorScreen,
  })),
);
import { AuthProvider } from '@/services/auth/AuthContext';
import { isEmulatorMode } from '@/services/runtime/environment';
import { WorkspaceProvider } from '@/services/workspace/WorkspaceContext';
import { EmulatorRibbon } from '@/ui/EmulatorRibbon';
const OrgLayout = lazy(() =>
  import('@/ui/shell/OrgLayout').then((m) => ({ default: m.OrgLayout })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DashboardScreen = lazy(() =>
  import('@/features/dashboard/DashboardScreen').then((m) => ({ default: m.DashboardScreen })),
);
const ProductListScreen = lazy(() =>
  import('@/features/inventory/products/ProductListScreen').then((m) => ({
    default: m.ProductListScreen,
  })),
);
const ProductCreateScreen = lazy(() =>
  import('@/features/inventory/products/ProductCreateScreen').then((m) => ({
    default: m.ProductCreateScreen,
  })),
);
const ProductDetailScreen = lazy(() =>
  import('@/features/inventory/products/ProductDetailScreen').then((m) => ({
    default: m.ProductDetailScreen,
  })),
);
const ProductEditScreen = lazy(() =>
  import('@/features/inventory/products/ProductEditScreen').then((m) => ({
    default: m.ProductEditScreen,
  })),
);
const CategoryListScreen = lazy(() =>
  import('@/features/inventory/categories/CategoryListScreen').then((m) => ({
    default: m.CategoryListScreen,
  })),
);
const SupplierListScreen = lazy(() =>
  import('@/features/procurement/partners/SupplierListScreen').then((m) => ({
    default: m.SupplierListScreen,
  })),
);
const BuyerListScreen = lazy(() =>
  import('@/features/procurement/partners/BuyerListScreen').then((m) => ({
    default: m.BuyerListScreen,
  })),
);
const PartnerCreateScreen = lazy(() =>
  import('@/features/procurement/partners/PartnerCreateScreen').then((m) => ({
    default: m.PartnerCreateScreen,
  })),
);
const PartnerDetailScreen = lazy(() =>
  import('@/features/procurement/partners/PartnerDetailScreen').then((m) => ({
    default: m.PartnerDetailScreen,
  })),
);
const PurchaseOrderListScreen = lazy(() =>
  import('@/features/procurement/purchase-orders/PurchaseOrderListScreen').then((m) => ({
    default: m.PurchaseOrderListScreen,
  })),
);
const PurchaseOrderCreateScreen = lazy(() =>
  import('@/features/procurement/purchase-orders/PurchaseOrderCreateScreen').then((m) => ({
    default: m.PurchaseOrderCreateScreen,
  })),
);
const PurchaseOrderRouteScreen = lazy(() =>
  import('@/features/connected-orders/PurchaseOrderRouteScreen').then((m) => ({
    default: m.PurchaseOrderRouteScreen,
  })),
);
const ReceivingListScreen = lazy(() =>
  import('@/features/procurement/receiving/ReceivingListScreen').then((m) => ({
    default: m.ReceivingListScreen,
  })),
);
const ReceiveOrderRouteScreen = lazy(() =>
  import('@/features/connected-orders/ReceiveOrderRouteScreen').then((m) => ({
    default: m.ReceiveOrderRouteScreen,
  })),
);
const WarehouseListScreen = lazy(() =>
  import('@/features/inventory/warehouses/WarehouseListScreen').then((m) => ({
    default: m.WarehouseListScreen,
  })),
);
const MovementHistoryScreen = lazy(() =>
  import('@/features/movements/MovementHistoryScreen').then((m) => ({
    default: m.MovementHistoryScreen,
  })),
);
const ConnectedBusinessesScreen = lazy(() =>
  import('@/features/network/ConnectedBusinessesScreen').then((m) => ({
    default: m.ConnectedBusinessesScreen,
  })),
);
const ConnectionDetailScreen = lazy(() =>
  import('@/features/network/ConnectionDetailScreen').then((m) => ({
    default: m.ConnectionDetailScreen,
  })),
);
const SupplierPartnerCatalogScreen = lazy(() =>
  import('@/features/catalog/SupplierPartnerCatalogScreen').then((m) => ({
    default: m.SupplierPartnerCatalogScreen,
  })),
);
const BuyerPartnerCatalogScreen = lazy(() =>
  import('@/features/catalog/BuyerPartnerCatalogScreen').then((m) => ({
    default: m.BuyerPartnerCatalogScreen,
  })),
);
const ProductMappingsScreen = lazy(() =>
  import('@/features/mappings/ProductMappingsScreen').then((m) => ({
    default: m.ProductMappingsScreen,
  })),
);
const ProductMappingWizardScreen = lazy(() =>
  import('@/features/mappings/ProductMappingWizardScreen').then((m) => ({
    default: m.ProductMappingWizardScreen,
  })),
);
const NotificationsScreen = lazy(() =>
  import('@/features/notifications/NotificationsScreen').then((m) => ({
    default: m.NotificationsScreen,
  })),
);
const ReportsScreen = lazy(() =>
  import('@/features/reports/ReportsScreen').then((m) => ({ default: m.ReportsScreen })),
);
const SettingsScreen = lazy(() =>
  import('@/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const TeamScreen = lazy(() =>
  import('@/features/team/TeamScreen').then((m) => ({ default: m.TeamScreen })),
);
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
        <Suspense
          fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
        >
          <LandingScreen />
        </Suspense>
      </GuestGuard>
    ),
  },
  {
    path: '/signup',
    element: (
      <GuestGuard>
        <Suspense
          fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
        >
          <SignUpScreen />
        </Suspense>
      </GuestGuard>
    ),
  },
  {
    path: '/login',
    element: (
      <GuestGuard>
        <Suspense
          fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
        >
          <SignInScreen />
        </Suspense>
      </GuestGuard>
    ),
  },
  {
    path: '/b/:handle',
    element: (
      <Suspense
        fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
      >
        <BrandedLoginScreen />
      </Suspense>
    ),
  },
  {
    path: '/invite/:token',
    element: (
      <Suspense
        fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
      >
        <AcceptInviteScreen />
      </Suspense>
    ),
  },
  {
    path: '/select-workspace',
    element: (
      <AuthGuard>
        <Suspense
          fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
        >
          <WorkspaceSelectorScreen />
        </Suspense>
      </AuthGuard>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <AuthGuard>
        <Suspense
          fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
        >
          <OnboardingScreen />
        </Suspense>
      </AuthGuard>
    ),
  },
  {
    path: '/app/:handle',
    element: (
      <AuthGuard>
        <WorkspaceGuard>
          <Suspense
            fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
          >
            <OrgLayout />
          </Suspense>
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
    element: (
      <Suspense
        fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
      >
        <NotFoundScreen />
      </Suspense>
    ),
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
