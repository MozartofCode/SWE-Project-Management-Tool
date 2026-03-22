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
import ProjectsList from './ProjectsList';

const renderList = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <ProjectsList />
      </AuthProvider>
    </MemoryRouter>
  );

describe('ProjectsList page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders table headers', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: [], count: 0 } });
    renderList();
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: [], count: 0 } });
    renderList();
    await waitFor(() => {
      expect(screen.getByText(/not a member of any projects/i)).toBeInTheDocument();
    });
  });

  it('shows project names after load', async () => {
    const projects = [{ id: 'p1', name: 'My Project', status: 'active', description: '', start_date: null, end_date: null }];
    apiClient.get.mockResolvedValueOnce({ data: { data: projects, count: 1 } });
    renderList();
    await waitFor(() => {
      expect(screen.getByText('My Project')).toBeInTheDocument();
    });
  });
});
