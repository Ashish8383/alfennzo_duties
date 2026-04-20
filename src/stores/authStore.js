// src/stores/authStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../utils/api';
import { getDeviceInfo } from '../utils/deviceinfo';

const API_BASE_URL = 'https://sandbox.safeqr.in/api/v1';

// ─── Token helper ──────────────────────────────────────────────────────────────
/**
 * Pull all token-related fields out of a login / OTP-verify response data object.
 * Handles both `response.data` and `response.data.data` shapes.
 */
const extractTokenFields = (data = {}, fallbackEmail = '') => ({
  // IDs / identity
  id:       data.id   || data._id  || data.userId,
  name:     data.fullName || data.name || fallbackEmail.split('@')[0],
  fullName: data.fullName || data.name || fallbackEmail.split('@')[0],
  email:    data.email || fallbackEmail,
  phone:    data.phone ? String(data.phone) : '',
  role:     data.role || 'waiter',

  // Tokens
  accessToken:  data.accessToken  || data.token,
  token:        data.accessToken  || data.token,   // keep alias
  refreshToken: data.refreshToken || null,

  // ✅ Expiry timestamps — used by api.js for proactive refresh
  accessTokenExpiresAt:  data.accessTokenExpiresAt  || null,
  refreshTokenExpiresAt: data.refreshTokenExpiresAt || null,

  // Extra flags
  wasLoggedOutFromAnotherDevice: data.wasLoggedOutFromAnotherDevice ?? false,

  // Spread everything else (restaurant info, duty status, etc.)
  ...data,
});

// ──────────────────────────────────────────────────────────────────────────────

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ─── State ───────────────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tempEmail: null,

      // ─── Login ───────────────────────────────────────────────────────────
      login: async (email, password) => {
        console.log('[authStore] login attempt for:', email);
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/waiter/waiterLogin', { email, password });
          const body = response.data;
           console.log('[authStore] login response:', body);
          // OTP flow
          if (body?.status === true && body.message?.includes('OTP')) {
            set({ tempEmail: email, isLoading: false, error: null });
            return { requiresOTP: true, email, message: body.message };
          }

          // Direct token flow
          if (body?.data?.accessToken || body?.token) {
            const userData = extractTokenFields(body.data || {}, email);
            set({ user: userData, isAuthenticated: true, isLoading: false, error: null, tempEmail: null });

            // Refresh full profile so all fields are present
            await get().fetchProfile();
            return { success: true };
          }

          throw new Error(body?.message || 'Login failed');

        } catch (error) {
          let msg = 'Invalid credentials';
          if (error.response) {
            msg = error.response.data?.message || error.response.data?.error || `Login failed (${error.response.status})`;
          } else if (error.request) {
            msg = 'Network error. Please check your connection.';
          } else {
            msg = error.message || 'Login failed';
          }
          set({ error: msg, isLoading: false, user: null, isAuthenticated: false });
          return { error: msg };
        }
      },

      // ─── Verify OTP (Login) ───────────────────────────────────────────────
      verifyOTP: async (otp) => {
        set({ isLoading: true, error: null });
        try {
          const { tempEmail } = get();
          if (!tempEmail) { set({ error: 'Please login again', isLoading: false }); return false; }
          if (!otp || otp.includes('@')) { set({ error: 'Invalid OTP', isLoading: false }); return false; }

          const deviceData = await getDeviceInfo();
          let coords = null;
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({});
              coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            }
          } catch (_) {}

          if (!coords) { set({ error: 'Location required', isLoading: false }); return false; }

          const payload = {
            email: tempEmail,
            otp,
            deviceId:   deviceData.deviceFingerprint,
            deviceInfo: {
              platform:    deviceData.deviceInfo?.platform    || 'android',
              osVersion:   deviceData.deviceInfo?.osVersion   || '',
              appVersion:  deviceData.deviceInfo?.appVersion  || '1.0.0',
              deviceModel: deviceData.deviceInfo?.deviceModel || '',
            },
            fcmToken:  deviceData.fcmToken,
            latitude:  coords.latitude,
            longitude: coords.longitude,
          };

          const response = await api.post('/waiter/verifyWaiterLoginOTP', payload);
          const body = response.data;

          if (body?.status === true) {
            // ✅ Extract tokens + expiry from OTP response
            const userData = extractTokenFields(body.data || {}, tempEmail);
            set({ user: userData, isAuthenticated: true, isLoading: false, tempEmail: null });

            await get().fetchProfile();
            return true;
          }

          throw new Error(body?.message);
        } catch (error) {
          set({ error: error?.response?.data?.message || 'OTP verification failed', isLoading: false });
          return false;
        }
      },

      // ─── Refresh Access Token ─────────────────────────────────────────────
      // Called directly by api.js interceptor — also exposed for manual use.
      refreshAccessToken: async () => {
        const { user } = get();
        const refreshToken = user?.refreshToken;

        if (!refreshToken) return { error: 'No refresh token available' };

        if (user?.refreshTokenExpiresAt) {
          const expiresAt = new Date(user.refreshTokenExpiresAt).getTime();
          if (expiresAt <= Date.now()) {
            await get().logout(true);
            return { error: 'Session expired. Please log in again.' };
          }
        }

        try {
          const response = await axios.post(
            `${API_BASE_URL}/waiter/refreshToken`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
          );

          const body = response.data;
          if (!body?.status) throw new Error(body?.message || 'Refresh rejected');

          const d = body.data || body;
          const tokenFields = {
            accessToken:           d.accessToken          || d.token,
            token:                 d.accessToken          || d.token,
            refreshToken:          d.refreshToken         || refreshToken,
            accessTokenExpiresAt:  d.accessTokenExpiresAt || null,
            refreshTokenExpiresAt: d.refreshTokenExpiresAt || user?.refreshTokenExpiresAt,
          };

          // Merge updated tokens into store (preserves all other user fields)
          set((state) => ({ user: { ...state.user, ...tokenFields } }));
          return { success: true, accessToken: tokenFields.accessToken };

        } catch (error) {
          console.warn('[authStore] refreshAccessToken failed:', error?.message);
          // Refresh failed — session is dead
          await get().logout(true);
          return { error: 'Session expired. Please log in again.' };
        }
      },

      // ─── Fetch Profile ────────────────────────────────────────────────────
      fetchProfile: async () => {
        try {
          const response = await api.get('/waiter/getProfile');
          if (response.data?.status === true && response.data?.data) {
            const p = response.data.data;
            set((state) => ({
              user: {
                ...state.user,
                fullName:           p.fullName            || state.user?.fullName,
                name:               p.fullName            || state.user?.name,
                phone:              p.phone ? String(p.phone) : state.user?.phone,
                email:              p.email               || state.user?.email,
                dateOfBirth:        p.dateOfBirth         || state.user?.dateOfBirth,
                isOnDuty:           p.isOnDuty            ?? state.user?.isOnDuty,
                isProfileCompleted: p.isProfileCompleted,
                isKycCompleted:     p.isKycCompleted,
                salary:             p.Salary,
                restaurantId:       p.restaurantId,
                restaurantCoordinate: p.restaurantCoordinate,
                _profile:           p,
              },
            }));
            return { success: true };
          }
          return { error: response.data?.message || 'Failed to fetch profile' };
        } catch (error) {
          console.warn('[authStore] fetchProfile error:', error?.response?.data);
          return { error: error?.response?.data?.message || 'Could not load profile' };
        }
      },

      // ─── Update Profile ───────────────────────────────────────────────────
      updateUserProfile: async ({ fullName, dateOfBirth, phone }) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {};
          if (fullName    !== undefined) payload.fullName    = fullName;
          if (dateOfBirth !== undefined) payload.dateOfBirth = dateOfBirth;
          if (phone       !== undefined) payload.phone       = phone;

          const response = await api.post('/waiter/updateProfile', payload);

          if (response.data?.status === true) {
            await get().fetchProfile();
            set({ isLoading: false });
            return { success: true, message: response.data?.message || 'Profile updated' };
          }
          throw new Error(response.data?.message || 'Update failed');
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not update profile';
          set({ isLoading: false, error: msg });
          return { error: msg };
        }
      },

      // ─── Logout ───────────────────────────────────────────────────────────
      logout: async (force = false) => {
        try {
          const { user } = get();
          const token = user?.accessToken || user?.token;
          if (token) {
            await axios.post(
              `${API_BASE_URL}/waiter/logout`,
              {},
              {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                timeout: 8000,
              }
            );
          }
        } catch (e) {
          const message = e?.response?.data?.message;
          const status  = e?.response?.data?.statusCode;

          if (status === 400 && message && !force) {
            return { blocked: true, message };
          }
          // Any other error or force=true → wipe locally
        }

        set({ user: null, isAuthenticated: false, error: null, tempEmail: null });
      },

      // ─── Duty Toggle ──────────────────────────────────────────────────────
      changeDutytoggal: async (isOnDuty) => {
        set({ isLoading: true, error: null });
        try {
          let coords = null;
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({});
              coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            }
          } catch (_) {}

          const payload = {
            isOnDuty,
            latitude:  coords?.latitude  ?? 0,
            longitude: coords?.longitude ?? 0,
          };

          const response = await api.post('/waiter/changeDutyStatus', payload);

          if (response.data?.status === true) {
            set((state) => ({ user: { ...state.user, isOnDuty }, isLoading: false }));
            return { success: true };
          }
          throw new Error(response.data?.message || 'Failed to change duty status');
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not update duty status';
          set({ error: msg, isLoading: false });
          return { error: msg };
        }
      },

      // ─── Forgot Password — send OTP ───────────────────────────────────────
      forgotPassword: async (email) => {
        try {
          const response = await api.post('/waiter/forgetPassword', { email });
          if (response.data?.status === true) {
            return { success: true, message: response.data?.message };
          }
          return { error: response.data?.message || 'Could not send OTP' };
        } catch (error) {
          return { error: error?.response?.data?.message || 'Network error. Please try again.' };
        }
      },

      // ─── Forgot Password — verify OTP + new password ──────────────────────
      verifyForgotOTP: async (email, otp, newPassword) => {
        try {
          const response = await api.post('/waiter/verifyForgetPasswordOTP', {
            email, otp, newPassword,
          });
          if (response.data?.status === true) {
            return { success: true, message: response.data?.message };
          }
          return { error: response.data?.message || 'Verification failed' };
        } catch (error) {
          return { error: error?.response?.data?.message || 'Invalid OTP or request expired' };
        }
      },

      // ─── Helpers ──────────────────────────────────────────────────────────
      clearError:    () => set({ error: null }),
      getToken:      () => get().user?.accessToken || get().user?.token || null,
      updateProfile: (data) => set((state) => ({ user: { ...state.user, ...data } })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // ✅ Persist expiry timestamps so api.js can read them on cold start
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;