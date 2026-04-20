// src/stores/earningsStore.js
import { create } from 'zustand';
import api from '../utils/api';

const useEarningsStore = create((set, get) => ({

  monthlyStats: null,
  statsLoading: false,
  statsError: null,

  earningsHistory: [],
  earningsLoading: false,
  earningsError: null,
  earningsPagination: { totalDocuments: 0, totalPages: 0, currentPage: 1, limit: 10 },

  payoutHistory: [],
  payoutLoading: false,
  payoutError: null,
  payoutPagination: { totalDocuments: 0, totalPages: 0, currentPage: 1, limit: 5 },

  selectedMonth: new Date().toISOString().slice(0, 7),

  // ─────────────────────────────────────────────────────────────────────────
  fetchMonthlyStats: async (month) => {
    set({ statsLoading: true, statsError: null });
    try {
      const { data: body } = await api.get(`/waiter/earningStats?month=${month}`);
      if (body?.status) {
        set({ monthlyStats: body.data, statsLoading: false, selectedMonth: month });
        return { success: true };
      }
      throw new Error(body?.message || 'Failed to fetch stats');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load stats';
      set({ statsError: msg, statsLoading: false });
      return { error: msg };
    }
  },

  fetchEarningsHistory: async (params = {}) => {
    const { page = 1, limit = 10, month } = params;
    const currentMonth = month || get().selectedMonth;
    set({ earningsLoading: true, earningsError: null });
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        month: currentMonth,
      }).toString();
      const { data: body } = await api.get(`/waiter/earningHistory?${q}`);
      if (body?.status) {
        const { earnings, pagination } = body.data;
        set({
          earningsHistory: earnings,       // ✅ ALWAYS replace — page-based nav
          earningsPagination: pagination,  // server echoes back the limit we sent
          earningsLoading: false,
          selectedMonth: currentMonth,
        });
        return { success: true };
      }
      throw new Error(body?.message || 'Failed to fetch earnings');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load earnings';
      set({ earningsError: msg, earningsLoading: false });
      return { error: msg };
    }
  },

  fetchPayoutHistory: async (params = {}) => {
    const { page = 1, limit = 5 } = params;
    set({ payoutLoading: true, payoutError: null });
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      }).toString();
      const { data: body } = await api.get(`/waiter/payoutHistory?${q}`);
      if (body?.status) {
        const { payouts, pagination } = body.data;
        set({
          payoutHistory: payouts,          // ✅ ALWAYS replace — page-based nav
          payoutPagination: pagination,
          payoutLoading: false,
        });
        return { success: true };
      }
      throw new Error(body?.message || 'Failed to fetch payouts');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not load payouts';
      set({ payoutError: msg, payoutLoading: false });
      return { error: msg };
    }
  },

  // ── changeMonth also accepts earnLimit so it respects EARN_LIMIT constant ──
  changeMonth: async (month, earnLimit = 10) => {
    set({ selectedMonth: month, earningsHistory: [], earningsPagination: { currentPage: 1 } });
    await Promise.all([
      get().fetchMonthlyStats(month),
      get().fetchEarningsHistory({ page: 1, limit: earnLimit, month }),
    ]);
  },

  // ── initializeEarnings accepts limit overrides from the screen ────────────
  // This way EARN_LIMIT and PAY_LIMIT constants defined in the screen propagate
  // all the way through and the pagination.limit stored in state stays correct.
  initializeEarnings: async (month, earnLimit = 10, payLimit = 5) => {
    const target = month || get().selectedMonth;
    set({
      earningsHistory: [], payoutHistory: [],
      earningsPagination: { currentPage: 1, limit: earnLimit },
      payoutPagination:  { currentPage: 1, limit: payLimit  },
    });
    await Promise.all([
      get().fetchMonthlyStats(target),
      get().fetchEarningsHistory({ page: 1, limit: earnLimit, month: target }),
      get().fetchPayoutHistory({ page: 1, limit: payLimit }),
    ]);
  },

  clearEarnings: () => set({
    monthlyStats: null,
    earningsHistory: [], payoutHistory: [],
    earningsPagination: { totalDocuments: 0, totalPages: 0, currentPage: 1, limit: 10 },
    payoutPagination:  { totalDocuments: 0, totalPages: 0, currentPage: 1, limit: 5  },
  }),
}));

export default useEarningsStore;