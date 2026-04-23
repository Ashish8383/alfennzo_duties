import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import useAuthStore from '../stores/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const REFRESH_BUFFER_SECONDS = 60;
const API_TIMEOUT = 15000;

const PUBLIC_ENDPOINTS = [
  '/waiter/waiterLogin',
  '/waiter/verifyWaiterLoginOTP',
  '/waiter/refreshToken',
  '/waiter/forgetPassword',
  '/waiter/verifyForgetPasswordOTP',
];

const isPublicEndpoint = (url = '') =>
  PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));

let isRefreshing = false;
let failedQueue = [];

const drainQueue = (error, newToken = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  failedQueue = [];
};

const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem('auth-storage');
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    return parsed.state?.user || parsed.user || null;
  } catch (error) {
    return null;
  }
};

const persistTokenUpdate = async (fields = {}) => {
  try {
    const raw = await AsyncStorage.getItem('auth-storage');
    if (!raw) return;
    
    const parsed = JSON.parse(raw);
    const user = parsed.state?.user || parsed.user || {};
    
    if (parsed.state) {
      parsed.state = {
        ...parsed.state,
        user: { ...user, ...fields },
      };
    } else {
      parsed.user = { ...user, ...fields };
    }
    
    await AsyncStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch (error) {
  }
};

const isExpired = (isoDate) =>
  !!isoDate && new Date(isoDate).getTime() <= Date.now();

const isAccessTokenStale = (isoDate) =>
  !!isoDate &&
  new Date(isoDate).getTime() <= Date.now() + REFRESH_BUFFER_SECONDS * 1000;

const doRefresh = async () => {
  const user = await getStoredUser();
  const { refreshToken, refreshTokenExpiresAt } = user || {};

  if (!refreshToken) throw new Error('No refresh token stored');
  if (isExpired(refreshTokenExpiresAt)) throw new Error('Refresh token expired');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/waiter/refreshToken`,
      { refreshToken },
      { 
        headers: { 'Content-Type': 'application/json' }, 
        timeout: API_TIMEOUT 
      }
    );

    const body = response.data;
    if (!body?.status) {
      throw new Error(body?.message || 'Refresh rejected by server');
    }

    const data = body.data || body;
    const newAccessToken = data.accessToken || data.token;
    const newRefreshToken = data.refreshToken || refreshToken;
    const newAccessExpiresAt = data.accessTokenExpiresAt || null;
    const newRefreshExpiresAt = data.refreshTokenExpiresAt || refreshTokenExpiresAt;

    if (!newAccessToken) throw new Error('Refresh response missing accessToken');

    const tokenFields = {
      accessToken: newAccessToken,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: newAccessExpiresAt,
      refreshTokenExpiresAt: newRefreshExpiresAt,
    };

    await persistTokenUpdate(tokenFields);
    
    try {
      const { default: useAuthStore } = await import('../stores/authStore');
      useAuthStore.getState()?.updateProfile?.(tokenFields);
    } catch {
      // Store not available
    }

    return newAccessToken;
  } catch (error) {
    throw error;
  }
};

const forceLogout = async () => {
  try {
    await AsyncStorage.removeItem('auth-storage');
    useAuthStore.getState().logout(true);
  } catch (error) {
  } finally {
    isRefreshing = false;
    drainQueue(new Error('Session expired'));
    failedQueue = [];
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    if (isPublicEndpoint(config.url)) {
      return config;
    }

    try {
      const user = await getStoredUser();
      const accessToken = user?.accessToken || user?.token;
      const accessTokenExpiresAt = user?.accessTokenExpiresAt;
      const refreshTokenExpiresAt = user?.refreshTokenExpiresAt;

      if (!accessToken) {
        return config;
      }

      if (!isAccessTokenStale(accessTokenExpiresAt)) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
      }

      if (isExpired(refreshTokenExpiresAt)) {
        await forceLogout();
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await doRefresh();
          drainQueue(null, newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        } catch (error) {
          drainQueue(error);
          await forceLogout();
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            config.headers.Authorization = `Bearer ${newToken}`;
            resolve(config);
          },
          reject,
        });
      });
    } catch (error) {
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'An error occurred';
      
      return Promise.reject({
        ...error,
        userMessage: errorMessage,
      });
    }

    if (isPublicEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await doRefresh();
      drainQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
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