import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';

export interface NotFoundScreenProps {
  readonly message?: string;
}

export function NotFoundScreen({ message }: NotFoundScreenProps) {
  const { activeMembership } = useWorkspace();
  const handle = activeMembership?.handle;

  return (
    <div className="bg-background flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="bg-surface border-border max-w-md rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="bg-amber-100 text-amber-800 inline-grid size-14 place-items-center rounded-full mb-4">
          <FileQuestion className="size-8" />
        </div>
        <h1 className="text-text text-2xl font-bold">Page Not Found (404)</h1>
        <p className="text-text-muted mt-3 text-sm leading-relaxed">
          {message || 'The requested page or resource could not be found or has been disabled.'}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {handle ? (
            <Link to={`/app/${handle}/dashboard`}>
              <Button className="w-full" variant="primary">
                Return to Workspace Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/">
              <Button className="w-full" variant="primary">
                Go to Home
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
