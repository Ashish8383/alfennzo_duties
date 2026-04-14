// src/stores/uiStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../utils/api';

const useUIStore = create(
  persist(
    (set, get) => ({
      // ── Duty history ────────────────────────────────────────────────────────
      dutyHistory: null,
      dutyHistoryLoading: false,
      dutyHistoryError: null,
      lastFetchedRange: null,

      // ── POS ─────────────────────────────────────────────────────────────────
      posMenu: null,
      posMenuLoading: false,
      posMenuError: null,
      restaurantInfo: null,

      // ── Seating ─────────────────────────────────────────────────────────────
      seatingData: null,

      // ── POS Order creation ───────────────────────────────────────────────────
      orderCreating: false,
      orderError: null,

      // ── Pending orders (waiting for waiter acceptance) ──────────────────────
      pendingOrders: [],
      pendingOrdersLoading: false,
      pendingOrdersError: null,

      // ── Accepted orders (waiter accepted, pending delivery) ─────────────────
      acceptedOrders: [],
      acceptedOrdersLoading: false,
      acceptedOrdersError: null,

      // ── Per-order action loading (keyed by order Id) ─────────────────────────
      acceptingOrderIds: {},   // { [Id]: true }
      deliveringOrderIds: {},  // { [Id]: true }

      // ── Fetch duty history ──────────────────────────────────────────────────
      fetchDutyHistory: async (startDate, endDate) => {
        set({ dutyHistoryLoading: true, dutyHistoryError: null });
        try {
          const response = await api.get(
            `/waiter/dutiesTimingsHistory?startDate=${startDate}&endDate=${endDate}`
          );
          if (response.data?.status === true) {
            set({
              dutyHistory: response.data.data,
              dutyHistoryLoading: false,
              lastFetchedRange: { startDate, endDate },
            });
            return { success: true, data: response.data.data };
          }
          throw new Error(response.data?.message || 'Failed');
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not load shift history';
          set({ dutyHistoryError: msg, dutyHistoryLoading: false });
          return { error: msg };
        }
      },

      // ── Fetch POS menu ──────────────────────────────────────────────────────
      fetchPOSMenu: async () => {
        set({ posMenuLoading: true, posMenuError: null });
        try {
          const response = await api.post('/waiter/WaiterGetMenuForPOSOrder');
          if (response.data?.status === true) {
            const { restaurant, menu, combos, seating } = response.data.data;
            const allRegularItems = [];
            const categories = menu.map(cat => {
              const items = cat.foodItems.map(food => ({
                ...food,
                categoryName: cat.categoryName,
                categoryId: cat._id,
                categoryImage: cat.categoryImage,
                id: food._id,
                name: food.itemName,
                price: food.price?.full ?? 0,
                popular: food.recommended,
                itemType: 'regular',
              }));
              allRegularItems.push(...items);
              return { ...cat, items };
            });
            const comboItems = (combos || []).map(combo => ({
              id: combo._id,
              name: combo.combofoodName,
              price: combo.comboprice,
              description: combo.ComboItems?.length ? `${combo.ComboItems.length} items combo` : 'Combo meal',
              image: combo.image,
              isVeg: combo.isVeg,
              popular: false,
              itemType: 'combo',
              comboData: combo,
              comboItemCount: combo.ComboItems?.length ?? 0,
              isDiscountedByRestraurant: combo.isDiscountedByRestraurant ?? false,
              discountinPercentageByRestraurant: combo.discountinPercentageByRestraurant ?? 0,
              categoryName: 'Combos',
              categoryId: 'combos',
            }));
            const allItems = [...allRegularItems, ...comboItems];
            set({
              posMenu: {
                categories: [
                  ...categories,
                  { _id: 'combos', categoryName: 'Combos', categoryImage: null, items: comboItems },
                ],
                allItems,
                regularItems: allRegularItems,
                comboItems,
                combos,
                itemsById: allItems.reduce((acc, it) => { acc[it.id] = it; return acc; }, {}),
              },
              seatingData: seating,
              restaurantInfo: restaurant,
              posMenuLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data?.message || 'Failed');
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not load menu';
          set({ posMenuError: msg, posMenuLoading: false });
          return { error: msg };
        }
      },

      // ── Create POS Order ─────────────────────────────────────────────────────
      createPOSOrder: async (orderData) => {
        set({ orderCreating: true, orderError: null });
        try {
          const response = await api.post('/waiter/WaiterCreatePOSOrder', orderData);
          if (response.data?.status === true) {
            set({ orderCreating: false });
            return { success: true, data: response.data.data, message: response.data.message };
          }
          throw new Error(response.data?.message || 'Failed to create order');
        } catch (error) {
          const msg = error?.response?.data?.message || error.message || 'Could not create order';
          set({ orderError: msg, orderCreating: false });
          return { error: msg };
        }
      },

      // ── Fetch pending orders ─────────────────────────────────────────────────
      fetchPendingOrders: async () => {
        set({ pendingOrdersLoading: true, pendingOrdersError: null });
        try {
          const response = await api.post('/waiter/PendingOrdersWaitingForAcceptenceByWaiter');
          if (response.data?.status === true) {
            const orders = response.data.data?.orders || [];
            set({ pendingOrders: orders, pendingOrdersLoading: false });
            return { success: true, data: orders };
          }
          throw new Error(response.data?.message || 'Failed');
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not load pending orders';
          set({ pendingOrdersError: msg, pendingOrdersLoading: false });
          return { error: msg };
        }
      },

      // ── Fetch accepted orders ────────────────────────────────────────────────
      fetchAcceptedOrders: async () => {
        set({ acceptedOrdersLoading: true, acceptedOrdersError: null });
        try {
          const response = await api.post('/waiter/WaiterAcceptedOrdersPendingForDelivery');
          if (response.data?.status === true) {
            const waiting = response.data.data?.waitingForPreparation?.orders || [];
            const ready   = response.data.data?.readyForDelivery?.orders || [];
            const allAccepted = [
              ...ready.map(o => ({ ...o, _deliveryStage: 'ready' })),
              ...waiting.map(o => ({ ...o, _deliveryStage: 'preparing' })),
            ];
            set({ acceptedOrders: allAccepted, acceptedOrdersLoading: false });
            return { success: true, data: allAccepted };
          }
          throw new Error(response.data?.message || 'Failed');
        } catch (error) {
          const msg = error?.response?.data?.message || 'Could not load accepted orders';
          set({ acceptedOrdersError: msg, acceptedOrdersLoading: false });
          return { error: msg };
        }
      },

      // ── Accept order (optimistic move + rollback on error) ───────────────────
      //
      // Flow:
      //   1. Save order reference BEFORE any mutation (critical for rollback).
      //   2. Instantly move order: pending → accepted (_optimistic flag set).
      //   3. Await API.
      //   4a. Success → clear loading flag.  Server data reconciled on next poll
      //       or Firebase event (fetchAcceptedOrders called externally).
      //   4b. Error  → restore order to pendingOrders, remove from acceptedOrders.
      //
      acceptOrder: async (orderId) => {
        // ── Step 1: capture snapshot before touching state ──────────────────
        // Declared OUTSIDE try-catch so the catch block can reference it.
        const order = get().pendingOrders.find(o => o.Id === orderId);
        if (!order) return { success: false, error: 'Order not found' };

        // ── Step 2: instant optimistic update + start loading ───────────────
        set(s => ({
          pendingOrders: s.pendingOrders.filter(o => o.Id !== orderId),
          acceptedOrders: [
            { ...order, _deliveryStage: 'preparing', _optimistic: true },
            ...s.acceptedOrders,
          ],
          acceptingOrderIds: { ...s.acceptingOrderIds, [orderId]: true },
        }));

        try {
          // ── Step 3: API call ──────────────────────────────────────────────
          const response = await api.post(
            '/waiter/WaiterAcceptOrderForDelivery',
            { OrderId: orderId }
          );

          if (response.data?.status === true) {
            // ── Step 4a: success ──────────────────────────────────────────
            set(s => ({
              acceptingOrderIds: { ...s.acceptingOrderIds, [orderId]: false },
            }));
            // Refresh accepted list to replace the optimistic entry with real data
            get().fetchAcceptedOrders();
            return { success: true };
          }

          throw new Error(response.data?.message || 'Failed');

        } catch (error) {
          // ── Step 4b: error — rollback to original state ───────────────────
          // `order` was saved before any mutation, so it's always valid here.
          set(s => ({
            // Restore to pending (deduplicate in case a real-time event already added it back)
            pendingOrders: [order, ...s.pendingOrders.filter(o => o.Id !== orderId)],
            // Remove the optimistic accepted entry
            acceptedOrders: s.acceptedOrders.filter(o => o.Id !== orderId),
            acceptingOrderIds: { ...s.acceptingOrderIds, [orderId]: false },
          }));
          const msg = error?.response?.data?.message || 'Could not accept order';
          return { error: msg };
        }
      },

      // ── Mark order as delivered (optimistic remove + rollback on error) ───────
      //
      // Flow:
      //   1. Save order reference BEFORE any mutation (critical for rollback).
      //   2. Instantly remove from acceptedOrders + start loading.
      //   3. Await API.
      //   4a. Success → clear loading flag.
      //   4b. Error  → restore order back into acceptedOrders.
      //
      markDelivered: async (orderId) => {
        // ── Step 1: capture snapshot before touching state ──────────────────
        // Declared OUTSIDE try-catch so the catch block can reference it.
        // (File 2 had a bug here — it re-queried inside catch AFTER the order
        // was already removed, always getting undefined. Fixed by saving upfront.)
        const order = get().acceptedOrders.find(o => o.Id === orderId);
        if (!order) return { success: false, error: 'Order not found' };

        // ── Step 2: instant optimistic remove + start loading ───────────────
        set(s => ({
          acceptedOrders: s.acceptedOrders.filter(o => o.Id !== orderId),
          deliveringOrderIds: { ...s.deliveringOrderIds, [orderId]: true },
        }));

        try {
          // ── Step 3: API call ──────────────────────────────────────────────
          const response = await api.post(
            '/waiter/WaiterMarkOrderAsDelivered',
            { OrderId: orderId }
          );

          if (response.data?.status === true) {
            // ── Step 4a: success ──────────────────────────────────────────
            set(s => ({
              deliveringOrderIds: { ...s.deliveringOrderIds, [orderId]: false },
            }));
            return { success: true };
          }

          throw new Error(response.data?.message || 'Failed');

        } catch (error) {
          // ── Step 4b: error — rollback ─────────────────────────────────────
          // `order` was saved before any mutation, so it's always valid here.
          set(s => ({
            // Restore at original position (deduplicate in case event added it back)
            acceptedOrders: [order, ...s.acceptedOrders.filter(o => o.Id !== orderId)],
            deliveringOrderIds: { ...s.deliveringOrderIds, [orderId]: false },
          }));
          const msg = error?.response?.data?.message || 'Could not mark order as delivered';
          return { error: msg };
        }
      },

      // ── Helpers ──────────────────────────────────────────────────────────────
      clearDutyHistory: () => set({ dutyHistory: null, lastFetchedRange: null }),
      clearPOSMenu: () => set({ posMenu: null, posMenuError: null }),
      clearOrderError: () => set({ orderError: null }),
      clearOrderLists: () => set({ pendingOrders: [], acceptedOrders: [] }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dutyHistory: state.dutyHistory,
        lastFetchedRange: state.lastFetchedRange,
        posMenu: state.posMenu,
        restaurantInfo: state.restaurantInfo,
        seatingData: state.seatingData,
        // ❌ Orders intentionally NOT persisted — always fresh from server
      }),
    }
  )
);

export default useUIStore;