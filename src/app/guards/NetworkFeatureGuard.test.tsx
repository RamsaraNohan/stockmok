// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkFeatureGuard } from './NetworkFeatureGuard';

const workspaceState = vi.hoisted(() => ({
  activeMembership: { handle: 'grand-table' },
  activeRole: 'OWNER',
  activeSettings: { networkEnabled: true },
  isWorkspaceDataLoading: false,
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => workspaceState,
}));

function renderGuard(child: ReactNode) {
  return render(
    <MemoryRouter>
      <NetworkFeatureGuard>{child}</NetworkFeatureGuard>
    </MemoryRouter>,
  );
}

describe('NetworkFeatureGuard', () => {
  beforeEach(() => {
    workspaceState.activeRole = 'OWNER';
    workspaceState.activeSettings = { networkEnabled: true };
    workspaceState.isWorkspaceDataLoading = false;
  });

  it('waits for workspace settings before mounting a Network query surface', () => {
    const querySurfaceMounted = vi.fn();
    function QuerySurface() {
      querySurfaceMounted();
      return <div>Network query surface</div>;
    }
    workspaceState.isWorkspaceDataLoading = true;

    renderGuard(<QuerySurface />);

    expect(screen.getByRole('status', { name: 'Loading workspace settings' })).toBeTruthy();
    expect(screen.queryByText('Network query surface')).toBeNull();
    expect(querySurfaceMounted).not.toHaveBeenCalled();
  });

  it('renders authenticated 404 when Network is disabled without mounting children', () => {
    workspaceState.activeSettings = { networkEnabled: false };

    renderGuard(<div>Network query surface</div>);

    expect(screen.getByRole('heading', { name: 'Page Not Found (404)' })).toBeTruthy();
    expect(screen.queryByText('Network query surface')).toBeNull();
  });

  it('denies a role before mounting Network children', () => {
    workspaceState.activeRole = 'INVENTORY_MANAGER';

    renderGuard(<div>Network query surface</div>);

    expect(screen.getByRole('heading', { name: 'Access Denied (403)' })).toBeTruthy();
    expect(screen.queryByText('Network query surface')).toBeNull();
  });

  it('allows an authorized role when Network is enabled', () => {
    workspaceState.activeRole = 'PROCUREMENT_MANAGER';

    renderGuard(<div>Network query surface</div>);

    expect(screen.getByText('Network query surface')).toBeTruthy();
  });
});
