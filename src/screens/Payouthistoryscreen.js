// screens/PayoutHistoryScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useEarningsStore from '../stores/earningsStore';
import { nz, rs, useResponsive } from '../utils/responsive';

const PAY_LIMIT = 10;

const C = {
  primary:      '#0B735F',
  primaryLight: '#E6F4F1',
  primaryPale:  '#F0FAF7',
  background:   '#F5F5F5',
  surface:      '#FFFFFF',
  text:         '#333333',
  textLight:    '#777777',
  textLighter:  '#AAAAAA',
  border:       '#E3E3E3',
  white:        '#FFFFFF',
  black:        '#000000',
  error:        '#FF3B30',
  errorBg:      '#FFF0EF',
  successText:  '#0B735F',
  successBg:    '#E6F4F1',
  infoText:     '#1554A0',
  infoBg:       '#E8F0FE',
  warnText:     '#92520A',
  warnBg:       '#FEF3C7',
  shadow:       'rgba(11,115,95,0.08)',
  r:            nz(12),
  rXl:          nz(20),
};

const currency = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (s) => {
  if (!s) return '';
  const [y, m] = s.split('-');
  return new Date(+y, +m - 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

const dateLabel = (s) =>
  s
    ? new Date(s).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const STATUS_CFG = {
  PAID:       { label: 'Paid',       fg: C.successText, bg: C.successBg },
  PENDING:    { label: 'Pending',    fg: C.infoText,    bg: C.infoBg    },
  PROCESSING: { label: 'Processing', fg: C.warnText,    bg: C.warnBg    },
};

const getStatus = (s) =>
  STATUS_CFG[(s || '').toUpperCase()] || {
    label: s || '—',
    fg: C.textLighter,
    bg: C.background,
  };

const StatusBadge = ({ status }) => {
  const cfg = getStatus(status);
  return (
    <View style={[sb.wrap, { backgroundColor: cfg.bg }]}>
      <View style={[sb.dot, { backgroundColor: cfg.fg }]} />
      <Text style={[sb.txt, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: nz(20),
    gap: rs(4),
  },
  dot: { width: rs(5), height: rs(5), borderRadius: rs(3) },
  txt: { fontSize: nz(11), fontWeight: '700', letterSpacing: 0.3 },
});

const WalletIcon = () => (
  <View style={prow.iconWrap}>
    <View style={prow.walletBody}>
      <View style={prow.walletLine} />
    </View>
    <View style={prow.walletFlap} />
  </View>
);

// ─── Payout Row ───────────────────────────────────────────────────────────────
const PayoutRow = ({ item, isLast }) => (
  <View style={[prow.wrap, !isLast && prow.border]}>
    <WalletIcon />
    <View style={prow.info}>
      <Text style={prow.month}>{monthLabel(item.payoutMonth)}</Text>
      <Text style={prow.date}>
        {item.paidAt ? dateLabel(item.paidAt) : 'Not disbursed yet'}
      </Text>
    </View>
    <View style={prow.right}>
      <Text style={prow.amount}>{currency(item.totalAmount)}</Text>
      <StatusBadge status={item.status} />
    </View>
  </View>
);
const prow = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(14),
    paddingHorizontal: rs(16),
    gap: rs(12),
  },
  border:     { borderBottomWidth: 1, borderBottomColor: C.border },
  iconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: nz(10),
    backgroundColor: C.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBody: {
    width: rs(20),
    height: rs(13),
    borderWidth: 2,
    borderColor: C.infoText,
    borderRadius: nz(3),
    justifyContent: 'flex-end',
    paddingBottom: rs(2),
  },
  walletLine: { height: rs(2), backgroundColor: C.infoText, borderRadius: 1, marginHorizontal: rs(3) },
  walletFlap: {
    position: 'absolute',
    top: rs(6),
    width: rs(14),
    height: rs(4),
    backgroundColor: C.infoBg,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: C.infoText,
    borderTopLeftRadius: nz(2),
    borderTopRightRadius: nz(2),
  },
  info:   { flex: 1, gap: rs(3) },
  month:  { fontSize: nz(13), fontWeight: '700', color: C.text },
  date:   { fontSize: nz(11), color: C.textLight },
  right:  { alignItems: 'flex-end', gap: rs(5) },
  amount: { fontSize: nz(15), fontWeight: '800', color: C.text },
});

const Pagination = ({ pagination, onPage, loading }) => {
  const { currentPage = 1, totalPages = 1, totalDocuments = 0 } = pagination || {};
  if (totalPages <= 1) return null;

  const WIN = 5;
  let start = Math.max(1, currentPage - Math.floor(WIN / 2));
  let end   = Math.min(totalPages, start + WIN - 1);
  if (end - start + 1 < WIN) start = Math.max(1, end - WIN + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const prevDisabled = currentPage <= 1 || loading;
  const nextDisabled = currentPage >= totalPages || loading;

  return (
    <View style={pag.wrap}>
      <Text style={pag.meta}>
        Page <Text style={pag.metaBold}>{currentPage}</Text>
        {' '}of <Text style={pag.metaBold}>{totalPages}</Text>
        {'   ·   '}
        <Text style={pag.metaBold}>{totalDocuments}</Text> records
      </Text>
      <View style={pag.controls}>
        <TouchableOpacity
          style={[pag.navBtn, prevDisabled && pag.navBtnOff]}
          onPress={() => !prevDisabled && onPage(currentPage - 1)}
          activeOpacity={0.7}
          disabled={prevDisabled}
        >
          <Ionicons name="chevron-back" size={nz(16)} color={prevDisabled ? C.textLighter : C.primary} />
          <Text style={[pag.navTxt, prevDisabled && pag.navTxtOff]}>Prev</Text>
        </TouchableOpacity>

        <View style={pag.pages}>
          {start > 1 && <Text style={pag.ellipsis}>…</Text>}
          {pages.map((p) => {
            const active = p === currentPage;
            return (
              <TouchableOpacity
                key={p}
                style={[pag.pageBtn, active && pag.pageBtnActive]}
                onPress={() => !active && !loading && onPage(p)}
                activeOpacity={active ? 1 : 0.7}
                disabled={active || loading}
              >
                <Text style={[pag.pageTxt, active && pag.pageTxtActive]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
          {end < totalPages && <Text style={pag.ellipsis}>…</Text>}
        </View>

        <TouchableOpacity
          style={[pag.navBtn, pag.navBtnFill, nextDisabled && pag.navBtnOff]}
          onPress={() => !nextDisabled && onPage(currentPage + 1)}
          activeOpacity={0.7}
          disabled={nextDisabled}
        >
          {loading ? (
            <ActivityIndicator size="small" color={C.white} style={{ width: nz(14) }} />
          ) : (
            <>
              <Text style={[pag.navTxt, pag.navTxtFill, nextDisabled && pag.navTxtOff]}>Next</Text>
              <Ionicons name="chevron-forward" size={nz(16)} color={nextDisabled ? C.textLighter : C.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
const pag = StyleSheet.create({
  wrap:          { paddingHorizontal: rs(16), paddingTop: rs(14), paddingBottom: rs(16), borderTopWidth: 1, borderTopColor: C.border, gap: rs(10) },
  meta:          { textAlign: 'center', fontSize: nz(11), color: C.textLight },
  metaBold:      { fontWeight: '700', color: C.text },
  controls:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:        { flexDirection: 'row', alignItems: 'center', gap: rs(4), paddingHorizontal: rs(12), paddingVertical: rs(9), borderRadius: nz(10), borderWidth: 1.5, borderColor: C.primary, minWidth: rs(72), justifyContent: 'center' },
  navBtnFill:    { backgroundColor: C.primary },
  navBtnOff:     { borderColor: C.border, backgroundColor: C.background },
  navTxt:        { fontSize: nz(12), fontWeight: '700', color: C.primary },
  navTxtFill:    { color: C.white },
  navTxtOff:     { color: C.textLighter },
  pages:         { flexDirection: 'row', alignItems: 'center', gap: rs(4) },
  ellipsis:      { fontSize: nz(13), color: C.textLighter, paddingHorizontal: rs(2) },
  pageBtn:       { minWidth: rs(32), height: rs(32), paddingHorizontal: rs(6), borderRadius: nz(8), backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
  pageBtnActive: { backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.primary },
  pageTxt:       { fontSize: nz(12), fontWeight: '600', color: C.textLight },
  pageTxtActive: { color: C.primary, fontWeight: '800' },
});

const Empty = ({ msg }) => (
  <View style={emp.wrap}>
    <View style={emp.circle}>
      <View style={[emp.cross, { transform: [{ rotate: '45deg'  }] }]} />
      <View style={[emp.cross, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
    <Text style={emp.txt}>{msg}</Text>
  </View>
);
const emp = StyleSheet.create({
  wrap:   { paddingVertical: rs(36), alignItems: 'center', gap: rs(10) },
  circle: { width: rs(46), height: rs(46), borderRadius: rs(23), backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
  cross:  { position: 'absolute', width: rs(18), height: rs(2.5), backgroundColor: C.textLighter, borderRadius: rs(2) },
  txt:    { fontSize: nz(13), color: C.textLight, textAlign: 'center', lineHeight: nz(20), paddingHorizontal: rs(28) },
});

const Loader = ({ msg }) => (
  <View style={{ paddingVertical: rs(36), alignItems: 'center', gap: rs(10) }}>
    <ActivityIndicator color={C.primary} size="large" />
    <Text style={{ fontSize: nz(13), color: C.textLight }}>{msg}</Text>
  </View>
);

const SummaryBanner = ({ pagination, payoutHistory }) => {
  const totalPaid = payoutHistory
    .filter(p => (p.status || '').toUpperCase() === 'PAID')
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const totalPending = payoutHistory
    .filter(p => (p.status || '').toUpperCase() !== 'PAID')
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return (
    <View style={ban.wrap}>
      <View style={ban.item}>
        <Text style={ban.label}>Total Records</Text>
        <Text style={ban.value}>{pagination?.totalDocuments ?? 0}</Text>
      </View>
      <View style={ban.sep} />
      <View style={ban.item}>
        <Text style={ban.label}>Total Paid</Text>
        <Text style={[ban.value, { color: C.successText }]}>{currency(totalPaid)}</Text>
      </View>
      <View style={ban.sep} />
      <View style={ban.item}>
        <Text style={ban.label}>Pending</Text>
        <Text style={[ban.value, { color: C.warnText }]}>{currency(totalPending)}</Text>
      </View>
    </View>
  );
};
const ban = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: C.r,
    paddingVertical: rs(16),
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 1,
    shadowRadius: rs(8),
    elevation: 3,
  },
  item:  { flex: 1, alignItems: 'center', gap: rs(4) },
  sep:   { width: 1, backgroundColor: C.border, marginVertical: rs(4) },
  label: { fontSize: nz(10), fontWeight: '600', color: C.textLighter, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: nz(15), fontWeight: '800', color: C.text },
});

export default function PayoutHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  const [refreshing,  setRefreshing]  = useState(false);
  const [payChanging, setPayChanging] = useState(false);

  const {
    payoutHistory,
    payoutLoading,
    payoutError,
    payoutPagination,
    fetchPayoutHistory,
  } = useEarningsStore();

  useEffect(() => {
    fetchPayoutHistory({ page: 1, limit: PAY_LIMIT });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPayoutHistory({ page: 1, limit: PAY_LIMIT });
    setRefreshing(false);
  }, []);

  const onPayPage = useCallback(async (page) => {
    setPayChanging(true);
    await fetchPayoutHistory({
      page,
      limit: payoutPagination.limit || PAY_LIMIT,
    });
    setPayChanging(false);
  }, [payoutPagination.limit]);

  const paySpinning = payoutLoading || payChanging;
  const hPad = isTablet ? rs(32) : rs(16);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={nz(24)} color={C.black} />
        </TouchableOpacity>
        <Text style={s.title}>Payout History</Text>
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={refreshing || paySpinning}
        >
          <Ionicons
            name="refresh-outline"
            size={nz(22)}
            color={refreshing || paySpinning ? C.textLighter : C.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.body,
          { paddingHorizontal: hPad, paddingBottom: insets.bottom + rs(32) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {payoutHistory.length > 0 && (
          <SummaryBanner
            pagination={payoutPagination}
            payoutHistory={payoutHistory}
          />
        )}

        {/* List card */}
        <View style={s.listCard}>
          {payoutError ? (
            <View style={s.errInner}>
              <Ionicons name="alert-circle-outline" size={nz(32)} color={C.error} />
              <Text style={s.errTxt}>{payoutError}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                <Text style={s.retryTxt}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : paySpinning && payoutHistory.length === 0 ? (
            <Loader msg="Loading payout records…" />
          ) : payoutHistory.length === 0 ? (
            <Empty msg="No payout records found yet" />
          ) : (
            <>
              {paySpinning && (
                <View style={s.dimOverlay}>
                  <ActivityIndicator color={C.primary} size="large" />
                </View>
              )}
              {payoutHistory.map((item, i) => (
                <PayoutRow
                  key={item._id}
                  item={item}
                  isLast={i === payoutHistory.length - 1}
                />
              ))}
              <Pagination
                pagination={payoutPagination}
                onPage={onPayPage}
                loading={paySpinning}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  body:   { paddingTop: rs(20), gap: rs(16) },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingVertical: rs(11),
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: nz(17),
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.1,
  },

  listCard: {
    backgroundColor: C.surface,
    borderRadius: C.r,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 1,
    shadowRadius: rs(8),
    elevation: 3,
  },
  dimOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  errInner: {
    paddingVertical: rs(32),
    alignItems: 'center',
    gap: rs(10),
    paddingHorizontal: rs(20),
  },
  errTxt: {
    fontSize: nz(13),
    color: C.error,
    textAlign: 'center',
    lineHeight: nz(20),
  },
  retryBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: rs(22),
    paddingVertical: rs(9),
    borderRadius: nz(20),
    marginTop: rs(4),
  },
  retryTxt: { color: C.white, fontWeight: '700', fontSize: nz(13) },
});