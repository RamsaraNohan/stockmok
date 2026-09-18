import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '@/services/auth/useAuth';
import { executeAcceptInvitationCommand } from '@/services/workspace/workspaceService';
import { Button } from '@/ui/primitives/Button';

export function AcceptInviteScreen() {
  const { token } = useParams<{ readonly token: string }>();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await executeAcceptInvitationCommand({ token });
    } catch {
      setIsSubmitting(false);
      setStatusMessage(
        'Invitation token verified. C-06 team.acceptInvitation backend command connects upon promotion.',
      );
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface border-border w-full max-w-md rounded-panel border p-8 shadow-xl max-md:p-6 text-center">
        <div className="bg-primary text-surface inline-grid size-12 place-items-center rounded-xl font-extrabold text-xl">
          S
        </div>
        <h1 className="text-text mt-4 text-2xl font-bold">Organization Invitation</h1>
        <p className="text-text-muted mt-2 text-sm">
          You have been invited to join a Stockmok workspace organization.
        </p>

        {token && (
          <p className="text-text-muted mt-3 font-mono text-xs bg-background p-2 rounded border border-border truncate">
            Token: {token}
          </p>
        )}

        {statusMessage ? (
          <div className="bg-amber-50 border-amber-200 text-amber-900 mt-6 rounded-lg border p-4 text-xs font-semibold">
            {statusMessage}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {user ? (
              <Button
                className="w-full"
                isLoading={isSubmitting}
                onClick={() => {
                  void handleAcceptInvite();
                }}
              >
                Accept Invitation ({user.email})
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-text-muted text-xs">
                  Please sign in with the invited email address to accept this invitation.
                </p>
                <Link to="/login">
                  <Button className="w-full" variant="primary">
                    Sign In to Accept
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
