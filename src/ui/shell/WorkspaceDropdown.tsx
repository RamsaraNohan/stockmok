import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Monogram } from '@/ui/primitives/Monogram';

export function WorkspaceDropdown() {
  const { activeMembership, memberships, setActiveHandle } = useWorkspace();
  const navigate = useNavigate();

  if (!activeMembership) return null;

  const handleSelectWorkspace = async (targetHandle: string) => {
    const success = await setActiveHandle(targetHandle);
    if (success) {
      void navigate(`/app/${targetHandle}/dashboard`);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Switch organization workspace"
          className="border-border hover:bg-background focus-visible:outline-primary flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm font-bold transition-colors cursor-pointer min-h-[40px]"
        >
          <Monogram
            color={activeMembership.monogramColor}
            size="sm"
            text={activeMembership.monogram}
          />
          <span className="max-w-[140px] truncate">{activeMembership.organizationName}</span>
          <ChevronDown className="text-text-muted size-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="bg-surface border-border z-50 min-w-[220px] rounded-lg border p-1 shadow-lg"
          sideOffset={6}
        >
          <DropdownMenu.Label className="text-text-muted px-2 py-1.5 text-xs font-bold uppercase tracking-wider">
            Active Workspace
          </DropdownMenu.Label>
          <div className="bg-primary-subtle border-primary/20 flex items-center gap-2 rounded-md border px-2 py-1.5">
            <Monogram
              color={activeMembership.monogramColor}
              size="sm"
              text={activeMembership.monogram}
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-text font-bold text-xs truncate">
                {activeMembership.organizationName}
              </span>
              <span className="text-text-muted text-[11px]">@{activeMembership.handle}</span>
            </div>
          </div>

          <DropdownMenu.Separator className="bg-border my-1 h-px" />

          <DropdownMenu.Label className="text-text-muted px-2 py-1.5 text-xs font-bold uppercase tracking-wider">
            Switch Organization ({memberships.length})
          </DropdownMenu.Label>
          {memberships
            .filter((m) => m.organizationId !== activeMembership.organizationId)
            .map((m) => (
              <DropdownMenu.Item
                key={m.organizationId}
                className="hover:bg-background focus:bg-background text-text flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium cursor-pointer"
                onSelect={() => {
                  void handleSelectWorkspace(m.handle);
                }}
              >
                <Monogram color={m.monogramColor} size="sm" text={m.monogram} />
                <span className="truncate">{m.organizationName}</span>
              </DropdownMenu.Item>
            ))}

          <DropdownMenu.Separator className="bg-border my-1 h-px" />

          <DropdownMenu.Item
            className="hover:bg-background focus:bg-background text-primary flex items-center gap-2 rounded-md px-2 py-2 text-xs font-bold cursor-pointer"
            onSelect={() => {
              void navigate('/onboarding');
            }}
          >
            <Plus className="size-4" />
            <span>Create new organization</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
