import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import apiClient, { setAuthToken, clearAuthToken } from '../services/api';
import { extractErrorMessage } from '../services/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Fetch current user profile from backend
  const fetchMe = useCallback(async (accessToken) => {
    setAuthToken(accessToken);
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const profile = await fetchMe(session.access_token);
          setToken(session.access_token);
          setUser(profile);
        }
      } catch {
        clearAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    // Handle token expiry events dispatched by api.js response interceptor
    const handleForcedLogout = () => {
      clearAuthToken();
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [fetchMe]);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user: profile, token: accessToken } = response.data.data;
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const register = async (email, password, full_name) => {
    const response = await apiClient.post('/auth/register', { email, password, full_name });
    const { user: profile, token: accessToken } = response.data.data;
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Swallow — we always clear client state
    }
    await supabase.auth.signOut();
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
