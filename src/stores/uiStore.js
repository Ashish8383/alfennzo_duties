import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set, get) => ({
      // State
      isDarkMode: false,
      isLoading: false,
      notifications: [],
      
      // Actions
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      addNotification: (message, type = 'info') => {
        const id = Date.now();
        const notification = { 
          id, 
          message, 
          type, 
          timestamp: new Date().toISOString() 
        };
        
        set((state) => ({
          notifications: [...state.notifications, notification]
        }));
        
        // Auto remove after 3 seconds
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        }, 3000);
        
        return id;
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      
      clearNotifications: () => set({ notifications: [] }),
      
      getNotificationColor: (type) => {
        switch(type) {
          case 'success': return '#2ECC71';
          case 'error': return '#E74C3C';
          case 'warning': return '#F39C12';
          default: return '#FF6B35';
        }
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useUIStore;