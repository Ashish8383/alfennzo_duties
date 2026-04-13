// src/stores/uiStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../utils/api';

const useUIStore = create(
  persist(
    (set, get) => ({
      // ── Orders ─────────────────────────────────────────────
      pendingOrders: [],
      pendingOrdersLoading: false,
      pendingOrdersError: null,

      acceptedOrders: [],
      acceptedOrdersLoading: false,
      acceptedOrdersError: null,

      acceptingOrderIds: {},
      deliveringOrderIds: {},

      // ── Fetch Pending Orders ───────────────────────────────
      fetchPendingOrders: async () => {
        set({ pendingOrdersLoading: true, pendingOrdersError: null });

        try {
          const res = await api.post('/waiter/PendingOrdersWaitingForAcceptenceByWaiter');

          if (res.data?.status) {
            set({
              pendingOrders: res.data.data?.orders || [],
              pendingOrdersLoading: false,
            });
            return { success: true };
          }

          throw new Error(res.data?.message);

        } catch (err) {
          const msg = err?.response?.data?.message || 'Failed to fetch pending orders';
          set({ pendingOrdersError: msg, pendingOrdersLoading: false });
          return { error: msg };
        }
      },

      // ── Fetch Accepted Orders ──────────────────────────────
      fetchAcceptedOrders: async () => {
        set({ acceptedOrdersLoading: true, acceptedOrdersError: null });

        try {
          const res = await api.post('/waiter/WaiterAcceptedOrdersPendingForDelivery');

          if (res.data?.status) {
            const waiting = res.data.data?.waitingForPreparation?.orders || [];
            const ready = res.data.data?.readyForDelivery?.orders || [];

            const all = [
              ...ready.map(o => ({ ...o, _deliveryStage: 'ready' })),
              ...waiting.map(o => ({ ...o, _deliveryStage: 'preparing' })),
            ];

            set({
              acceptedOrders: all,
              acceptedOrdersLoading: false,
            });

            return { success: true };
          }

          throw new Error(res.data?.message);

        } catch (err) {
          const msg = err?.response?.data?.message || 'Failed to fetch accepted orders';
          set({ acceptedOrdersError: msg, acceptedOrdersLoading: false });
          return { error: msg };
        }
      },

      // ── 🚀 ACCEPT ORDER (OPTIMIZED) ─────────────────────────
      acceptOrder: async (orderId) => {
        try {
          const state = get();

          // 🔍 Find order
          const order = state.pendingOrders.find(o => o.Id === orderId);
          if (!order) return { success: false };

          // 🔥 Start loading
          set(s => ({
            acceptingOrderIds: {
              ...s.acceptingOrderIds,
              [orderId]: true,
            },
          }));

          // 🚀🔥 INSTANT UI UPDATE
          set(s => ({
            pendingOrders: s.pendingOrders.filter(o => o.Id !== orderId),

            acceptedOrders: [
              {
                ...order,
                _deliveryStage: 'preparing',
                _optimistic: true,
              },
              ...s.acceptedOrders,
            ],
          }));

          // 🌐 API CALL
          const res = await api.post(
            '/waiter/WaiterAcceptOrderForDelivery',
            { OrderId: orderId }
          );

          if (res.data?.status) {
            // ✅ success → remove loading only
            set(s => ({
              acceptingOrderIds: {
                ...s.acceptingOrderIds,
                [orderId]: false,
              },
            }));

            return { success: true };
          }

          throw new Error(res.data?.message);

        } catch (err) {
          const state = get();

          // ❌ ROLLBACK
          const failedOrder = state.acceptedOrders.find(o => o.Id === orderId);

          set(s => ({
            pendingOrders: failedOrder
              ? [failedOrder, ...s.pendingOrders]
              : s.pendingOrders,

            acceptedOrders: s.acceptedOrders.filter(o => o.Id !== orderId),

            acceptingOrderIds: {
              ...s.acceptingOrderIds,
              [orderId]: false,
            },
          }));

          return {
            error: err?.response?.data?.message || 'Accept failed',
          };
        }
      },

      // ── 🚀 MARK DELIVERED (OPTIMIZED) ───────────────────────
      markDelivered: async (orderId) => {
        try {
          set(s => ({
            deliveringOrderIds: {
              ...s.deliveringOrderIds,
              [orderId]: true,
            },
          }));

          // 🚀 instant remove
          const state = get();
          const order = state.acceptedOrders.find(o => o.Id === orderId);

          set(s => ({
            acceptedOrders: s.acceptedOrders.filter(o => o.Id !== orderId),
          }));

          const res = await api.post(
            '/waiter/WaiterMarkOrderAsDelivered',
            { OrderId: orderId }
          );

          if (res.data?.status) {
            set(s => ({
              deliveringOrderIds: {
                ...s.deliveringOrderIds,
                [orderId]: false,
              },
            }));

            return { success: true };
          }

          throw new Error(res.data?.message);

        } catch (err) {
          // ❌ rollback
          const state = get();
          const order = state.acceptedOrders.find(o => o.Id === orderId);

          set(s => ({
            acceptedOrders: order
              ? [order, ...s.acceptedOrders]
              : s.acceptedOrders,

            deliveringOrderIds: {
              ...s.deliveringOrderIds,
              [orderId]: false,
            },
          }));

          return {
            error: err?.response?.data?.message || 'Delivery failed',
          };
        }
      },

      // ── Helpers ────────────────────────────────────────────
      clearOrderLists: () => set({
        pendingOrders: [],
        acceptedOrders: [],
      }),
    }),

    {
      name: 'ui-storage',
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        // ❌ DO NOT persist orders
      }),
    }
  )
);

export default useUIStore;