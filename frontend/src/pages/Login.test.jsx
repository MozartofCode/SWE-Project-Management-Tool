import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
import Login from './Login';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );

describe('Login page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing', async () => {
    renderLogin();
    expect(screen.getByText('ProjectFlow')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows error message on failed login', async () => {
    apiClient.post.mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    renderLogin();
    await waitFor(() => {}); // wait for auth restore

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('calls POST /auth/login with email and password on submit', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { data: { user: { id: '1', email: 'a@b.com', full_name: 'Alice', role: 'member' }, token: 'tok' } },
    });
    apiClient.get.mockResolvedValueOnce({ data: { data: { id: '1', email: 'a@b.com', full_name: 'Alice', role: 'member' } } });

    renderLogin();
    await waitFor(() => {});

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'password1' });
    });
  });
});
