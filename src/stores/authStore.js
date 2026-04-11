// src/stores/authStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../utils/api';
import { getDeviceInfo } from '../utils/deviceinfo';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tempEmail: null,

      // ─── Login ────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/waiter/waiterLogin', { email, password });

          if (response.data?.status === true && response.data.message?.includes('OTP')) {
            set({ tempEmail: email, isLoading: false, error: null });
            return { requiresOTP: true, email, message: response.data.message };
          }

          if (response.data?.token) {
            const userData = {
              id: response.data.data?.id || response.data.userId || response.data._id,
              name: response.data.data?.name || response.data.userName || email.split('@')[0],
              fullName: response.data.data?.fullName || response.data.data?.name || email.split('@')[0],
              email: response.data.data?.email || email,
              phone: response.data.data?.phone || response.data.mobile || '',
              role: response.data.data?.role || 'waiter',
              token: response.data.token || response.data.accessToken,
              ...response.data.data,
            };
            set({ user: userData, isAuthenticated: true, isLoading: false, error: null, tempEmail: null });
            
            // ✅ Fetch complete profile after successful login
            await get().fetchProfile();
            
            return { success: true };
          } else {
            throw new Error(response.data?.message || 'Login failed');
          }
        } catch (error) {
          let errorMessage = 'Invalid credentials';
          if (error.response) {
            errorMessage = error.response.data?.message || error.response.data?.error || `Login failed (${error.response.status})`;
          } else if (error.request) {
            errorMessage = 'Network error. Please check your connection.';
          } else {
            errorMessage = error.message || 'Login failed';
          }
          set({ error: errorMessage, isLoading: false, user: null, isAuthenticated: false });
          return { error: errorMessage };
        }
      },

      // ─── Verify OTP ───────────────────────────────────────────────────────
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
          } catch (e) {}

          if (!coords) { set({ error: 'Location required', isLoading: false }); return false; }

          const payload = {
            email: tempEmail,
            otp,
            deviceId: deviceData.deviceFingerprint,
            deviceInfo: {
              platform: deviceData.deviceInfo?.platform || 'android',
              osVersion: deviceData.deviceInfo?.osVersion || '',
              appVersion: deviceData.deviceInfo?.appVersion || '1.0.0',
              deviceModel: deviceData.deviceInfo?.deviceModel || '',
            },
            fcmToken: deviceData.fcmToken,
            latitude: coords.latitude,
            longitude: coords.longitude,
          };

          const response = await api.post('/waiter/verifyWaiterLoginOTP', payload);

          if (response.data?.status === true) {
            // Set initial user data from OTP response
            set({
              user: {
                ...response.data.data,
                token: response.data.data?.accessToken || response.data.accessToken,
                refreshToken: response.data.data?.refreshToken,
              },
              isAuthenticated: true,
              isLoading: false,
              tempEmail: null,
            });
            
            // ✅ Fetch complete profile after successful OTP verification
            await get().fetchProfile();
            
            return true;
          } else {
            throw new Error(response.data?.message);
          }
        } catch (error) {
          set({ error: error?.response?.data?.message || 'OTP failed', isLoading: false });
          return false;
        }
      },

      // ─── Fetch Profile ────────────────────────────────────────────────────
      fetchProfile: async () => {
        try {
          const response = await api.get('/waiter/getProfile');
          if (response.data?.status === true && response.data?.data) {
            const profileData = response.data.data;
            // Merge profile data into existing user (preserve token/auth fields)
            set((state) => ({
              user: {
                ...state.user,
                // Map API fields to local fields
                fullName: profileData.fullName || state.user?.fullName,
                name: profileData.fullName || state.user?.name,        // keep "name" alias in sync
                phone: profileData.phone ? String(profileData.phone) : state.user?.phone,
                email: profileData.email || state.user?.email,
                dateOfBirth: profileData.dateOfBirth || state.user?.dateOfBirth,
                isOnDuty: profileData.isOnDuty ?? state.user?.isOnDuty,
                isProfileCompleted: profileData.isProfileCompleted,
                isKycCompleted: profileData.isKycCompleted,
                salary: profileData.Salary,
                restaurantId: profileData.restaurantId,
                restaurantCoordinate: profileData.restaurantCoordinate,
                // Raw profile snapshot for reference
                _profile: profileData,
              },
            }));
            return { success: true };
          }
          return { error: response.data?.message || 'Failed to fetch profile' };
        } catch (error) {
          console.log('fetchProfile error:', error?.response?.data);
          return { error: error?.response?.data?.message || 'Could not load profile' };
        }
      },

      // ─── Update Profile (API-bound) ───────────────────────────────────────
      updateUserProfile: async ({ fullName, dateOfBirth, phone }) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {};
          if (fullName !== undefined)    payload.fullName    = fullName;
          if (dateOfBirth !== undefined) payload.dateOfBirth = dateOfBirth;
          if (phone !== undefined)       payload.phone       = phone;

          const response = await api.post('/waiter/updateProfile', payload);

          if (response.data?.status === true) {
            // Refresh profile from server so UI is consistent
            await get().fetchProfile();
            set({ isLoading: false });
            return { success: true, message: response.data?.message || 'Profile updated' };
          } else {
            throw new Error(response.data?.message || 'Update failed');
          }
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not update profile';
          set({ isLoading: false, error: msg });
          return { error: msg };
        }
      },

      // ─── Logout ───────────────────────────────────────────────────────────
      logout: async () => {
        try {
          const { user } = get();
          if (user?.token) {
            await api.post('/waiter/logout', {}, { headers: { Authorization: `Bearer ${user.token}` } });
          }
        } catch (error) {
        } finally {
          set({ user: null, isAuthenticated: false, error: null, tempEmail: null });
        }
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
          } catch (e) {}

          const payload = {
            isOnDuty,
            latitude:  coords?.latitude  ?? 0,
            longitude: coords?.longitude ?? 0,
          };

          const response = await api.post('/waiter/changeDutyStatus', payload);

          if (response.data?.status === true) {
            set((state) => ({ user: { ...state.user, isOnDuty }, isLoading: false }));
            return { success: true };
          } else {
            throw new Error(response.data?.message || 'Failed to change duty status');
          }
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not update duty status';
          set({ error: msg, isLoading: false });
          return { error: msg };
        }
      },

      // ─── Helpers ─────────────────────────────────────────────────────────
      clearError:    () => set({ error: null }),
      getToken:      () => get().user?.token || null,

      // Local-only profile patch (kept for non-API use-cases)
      updateProfile: (data) => set((state) => ({ user: { ...state.user, ...data } })),

      resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/waiter/resetPassword', { email, otp, newPassword });
          set({ isLoading: false });
          return response.data?.success !== false;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;