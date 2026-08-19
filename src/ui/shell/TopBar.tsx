import { Menu } from 'lucide-react';

import { isEmulatorMode } from '@/services/runtime/environment';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { EmulatorRibbon } from '@/ui/EmulatorRibbon';
import { NotificationFlyout } from '@/features/notifications/NotificationFlyout';

import { UserMenu } from './UserMenu';
import { WorkspaceDropdown } from './WorkspaceDropdown';

interface TopBarProps {
  readonly onOpenMobileDrawer?: () => void;
}

export function TopBar({ onOpenMobileDrawer }: TopBarProps) {
  const { activeMembership } = useWorkspace();
  const emulatorMode = isEmulatorMode(import.meta.env.VITE_USE_EMULATORS);

  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <EmulatorRibbon enabled={emulatorMode} />

      <div className="mx-auto flex min-h-16 w-[min(calc(100%-2rem),90rem)] items-center gap-4 max-md:w-[min(calc(100%-1.5rem),90rem)] max-md:gap-2">
        {/* Mobile menu trigger LINK-025 below 1024px */}
        <button
          aria-label="Open navigation menu"
          className="hover:bg-background focus-visible:outline-primary hidden rounded-lg p-2 max-lg:flex max-lg:items-center max-lg:justify-center cursor-pointer min-h-[44px] min-w-[44px]"
          onClick={onOpenMobileDrawer}
        >
          <Menu className="size-6" />
        </button>

        {/* Brand logo */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="bg-primary text-surface grid size-8 place-items-center rounded-lg font-extrabold"
          >
            S
          </span>
          <span className="text-text font-extrabold text-lg tracking-tight max-md:hidden">
            Stockmok
          </span>
        </div>

        {/* Workspace Dropdown */}
        {activeMembership && (
          <div className="ml-2">
            <WorkspaceDropdown />
          </div>
        )}

        {/* Utilities: Notifications & User Menu */}
        <div className="ml-auto flex items-center gap-3">
          <NotificationFlyout />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
