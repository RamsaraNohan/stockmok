import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';

export interface PermissionDeniedScreenProps {
  readonly message?: string;
}

export function PermissionDeniedScreen({ message }: PermissionDeniedScreenProps) {
  const { activeMembership, activeRole } = useWorkspace();
  const handle = activeMembership?.handle;

  return (
    <div className="bg-background flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="bg-surface border-border max-w-md rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="bg-red-100 text-red-700 inline-grid size-14 place-items-center rounded-full mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-text text-2xl font-bold">Access Denied (403)</h1>
        <p className="text-text-muted mt-3 text-sm leading-relaxed">
          {message ||
            `Your current active role (${activeRole || 'UNASSIGNED'}) does not have permission to view or perform operations on this surface.`}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {handle ? (
            <Link to={`/app/${handle}/dashboard`}>
              <Button className="w-full" variant="primary">
                Return to Workspace Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/select-workspace">
              <Button className="w-full" variant="primary">
                Select Workspace
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
