import { clsx } from 'clsx';
import {
  BarChart3,
  Box,
  Building2,
  FolderTree,
  Globe,
  Home,
  Link2,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';

export interface NavItem {
  readonly label: string;
  readonly pathSuffix: string;
  readonly icon: typeof Home;
}

export function DesktopSidebar() {
  const { activeMembership, activeRole, activeSettings } = useWorkspace();

  if (!activeMembership) return null;

  const handle = activeMembership.handle;
  const isNetworkEnabled = activeSettings?.networkEnabled ?? false;
  const role = activeRole ?? 'VIEWER';

  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  // Navigation filtering according to reconciled role matrix
  const showProducts = [
    'OWNER',
    'ADMIN',
    'INVENTORY_MANAGER',
    'STOREKEEPER',
    'ANALYST',
    'VIEWER',
  ].includes(role);
  const showCategories = ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'].includes(role);
  const showWarehouses = ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'].includes(role);
  const showMovements = ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST'].includes(
    role,
  );
  const showPOs = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER', 'ANALYST'].includes(role);
  const showReceiving = [
    'OWNER',
    'ADMIN',
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'STOREKEEPER',
  ].includes(role);
  const showPartners = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'].includes(role);
  const showNetwork = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'].includes(role) && isNetworkEnabled;
  const showReports = [
    'OWNER',
    'ADMIN',
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'ANALYST',
    'VIEWER',
  ].includes(role);
  const showTeam = isOwnerOrAdmin;
  const showSettings = isOwnerOrAdmin;

  return (
    <aside className="border-border bg-surface w-64 shrink-0 border-r max-lg:hidden min-h-[calc(100vh-4rem)]">
      <nav aria-label="Main Navigation" className="flex flex-col gap-1 p-4">
        <NavLink
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
              isActive
                ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                : 'text-text-muted hover:bg-background hover:text-text',
            )
          }
          to={`/app/${handle}/dashboard`}
        >
          <Home className="size-5" />
          <span>Dashboard</span>
        </NavLink>

        {showProducts && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/inventory/products`}
          >
            <Package className="size-5" />
            <span>Products</span>
          </NavLink>
        )}

        {showCategories && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/inventory/categories`}
          >
            <FolderTree className="size-5" />
            <span>Categories</span>
          </NavLink>
        )}

        {showWarehouses && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/inventory/warehouses`}
          >
            <Warehouse className="size-5" />
            <span>Warehouses</span>
          </NavLink>
        )}

        {showMovements && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/inventory/movements`}
          >
            <Box className="size-5" />
            <span>Stock Movements</span>
          </NavLink>
        )}

        {showPOs && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/procurement/purchase-orders`}
          >
            <ShoppingCart className="size-5" />
            <span>Purchase Orders</span>
          </NavLink>
        )}

        {showReceiving && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/procurement/receiving`}
          >
            <Truck className="size-5" />
            <span>Receiving</span>
          </NavLink>
        )}

        {showPartners && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/procurement/suppliers`}
          >
            <Building2 className="size-5" />
            <span>Suppliers & Buyers</span>
          </NavLink>
        )}

        {showNetwork && (
          <>
            <div className="text-text-muted mt-4 px-3 text-xs font-extrabold tracking-wider uppercase">
              Network
            </div>
            <NavLink
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                    : 'text-text-muted hover:bg-background hover:text-text',
                )
              }
              to={`/app/${handle}/network/connections`}
            >
              <Globe className="size-5" />
              <span>Connected Businesses</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                    : 'text-text-muted hover:bg-background hover:text-text',
                )
              }
              to={`/app/${handle}/network/partner-catalog`}
            >
              <Package className="size-5" />
              <span>Partner Catalog</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                    : 'text-text-muted hover:bg-background hover:text-text',
                )
              }
              to={`/app/${handle}/network/mappings`}
            >
              <Link2 className="size-5" />
              <span>Product Mappings</span>
            </NavLink>
          </>
        )}

        <div className="text-text-muted mt-4 px-3 text-xs font-extrabold tracking-wider uppercase">
          General
        </div>

        {showReports && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/reports`}
          >
            <BarChart3 className="size-5" />
            <span>Reports</span>
          </NavLink>
        )}

        {showTeam && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/team`}
          >
            <Users className="size-5" />
            <span>Team</span>
          </NavLink>
        )}

        {showSettings && (
          <NavLink
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                  : 'text-text-muted hover:bg-background hover:text-text',
              )
            }
            to={`/app/${handle}/settings`}
          >
            <Settings className="size-5" />
            <span>Settings</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
