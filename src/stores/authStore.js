// stores/authStore.js (alternative version using api instance)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../utils/axiosConfig';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/waiter/waiterLogin', {
            email: email,
            password: password
          });

          console.log('Login response:', response.data);

          // Check if login was successful
          if (response.data && response.data.success !== false) {
            // Extract user data from response
            const userData = {
              id: response.data.data?.id || response.data.userId || response.data._id,
              name: response.data.data?.name || response.data.userName || email.split('@')[0],
              email: response.data.data?.email || email,
              phone: response.data.data?.phone || response.data.mobile || '',
              role: response.data.data?.role || 'waiter',
              token: response.data.token || response.data.accessToken,
              ...response.data.data
            };
            
            set({ 
              user: userData, 
              isAuthenticated: true, 
              isLoading: false,
              error: null
            });
            return true;
          } else {
            throw new Error(response.data?.message || 'Login failed');
          }
        } catch (error) {
          let errorMessage = 'Invalid credentials';
          
          if (error.response) {
            errorMessage = error.response.data?.message || 
                          error.response.data?.error || 
                          `Login failed (${error.response.status})`;
          } else if (error.request) {
            errorMessage = 'Network error. Please check your connection.';
          } else {
            errorMessage = error.message || 'Login failed';
          }
          
          set({ 
            error: errorMessage, 
            isLoading: false,
            user: null,
            isAuthenticated: false
          });
          return false;
        }
      },
      
      logout: async () => {
        try {
          const { user } = get();
          if (user?.token) {
            await api.post('/waiter/logout', {}, {
              headers: {
                'Authorization': `Bearer ${user.token}`
              }
            });
          }
        } catch (error) {
          console.error('Logout API error:', error);
        } finally {
          set({ user: null, isAuthenticated: false, error: null });
        }
      },
      
      clearError: () => set({ error: null }),
      
      updateProfile: (data) => {
        set((state) => ({
          user: { ...state.user, ...data }
        }));
      },
      
      resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/waiter/resetPassword', {
            email,
            otp,
            newPassword
          });
          set({ isLoading: false });
          return response.data?.success !== false;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },
      
      // Get auth token
      getToken: () => {
        const { user } = get();
        return user?.token || null;
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