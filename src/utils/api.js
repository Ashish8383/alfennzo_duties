import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { navigateToLogin } from './navigationRef';

const API_BASE_URL = 'https://sandbox.safeqr.in/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach token ─────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const authData = await AsyncStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed.state?.user?.accessToken || parsed.state?.user?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle 401 ──────────────────────────────────────────────────────
let isHandling401 = false; // guard against multiple simultaneous 401s

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;
      try {
        // Hit logout endpoint (best-effort — ignore failure)
        const authData = await AsyncStorage.getItem('auth-storage');
        if (authData) {
          const token = JSON.parse(authData)?.state?.user?.accessToken
            || JSON.parse(authData)?.state?.user?.token;
          if (token) {
            await axios.post(
              `${API_BASE_URL}/waiter/logout`,
              {},
              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 5000 }
            ).catch(() => {}); // swallow — session is invalid anyway
          }
        }
      } finally {
        // Wipe local state and redirect
        await AsyncStorage.removeItem('auth-storage');
        isHandling401 = false;
        navigateToLogin();
      }
    }
    return Promise.reject(error);
  }
);

export default api;