import * as Dialog from '@radix-ui/react-dialog';
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
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Monogram } from '@/ui/primitives/Monogram';

export interface MobileDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { activeMembership, activeRole, activeSettings } = useWorkspace();

  if (!activeMembership) return null;

  const handle = activeMembership.handle;
  const isNetworkEnabled = activeSettings?.networkEnabled ?? false;
  const role = activeRole ?? 'VIEWER';

  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

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
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden" />
        <Dialog.Content className="bg-surface border-border fixed top-0 bottom-0 left-0 z-50 w-[280px] max-w-[calc(100vw-3rem)] border-r shadow-2xl transition-transform lg:hidden flex flex-col focus:outline-none">
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Monogram
                color={activeMembership.monogramColor}
                size="sm"
                text={activeMembership.monogram}
              />
              <span className="text-text font-bold text-sm truncate max-w-[160px]">
                {activeMembership.organizationName}
              </span>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close navigation drawer"
                className="hover:bg-background focus-visible:outline-primary rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Title className="sr-only">Mobile Navigation Drawer</Dialog.Title>
          <Dialog.Description className="sr-only">
            Navigation menu links for active workspace
          </Dialog.Description>

          <nav
            aria-label="Mobile Navigation"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-1"
          >
            <NavLink
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                    : 'text-text-muted hover:bg-background hover:text-text',
                )
              }
              onClick={onClose}
              to={`/app/${handle}/dashboard`}
            >
              <Home className="size-5" />
              <span>Dashboard</span>
            </NavLink>

            {showProducts && (
              <NavLink
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                      isActive
                        ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                        : 'text-text-muted hover:bg-background hover:text-text',
                    )
                  }
                  onClick={onClose}
                  to={`/app/${handle}/network/connections`}
                >
                  <Globe className="size-5" />
                  <span>Connected Businesses</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                      isActive
                        ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                        : 'text-text-muted hover:bg-background hover:text-text',
                    )
                  }
                  onClick={onClose}
                  to={`/app/${handle}/network/partner-catalog`}
                >
                  <Package className="size-5" />
                  <span>Partner Catalog</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                      isActive
                        ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                        : 'text-text-muted hover:bg-background hover:text-text',
                    )
                  }
                  onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
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
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-primary min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-muted hover:bg-background hover:text-text',
                  )
                }
                onClick={onClose}
                to={`/app/${handle}/settings`}
              >
                <Settings className="size-5" />
                <span>Settings</span>
              </NavLink>
            )}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
