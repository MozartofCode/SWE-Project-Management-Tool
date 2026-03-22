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
import Dashboard from './Dashboard';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </MemoryRouter>
  );

describe('Dashboard page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing and shows stat cards', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/projects') return Promise.resolve({ data: { data: [], count: 0 } });
      if (url === '/activity') return Promise.resolve({ data: { data: [], count: 0 } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/projects') return Promise.resolve({ data: { data: [], count: 0 } });
      if (url === '/activity') return Promise.resolve({ data: { data: [], count: 0 } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    });
  });

  it('shows project names after load', async () => {
    const projects = [{ id: 'p1', name: 'Alpha Project', status: 'active' }];
    apiClient.get.mockImplementation((url) => {
      if (url === '/projects') return Promise.resolve({ data: { data: projects, count: 1 } });
      if (url === '/activity') return Promise.resolve({ data: { data: [], count: 0 } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });
  });
});
