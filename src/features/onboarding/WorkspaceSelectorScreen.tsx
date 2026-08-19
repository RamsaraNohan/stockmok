import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Monogram } from '@/ui/primitives/Monogram';
import { StatusPill } from '@/ui/primitives/StatusPill';

export function WorkspaceSelectorScreen() {
  const { memberships, setActiveHandle } = useWorkspace();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMemberships = memberships.filter(
    (m) =>
      m.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.handle.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelect = async (targetHandle: string) => {
    const success = await setActiveHandle(targetHandle);
    if (success) {
      void navigate(`/app/${targetHandle}/dashboard`);
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface border-border w-full max-w-2xl rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <h1 className="text-text text-2xl font-bold">Select Workspace</h1>
            <p className="text-text-muted mt-1 text-sm">
              Choose an organization workspace to access
            </p>
          </div>

          <Button
            onClick={() => {
              void navigate('/onboarding');
            }}
          >
            <Plus className="mr-2 size-4" />
            <span>New Organization</span>
          </Button>
        </div>

        <div className="mt-6">
          <Input
            placeholder="Search workspaces by name or handle..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {filteredMemberships.map((m) => (
            <button
              key={m.organizationId}
              className="bg-surface border-border hover:border-primary focus-visible:outline-primary flex flex-col justify-between rounded-lg border p-4 text-left transition-colors cursor-pointer group"
              onClick={() => {
                void handleSelect(m.handle);
              }}
            >
              <div className="flex items-start gap-3">
                <Monogram color={m.monogramColor} size="md" text={m.monogram} />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-text group-hover:text-primary font-bold text-base truncate">
                    {m.organizationName}
                  </span>
                  <span className="text-text-muted text-xs font-mono">@{m.handle}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <StatusPill status={m.role} />
                <span className="text-primary font-bold text-xs group-hover:underline">
                  Open Workspace →
                </span>
              </div>
            </button>
          ))}

          {filteredMemberships.length === 0 && (
            <div className="col-span-2 py-8 text-center text-text-muted text-sm">
              No matching organization workspaces found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
