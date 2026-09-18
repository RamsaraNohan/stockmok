// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Auth Loading...</div>;
  return <div>{user ? `User: ${user.uid}` : 'No User'}</div>;
}

describe('AuthContext', () => {
  it('renders auth context provider with initial state', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText(/Auth Loading...|No User/)).toBeTruthy();
  });
});
