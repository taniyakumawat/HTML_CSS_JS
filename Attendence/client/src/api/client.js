import axios from 'axios';

/**
 * Shared axios instance for every API call.
 * - baseURL comes from client/.env (VITE_API_BASE_URL=/api, proxied by Vite)
 * - Request interceptor attaches the JWT stored in localStorage (Phase 3)
 * - Response interceptor handles session expiry (Phase 3)
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request: attach bearer token if present ----
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response: normalize errors, handle 401 ----
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
