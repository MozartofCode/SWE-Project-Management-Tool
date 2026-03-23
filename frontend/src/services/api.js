import axios from 'axios';

// Module-level token store — avoids circular dependency with AuthContext
let _token = null;

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT if present
apiClient.interceptors.request.use(
  (config) => {
    if (_token) {
      config.headers.Authorization = `Bearer ${_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && _token) {
      // Token expired — notify AuthContext via custom event
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  _token = token;
};

export const clearAuthToken = () => {
  _token = null;
};

// API Key endpoints
export const apiKeysApi = {
  list: () => apiClient.get('/auth/api-keys'),
  create: (name) => apiClient.post('/auth/api-keys', { name }),
  revoke: (id) => apiClient.delete(`/auth/api-keys/${id}`),
};

// Anthropic key endpoints
export const anthropicKeyApi = {
  getStatus: () => apiClient.get('/users/me/anthropic-key'),
  save: (key) => apiClient.put('/users/me/anthropic-key', { key }),
  clear: () => apiClient.put('/users/me/anthropic-key', { key: null }),
};

export default apiClient;
