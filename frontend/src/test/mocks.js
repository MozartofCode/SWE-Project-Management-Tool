import { vi } from 'vitest';

export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

export const mockSetAuthToken = vi.fn();
export const mockClearAuthToken = vi.fn();

vi.mock('../services/api', () => ({
  default: mockApi,
  setAuthToken: mockSetAuthToken,
  clearAuthToken: mockClearAuthToken,
}));

export const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({}),
  },
};

vi.mock('../services/supabaseClient', () => ({
  supabase: mockSupabase,
}));
