// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';

describe('F0 application shell', () => {
  it('renders the accessible foundation landmarks without claiming a feature screen', () => {
    render(<App emulatorMode={false} />);

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Application foundation is ready' }),
    ).toBeTruthy();
    expect(screen.queryByText('EMULATOR')).toBeNull();
  });

  it('shows the exact emulator marker only when emulator mode is enabled', () => {
    render(<App emulatorMode />);

    expect(screen.getByText('EMULATOR')).toBeTruthy();
  });
});
