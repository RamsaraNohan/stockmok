import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/services/auth/useAuth';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { StatusPill } from '@/ui/primitives/StatusPill';

export function UserMenu() {
  const { user, userSelfDoc, signOutUser } = useAuth();
  const { activeRole } = useWorkspace();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = userSelfDoc?.displayName || user.displayName || user.email || 'User';
  const email = user.email || '';

  const handleSignOut = async () => {
    await signOutUser();
    void navigate('/login');
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="User account menu"
          className="border-border hover:bg-background focus-visible:outline-primary flex items-center gap-2 rounded-full border p-1 transition-colors cursor-pointer min-h-[40px] max-md:min-h-[44px]"
        >
          <div className="bg-primary text-surface grid size-8 place-items-center rounded-full font-bold text-xs">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="bg-surface border-border z-50 min-w-[220px] rounded-lg border p-2 shadow-lg"
          sideOffset={6}
        >
          <div className="border-border border-b pb-2 px-2 pt-1">
            <p className="text-text font-bold text-sm truncate">{displayName}</p>
            <p className="text-text-muted text-xs truncate">{email}</p>
            {activeRole && (
              <div className="mt-2">
                <StatusPill status={activeRole} />
              </div>
            )}
          </div>

          <div className="pt-2">
            <DropdownMenu.Item
              className="hover:bg-red-50 focus:bg-red-50 text-red-600 flex items-center gap-2 rounded-md px-2 py-2 text-xs font-bold cursor-pointer"
              onSelect={() => {
                void handleSignOut();
              }}
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
