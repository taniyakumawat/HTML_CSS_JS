import axios from 'axios';

/**
 * Shared axios instance for every API call - the ONLY HTTP entry point of the
 * app (no fetch() and no second axios instance anywhere in client/src).
 * - baseURL comes from client/.env (VITE_API_BASE_URL); endpoint paths are
 *   relative and carry no '/api' prefix (e.g. '/auth/login'), so the base
 *   must end with exactly one '/api'.
 * - Request interceptor attaches the JWT stored in localStorage (Phase 3)
 * - Response interceptor handles session expiry (Phase 3)
 */

// Used when VITE_API_BASE_URL is not set:
//  - 'vite dev': '/api' -> Vite dev proxy -> http://localhost:5000
//  - production build: the deployed Express API on Vercel
const DEFAULT_BASE_URL = import.meta.env.DEV
  ? '/api'
  : 'https://server-taniya16.vercel.app';

/**
 * Normalize a base URL so joins can never produce a trailing slash or a
 * double '/api/api', and the Express '/api' prefix is always present once:
 *   'https://host'          -> 'https://host/api'
 *   'https://host/'         -> 'https://host/api'
 *   'https://host/api/'     -> 'https://host/api'
 *   'https://host/api/api'  -> 'https://host/api'
 *   '/api'                  -> '/api'   (local dev proxy)
 */
const normalizeBaseUrl = (raw) => {
  let base = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!base) base = DEFAULT_BASE_URL;
  base = base.replace(/(?:\/api)+$/, '/api'); // collapse '/api/api'
  if (!base.endsWith('/api')) base += '/api'; // Express mounts routers at '/api'
  return base;
};

const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL),
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
