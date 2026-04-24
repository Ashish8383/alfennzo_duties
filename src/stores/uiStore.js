// src/stores/uiStore.js
import { create } from 'zustand';
import api from '../utils/api';

const useUIStore = create((set, get) => ({
  dutyHistory: null,
  dutyHistoryLoading: false,
  dutyHistoryError: null,
  lastFetchedRange: null,
  cartFormState: null,
  posMenu: null,
  posMenuLoading: false,
  posMenuError: null,
  restaurantInfo: {
    id: null,
    name: null,
    location: null,
    logo: null,
    plateformFee: null,
    qrOrdering: false,
  },

  seatingData: null,

  orderCreating: false,
  orderError: null,

  pendingOrders: [],
  pendingOrdersLoading: false,
  pendingOrdersError: null,

  acceptedOrders: [],
  acceptedOrdersLoading: false,
  acceptedOrdersError: null,

  acceptingOrderIds: {},
  deliveringOrderIds: {},

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

  setCartFormState: (state) => set({ cartFormState: state }),

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
          restaurantInfo: {
            id: restaurant.id,
            name: restaurant.name,
            location: restaurant.location,
            logo: restaurant.logo,
            plateformFee: restaurant.plateformFee,
            qrOrdering: restaurant.qrOrdering,
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

  fetchAcceptedOrders: async () => {
    set({ acceptedOrdersLoading: true, acceptedOrdersError: null });
    try {
      const response = await api.post('/waiter/WaiterAcceptedOrdersPendingForDelivery');
      if (response.data?.status === true) {
        const waiting = response.data.data?.waitingForPreparation?.orders || [];
        const ready = response.data.data?.readyForDelivery?.orders || [];
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

  acceptOrder: async (orderId) => {
    const order = get().pendingOrders.find(o => o.Id === orderId);
    if (!order) return { success: false, error: 'Order not found' };

    set(s => ({
      pendingOrders: s.pendingOrders.filter(o => o.Id !== orderId),
      acceptedOrders: [
        { ...order, _deliveryStage: 'preparing', _optimistic: true },
        ...s.acceptedOrders,
      ],
      acceptingOrderIds: { ...s.acceptingOrderIds, [orderId]: true },
    }));

    try {
      const response = await api.post(
        '/waiter/WaiterAcceptOrderForDelivery',
        { OrderId: orderId }
      );

      if (response.data?.status === true) {
        set(s => ({
          acceptingOrderIds: { ...s.acceptingOrderIds, [orderId]: false },
        }));
        get().fetchAcceptedOrders();
        return { success: true };
      }

      throw new Error(response.data?.message || 'Failed');

    } catch (error) {
      set(s => ({
        pendingOrders: [order, ...s.pendingOrders.filter(o => o.Id !== orderId)],
        acceptedOrders: s.acceptedOrders.filter(o => o.Id !== orderId),
        acceptingOrderIds: { ...s.acceptingOrderIds, [orderId]: false },
      }));

      await get().fetchPendingOrders();

      const msg = error?.response?.data?.message || 'Could not accept order';
      return { error: msg };
    }
  },

  markDelivered: async (orderId) => {
    const order = get().acceptedOrders.find(o => o.Id === orderId);
    if (!order) return { success: false, error: 'Order not found' };

    set(s => ({
      acceptedOrders: s.acceptedOrders.filter(o => o.Id !== orderId),
      deliveringOrderIds: { ...s.deliveringOrderIds, [orderId]: true },
    }));

    try {
      const response = await api.post(
        '/waiter/WaiterMarkOrderAsDelivered',
        { OrderId: orderId }
      );

      if (response.data?.status === true) {
        set(s => ({
          deliveringOrderIds: { ...s.deliveringOrderIds, [orderId]: false },
        }));
        return { success: true };
      }

      throw new Error(response.data?.message || 'Failed');

    } catch (error) {
      set(s => ({
        acceptedOrders: [order, ...s.acceptedOrders.filter(o => o.Id !== orderId)],
        deliveringOrderIds: { ...s.deliveringOrderIds, [orderId]: false },
      }));

      await get().fetchAcceptedOrders();

      const msg = error?.response?.data?.message || 'Could not mark order as delivered';
      return { error: msg };
    }
  },

  clearDutyHistory: () => set({ dutyHistory: null, lastFetchedRange: null }),
  clearPOSMenu: () => set({ posMenu: null, posMenuError: null }),
  clearOrderError: () => set({ orderError: null }),
  clearOrderLists: () => set({ pendingOrders: [], acceptedOrders: [] }),
}));

export default useUIStore;