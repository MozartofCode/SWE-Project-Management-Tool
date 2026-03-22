import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
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

import apiClient, { setAuthToken, clearAuthToken } from '../services/api';
import useAuth from './useAuth';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with isLoading true then resolves to false', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
  });

  it('starts unauthenticated with no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });

  it('login sets user and token on success', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', full_name: 'Alice', role: 'member' };
    apiClient.post.mockResolvedValueOnce({ data: { data: { user: fakeUser, token: 'tok123' } } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.login('a@b.com', 'password1');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(fakeUser);
    expect(setAuthToken).toHaveBeenCalledWith('tok123');
  });

  it('login throws on failure and does not set user', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    await expect(
      act(async () => { await result.current.login('bad@b.com', 'wrong'); })
    ).rejects.toThrow();

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('register sets user and token', async () => {
    const fakeUser = { id: 'u2', email: 'b@b.com', full_name: 'Bob', role: 'member' };
    apiClient.post.mockResolvedValueOnce({ data: { data: { user: fakeUser, token: 'tok456' } } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.register('b@b.com', 'password1', 'Bob');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(fakeUser);
  });

  it('logout clears user and token', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', full_name: 'Alice', role: 'member' };
    apiClient.post
      .mockResolvedValueOnce({ data: { data: { user: fakeUser, token: 'tok123' } } })
      .mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    await act(async () => { await result.current.login('a@b.com', 'password1'); });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(clearAuthToken).toHaveBeenCalled();
  });
});
