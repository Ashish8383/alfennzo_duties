// stores/orderHistoryStore.js
import { create } from 'zustand';
import api from '../utils/api';

function toISODate({ day, month, year }) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

const useOrderHistoryStore = create((set, get) => ({
  completedOrders: [],
  completedPage: 1,
  completedTotalPages: 1,
  completedLoading: false,
  completedLoadingMore: false,

  cancelledOrders: [],
  cancelledPage: 1,
  cancelledTotalPages: 1,
  cancelledLoading: false,
  cancelledLoadingMore: false,

  analytics: null,
  dateRange: null,
  error: null,

  fetchOrderHistory: async (status, page = 1, dateRange = null, replace = true) => {
    const isCompleted = status === 'DELIVERED';
    const loadingKey = isCompleted ? 'completedLoading' : 'cancelledLoading';
    const moreKey = isCompleted ? 'completedLoadingMore' : 'cancelledLoadingMore';
    const ordersKey = isCompleted ? 'completedOrders' : 'cancelledOrders';
    const pageKey = isCompleted ? 'completedPage' : 'cancelledPage';
    const totalKey = isCompleted ? 'completedTotalPages' : 'cancelledTotalPages';

    if (replace) set({ [loadingKey]: true, error: null });
    else set({ [moreKey]: true });

    try {
      const params = {
        page,
        limit: 20,
      };

      if (status) params.waiterStatus = status;
      if (dateRange?.from) params.startDate = toISODate(dateRange.from);
      if (dateRange?.to) params.endDate = toISODate(dateRange.to);

      const response = await api.get('/waiter/ordersHistory', { params });

      if (response.data?.status === true) {
        const { analytics, pagination, orders } = response.data.data;

        set(state => ({
          [ordersKey]: replace ? orders : [...state[ordersKey], ...orders],
          [pageKey]: pagination.page,
          [totalKey]: pagination.totalPages,
          ...(isCompleted ? { analytics } : {}),
          [loadingKey]: false,
          [moreKey]: false,
          error: null,
        }));

        return { success: true, data: response.data.data };
      }

      throw new Error(response.data?.message || 'Failed to fetch order history');
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Could not load order history';
      set({
        error: msg,
        [loadingKey]: false,
        [moreKey]: false
      });
      return { error: msg };
    }
  },

  fetchAllOrders: async (dateRange = null) => {
    if (dateRange) set({ dateRange });
    else if (dateRange === null && get().dateRange !== null) set({ dateRange: null });

    const currentRange = dateRange !== undefined ? dateRange : get().dateRange;
    
    await Promise.all([
      get().fetchOrderHistory('DELIVERED', 1, currentRange, true),
      get().fetchOrderHistory('CANCELLED', 1, currentRange, true),
    ]);
  },

  loadMoreCompleted: async () => {
    const { completedPage, completedTotalPages, completedLoadingMore, dateRange, fetchOrderHistory } = get();
    if (completedLoadingMore || completedPage >= completedTotalPages) return;
    await fetchOrderHistory('DELIVERED', completedPage + 1, dateRange, false);
  },

  loadMoreCancelled: async () => {
    const { cancelledPage, cancelledTotalPages, cancelledLoadingMore, dateRange, fetchOrderHistory } = get();
    if (cancelledLoadingMore || cancelledPage >= cancelledTotalPages) return;
    await fetchOrderHistory('CANCELLED', cancelledPage + 1, dateRange, false);
  },

  applyDateRange: async (range) => {
    set({ dateRange: range, completedPage: 1, cancelledPage: 1 });
    await get().fetchAllOrders(range);
  },

  clearDateRange: async () => {
    set({ dateRange: null, completedPage: 1, cancelledPage: 1 });
    await get().fetchAllOrders(null);
  },

  resetOrderHistory: () => {
    set({
      completedOrders: [],
      completedPage: 1,
      completedTotalPages: 1,
      completedLoading: false,
      completedLoadingMore: false,
      cancelledOrders: [],
      cancelledPage: 1,
      cancelledTotalPages: 1,
      cancelledLoading: false,
      cancelledLoadingMore: false,
      analytics: null,
      dateRange: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useOrderHistoryStore;