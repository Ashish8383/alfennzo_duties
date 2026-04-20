// src/utils/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { navigateToLogin } from './navigationRef';

const API_BASE_URL = 'https://sandbox.safeqr.in/api/v1';

// Refresh this many seconds before the access token actually expires (clock-drift buffer)
const REFRESH_BUFFER_SECONDS = 60;

// ─── Public endpoints — NEVER touch their Authorization header ────────────────
// These are called before the user has a token, or to obtain/renew one.
const PUBLIC_ENDPOINTS = [
  '/waiter/waiterLogin',
  '/waiter/verifyWaiterLoginOTP',
  '/waiter/refreshToken',
  '/waiter/forgetPassword',
  '/waiter/verifyForgetPasswordOTP',
];

const isPublicEndpoint = (url = '') =>
  PUBLIC_ENDPOINTS.some((p) => url.includes(p));

// ─── Refresh queue ────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = []; // { resolve, reject }[]

const drainQueue = (error, newToken = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  failedQueue = [];
};

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────
const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem('auth-storage');
    return raw ? JSON.parse(raw)?.state?.user ?? null : null;
  } catch {
    return null;
  }
};

const persistTokenUpdate = async (fields = {}) => {
  try {
    const raw = await AsyncStorage.getItem('auth-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state = {
      ...parsed.state,
      user: { ...parsed.state?.user, ...fields },
    };
    await AsyncStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch (e) {
    console.warn('[api] persistTokenUpdate error:', e);
  }
};

// ─── Expiry helpers ───────────────────────────────────────────────────────────
// ✅ null / undefined → NOT expired. Only expired when we have a real date
//    that has already passed. This prevents false-positives on fresh logins.

/** True only when isoDate is a real date string AND it has passed. */
const isExpired = (isoDate) =>
  !!isoDate && new Date(isoDate).getTime() <= Date.now();

/** True only when isoDate is a real date string AND it's within the buffer window. */
const isAccessTokenStale = (isoDate) =>
  !!isoDate &&
  new Date(isoDate).getTime() <= Date.now() + REFRESH_BUFFER_SECONDS * 1000;

// ─── Core refresh ─────────────────────────────────────────────────────────────
const doRefresh = async () => {
  const user = await getStoredUser();
  const { refreshToken, refreshTokenExpiresAt } = user || {};

  if (!refreshToken) throw new Error('No refresh token stored');
  // Only block the network call if we actually have an expiry date that passed
  if (isExpired(refreshTokenExpiresAt)) throw new Error('Refresh token expired');

  const response = await axios.post(
    `${API_BASE_URL}/waiter/refreshToken`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
  );

  const body = response.data;
  if (!body?.status) throw new Error(body?.message || 'Refresh rejected by server');

  const d = body.data || body;
  const newAccessToken      = d.accessToken      || d.token;
  const newRefreshToken     = d.refreshToken     || refreshToken;
  const newAccessExpiresAt  = d.accessTokenExpiresAt  || null;
  const newRefreshExpiresAt = d.refreshTokenExpiresAt || refreshTokenExpiresAt;

  if (!newAccessToken) throw new Error('Refresh response missing accessToken');

  const tokenFields = {
    accessToken:           newAccessToken,
    token:                 newAccessToken,
    refreshToken:          newRefreshToken,
    accessTokenExpiresAt:  newAccessExpiresAt,
    refreshTokenExpiresAt: newRefreshExpiresAt,
  };

  // 1️⃣ Persist immediately so the next cold-start reads fresh tokens
  await persistTokenUpdate(tokenFields);

  // 2️⃣ Sync live Zustand store (best-effort)
  try {
    const { default: useAuthStore } = await import('../stores/authStore');
    useAuthStore.getState().updateProfile(tokenFields);
  } catch (_) {}

  return newAccessToken;
};

const forceLogout = async () => {
  await AsyncStorage.removeItem('auth-storage');
  isRefreshing = false;
  drainQueue(new Error('Session expired'));
  failedQueue = [];
  navigateToLogin();
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — proactive token refresh ────────────────────────────
api.interceptors.request.use(
  async (config) => {
    // ✅ Skip ALL token logic for public/auth endpoints
    if (isPublicEndpoint(config.url)) return config;

    const user = await getStoredUser();
    const { accessToken, accessTokenExpiresAt, refreshTokenExpiresAt } = user || {};

    // No token at all — let the request through; server will return 401 if needed
    if (!accessToken) return config;

    // ── Case 1: Token is fresh — attach and send ──────────────────────────
    if (!isAccessTokenStale(accessTokenExpiresAt)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    }

    // ── Case 2: Access token stale + refresh token also expired ───────────
    if (isExpired(refreshTokenExpiresAt)) {
      await forceLogout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    // ── Case 3: Access stale, refresh still valid — proactive refresh ──────
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await doRefresh();
        drainQueue(null, newToken);
        config.headers.Authorization = `Bearer ${newToken}`;
        return config;
      } catch (err) {
        drainQueue(err);
        await forceLogout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Case 4: Refresh already in flight — queue this request ─────────────
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (newToken) => {
          config.headers.Authorization = `Bearer ${newToken}`;
          resolve(config);
        },
        reject,
      });
    });
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — reactive 401 fallback ─────────────────────────────
// Catches edge-cases: server-side revocation, clock drift, etc.
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Refresh call itself came back 401 — session is completely dead
    if (isPublicEndpoint(original.url)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const newToken = await doRefresh();
      drainQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      drainQueue(refreshError);
      await forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;