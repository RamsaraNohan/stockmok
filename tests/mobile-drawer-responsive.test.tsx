// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileDrawer } from '../src/ui/shell/MobileDrawer';

vi.mock('../src/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    activeMembership: {
      handle: 'test-org',
      monogram: 'TO',
      monogramColor: 'blue',
      organizationName: 'Test Org',
    },
    activeRole: 'ADMIN',
    activeSettings: { networkEnabled: true },
  }),
}));

describe('MobileDrawer Responsive Behavior', () => {
  it('closes mobile drawer state cleanly when viewport resizes to desktop (>= 1024px)', () => {
    let mediaListener: ((e: { matches: boolean }) => void) | null = null;
    let isDesktop = false;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: isDesktop,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, cb: unknown) => {
        if (event === 'change') mediaListener = cb as (e: { matches: boolean }) => void;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <MobileDrawer isOpen={true} onClose={onClose} />
      </MemoryRouter>,
    );

    // Simulate viewport resize to >= 1024px (desktop)
    isDesktop = true;
    (mediaListener as unknown as (e: { matches: boolean }) => void)({ matches: true });

    expect(onClose).toHaveBeenCalled();
  });
});
