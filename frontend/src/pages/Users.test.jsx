import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

import apiClient from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import Users from './Users';

// Helper to render with a mocked user role
const renderUsers = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Users />
      </AuthProvider>
    </MemoryRouter>
  );

describe('Users page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows permission denied for non-admin user', async () => {
    // No session = no user = not admin
    renderUsers();
    await waitFor(() => {});
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    renderUsers();
    // Should not throw
  });
});
