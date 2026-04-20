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
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useEarningsStore from '../stores/earningsStore';
import { nz, rs, useResponsive } from '../utils/responsive';

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION LIMITS
// ─────────────────────────────────────────────────────────────────────────────
const EARN_LIMIT = 10;
const PAY_LIMIT  = 10;

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  primary:       '#0B735F',
  primaryDark:   '#085C4C',
  primaryLight:  '#E6F4F1',
  primaryPale:   '#F0FAF7',
  background:    '#F5F5F5',
  surface:       '#FFFFFF',
  text:          '#333333',
  textLight:     '#777777',
  textLighter:   '#AAAAAA',
  border:        '#E3E3E3',
  white:         '#FFFFFF',
  black:         '#000000',
  error:         '#FF3B30',
  errorBg:       '#FFF0EF',
  amber:         '#D97706',
  amberLight:    '#FEF3C7',
  successText:   '#0B735F',
  successBg:     '#E6F4F1',
  infoText:      '#1554A0',
  infoBg:        '#E8F0FE',
  warnText:      '#92520A',
  warnBg:        '#FEF3C7',
  shadow:        'rgba(11,115,95,0.08)',
  r:             nz(12),
  rSm:           nz(8),
  rLg:           nz(16),
  rXl:           nz(20),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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

const timeLabel = (s) =>
  s
    ? new Date(s).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

const shiftMonth = (s, delta) => {
  const [y, m] = s.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isThisMonth = (s) => s === new Date().toISOString().slice(0, 7);

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

// ─────────────────────────────────────────────────────────────────────────────
// LETTER BADGE
// ─────────────────────────────────────────────────────────────────────────────
const LetterBadge = ({ letter, bg, fg }) => (
  <View style={[lb.wrap, { backgroundColor: bg }]}>
    <Text style={[lb.txt, { color: fg }]}>{letter}</Text>
  </View>
);
const lb = StyleSheet.create({
  wrap: {
    width: rs(40), height: rs(40), borderRadius: nz(10),
    alignItems: 'center', justifyContent: 'center',
  },
  txt: { fontSize: nz(15), fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(8), paddingVertical: rs(4),
    borderRadius: nz(20), gap: rs(4),
  },
  dot: { width: rs(5), height: rs(5), borderRadius: rs(3) },
  txt: { fontSize: nz(11), fontWeight: '700', letterSpacing: 0.3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS CARD
// ─────────────────────────────────────────────────────────────────────────────
const StatsCard = ({ data, loading }) => {
  if (loading) return (
    <View style={[crd.wrap, { paddingVertical: rs(44), alignItems: 'center', gap: rs(12) }]}>
      <ActivityIndicator color={C.primary} size="large" />
      <Text style={crd.loadTxt}>Fetching your earnings…</Text>
    </View>
  );
  if (!data) return null;

  const {
    grandTotal, baseSalary, totalIncentive, totalOrders,
    breakdown, payoutStatus, paidAt,
  } = data;
  const user    = breakdown?.userOrders || {};
  const pos     = breakdown?.posOrders  || {};
  const userPct = grandTotal > 0 ? (user.earnings || 0) / grandTotal : 0;

  return (
    <View style={crd.wrap}>
      {/* Accent bar on top */}
      <View style={crd.accentBar} />

      {/* Grand total + status */}
      <View style={crd.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={crd.eyebrow}>MONTHLY TOTAL</Text>
          <Text style={crd.total}>{currency(grandTotal)}</Text>
          {paidAt && (
            <Text style={crd.paidAt}>Disbursed {dateLabel(paidAt)}</Text>
          )}
        </View>
        <StatusBadge status={payoutStatus} />
      </View>

      {/* Divider */}
      <View style={crd.divider} />

      {/* Three stat tiles */}
      <View style={crd.tiles}>
        <View style={crd.tile}>
          <Text style={crd.tileVal}>{currency(baseSalary)}</Text>
          <Text style={crd.tileLbl}>Base Salary</Text>
        </View>
        <View style={crd.tileSep} />
        <View style={crd.tile}>
          <Text style={crd.tileVal}>{currency(totalIncentive)}</Text>
          <Text style={crd.tileLbl}>Incentive</Text>
        </View>
        <View style={crd.tileSep} />
        <View style={crd.tile}>
          <Text style={crd.tileVal}>{totalOrders ?? '—'}</Text>
          <Text style={crd.tileLbl}>Orders</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={crd.divider} />

      {/* Split bar */}
      <View style={crd.barBg}>
        <View style={[crd.barPrimary, { flex: userPct || 0.001 }]} />
        <View style={[crd.barAmber,   { flex: (1 - userPct) || 0.001 }]} />
      </View>

      {/* Legend */}
      <View style={crd.legend}>
        <View style={crd.legendItem}>
          <View style={[crd.dot, { backgroundColor: C.primary }]} />
          <Text style={crd.legendLbl}>User Orders</Text>
          <Text style={crd.legendVal}>
            {currency(user.earnings)}
            <Text style={crd.legendCount}>  ({user.count ?? 0})</Text>
          </Text>
        </View>
        <View style={crd.legendItem}>
          <View style={[crd.dot, { backgroundColor: C.amber }]} />
          <Text style={crd.legendLbl}>POS Orders</Text>
          <Text style={crd.legendVal}>
            {currency(pos.earnings)}
            <Text style={crd.legendCount}>  ({pos.count ?? 0})</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};
const crd = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderRadius: C.rXl,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 1,
    shadowRadius: rs(16),
    elevation: 5,
  },
  accentBar: {
    height: rs(4),
    backgroundColor: C.primary,
    borderTopLeftRadius: C.rXl,
    borderTopRightRadius: C.rXl,
  },
  loadTxt:     { color: C.textLight, fontSize: nz(13) },
  headRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: rs(20), paddingBottom: rs(16) },
  eyebrow:     { fontSize: nz(9), fontWeight: '700', letterSpacing: 1.5, color: C.textLighter, marginBottom: rs(5), textTransform: 'uppercase' },
  total:       { fontSize: nz(32), fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  paidAt:      { fontSize: nz(11), color: C.textLight, marginTop: rs(4) },
  divider:     { height: 1, backgroundColor: C.border, marginHorizontal: rs(20) },
  tiles:       { flexDirection: 'row', paddingVertical: rs(16), paddingHorizontal: rs(20) },
  tile:        { flex: 1, alignItems: 'center' },
  tileSep:     { width: 1, backgroundColor: C.border, marginVertical: rs(4) },
  tileVal:     { fontSize: nz(15), fontWeight: '800', color: C.text, marginBottom: rs(3) },
  tileLbl:     { fontSize: nz(10), color: C.textLighter, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  barBg:       { height: rs(6), flexDirection: 'row', marginHorizontal: rs(20), marginTop: rs(16), marginBottom: rs(12), borderRadius: rs(4), overflow: 'hidden', backgroundColor: C.border },
  barPrimary:  { backgroundColor: C.primary },
  barAmber:    { backgroundColor: C.amber },
  legend:      { flexDirection: 'row', paddingHorizontal: rs(20), paddingBottom: rs(18), gap: rs(20), flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  dot:         { width: rs(7), height: rs(7), borderRadius: rs(4) },
  legendLbl:   { fontSize: nz(12), color: C.textLight },
  legendVal:   { fontSize: nz(12), fontWeight: '700', color: C.text },
  legendCount: { fontWeight: '400', color: C.textLight },
});

// ─────────────────────────────────────────────────────────────────────────────
// MONTH PICKER
// ─────────────────────────────────────────────────────────────────────────────
const MonthPicker = ({ month, onPrev, onNext }) => {
  const locked = isThisMonth(month);
  return (
    <View style={mp.bar}>
      <TouchableOpacity
        style={mp.btn}
        onPress={onPrev}
        activeOpacity={0.65}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={nz(20)} color={C.primary} />
      </TouchableOpacity>

      <View style={mp.center}>
        <Text style={mp.label}>{monthLabel(month)}</Text>
        {locked && (
          <View style={mp.chip}>
            <Text style={mp.chipTxt}>Current Month</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[mp.btn, locked && mp.btnLocked]}
        onPress={locked ? null : onNext}
        activeOpacity={locked ? 1 : 0.65}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-forward" size={nz(20)} color={locked ? C.textLighter : C.primary} />
      </TouchableOpacity>
    </View>
  );
};
const mp = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, paddingHorizontal: rs(20), paddingVertical: rs(14),
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  btn: {
    width: rs(36), height: rs(36), borderRadius: nz(10),
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  btnLocked:  { backgroundColor: C.background },
  center:     { alignItems: 'center', gap: rs(4) },
  label:      { fontSize: nz(15), fontWeight: '700', color: C.text },
  chip: {
    backgroundColor: C.primaryLight, paddingHorizontal: rs(10),
    paddingVertical: rs(2), borderRadius: nz(20),
  },
  chipTxt:    { fontSize: nz(10), fontWeight: '700', color: C.primary, letterSpacing: 0.3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TITLE
// ─────────────────────────────────────────────────────────────────────────────
const SectionTitle = ({ title, total }) => (
  <View style={sec.row}>
    <View style={sec.bar} />
    <Text style={sec.title}>{title}</Text>
    {!!total && (
      <View style={sec.badge}>
        <Text style={sec.badgeTxt}>{total}</Text>
      </View>
    )}
  </View>
);
const sec = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(10) },
  bar:      { width: rs(3), height: rs(16), backgroundColor: C.primary, borderRadius: rs(2) },
  title:    { flex: 1, fontSize: nz(14), fontWeight: '700', color: C.text, letterSpacing: 0.1 },
  badge: {
    backgroundColor: C.primaryLight, paddingHorizontal: rs(9),
    paddingVertical: rs(3), borderRadius: nz(20),
  },
  badgeTxt: { fontSize: nz(11), fontWeight: '700', color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────
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
              <Text style={[pag.navTxt, pag.navTxtFill, nextDisabled && pag.navTxtOff]}>
                Next
              </Text>
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

// ─────────────────────────────────────────────────────────────────────────────
// EARNING ROW
// ─────────────────────────────────────────────────────────────────────────────
const EarningRow = ({ item, isLast }) => {
  const isUser  = item.orderType === 'user_order';
  const shortId = (item.orderId || '').split('#').filter(Boolean).pop()?.slice(0, 12)
                  || item._id?.slice(-8) || '—';

  // Determine commission tag:
  //   • item.incentiveAmount  → fixed ₹ value  (e.g. 10  → "+₹10.00 incentive")
  //   • item.commissionValue  → percentage      (e.g. 5   → "5% commission")
  //   Priority: fixed first, percentage fallback
  const hasFixed      = item.incentiveAmount  != null && item.incentiveAmount  > 0;
  const hasPercentage = item.commissionValue  != null && item.commissionValue  > 0;
  const showTag       = hasFixed || hasPercentage;

  const tagLabel = hasFixed
    ? `+${currency(item.incentiveAmount)} incentive`
    : `${item.commissionValue}% commission`;

  return (
    <View style={[erow.wrap, !isLast && erow.border]}>
      <LetterBadge
        letter={isUser ? 'U' : 'P'}
        bg={isUser ? C.primaryLight : C.amberLight}
        fg={isUser ? C.primary : C.amber}
      />
      <View style={erow.info}>
        <View style={erow.topLine}>
          <Text style={erow.id} numberOfLines={1}>#{shortId}</Text>
          {showTag && (
            <View style={erow.incentiveTag}>
              <View style={erow.incentiveDot} />
              <Text style={erow.incentiveTxt}>{tagLabel}</Text>
            </View>
          )}
        </View>
        <Text style={erow.type}>{isUser ? 'User Order' : 'POS / Waiter Order'}</Text>
        <Text style={erow.date}>
          {dateLabel(item.deliveredAt)}  ·  {timeLabel(item.deliveredAt)}
        </Text>
      </View>
      <Text style={erow.amount}>{currency(item.earningAmount)}</Text>
    </View>
  );
};
const erow = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: rs(14), paddingHorizontal: rs(16), gap: rs(12),
  },
  border:        { borderBottomWidth: 1, borderBottomColor: C.border },
  info:          { flex: 1, gap: rs(3) },
  topLine:       { flexDirection: 'row', alignItems: 'center', gap: rs(6), flexWrap: 'wrap' },
  id:            { fontSize: nz(13), fontWeight: '700', color: C.text, flexShrink: 1 },
  incentiveTag: {
    flexDirection: 'row', alignItems: 'center', gap: rs(4),
    backgroundColor: C.primaryPale,
    paddingHorizontal: rs(7), paddingVertical: rs(2),
    borderRadius: nz(6), borderWidth: 1, borderColor: C.primaryLight,
  },
  incentiveDot:  { width: rs(4), height: rs(4), borderRadius: rs(2), backgroundColor: C.primary },
  incentiveTxt:  { fontSize: nz(10), fontWeight: '700', color: C.primary },
  type:          { fontSize: nz(11), fontWeight: '600', color: C.textLight },
  date:          { fontSize: nz(10), color: C.textLighter },
  amount:        { fontSize: nz(15), fontWeight: '800', color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYOUT ROW
// ─────────────────────────────────────────────────────────────────────────────
const WalletIcon = () => (
  <View style={prow.iconWrap}>
    <View style={prow.walletBody}>
      <View style={prow.walletLine} />
    </View>
    <View style={prow.walletFlap} />
  </View>
);

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
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: rs(14), paddingHorizontal: rs(16), gap: rs(12),
  },
  border:     { borderBottomWidth: 1, borderBottomColor: C.border },
  iconWrap: {
    width: rs(40), height: rs(40), borderRadius: nz(10),
    backgroundColor: C.infoBg, alignItems: 'center', justifyContent: 'center',
  },
  walletBody: {
    width: rs(20), height: rs(13), borderWidth: 2,
    borderColor: C.infoText, borderRadius: nz(3),
    justifyContent: 'flex-end', paddingBottom: rs(2),
  },
  walletLine: { height: rs(2), backgroundColor: C.infoText, borderRadius: 1, marginHorizontal: rs(3) },
  walletFlap: {
    position: 'absolute', top: rs(6), width: rs(14), height: rs(4),
    backgroundColor: C.infoBg, borderTopWidth: 2, borderLeftWidth: 2,
    borderRightWidth: 2, borderColor: C.infoText,
    borderTopLeftRadius: nz(2), borderTopRightRadius: nz(2),
  },
  info:   { flex: 1, gap: rs(3) },
  month:  { fontSize: nz(13), fontWeight: '700', color: C.text },
  date:   { fontSize: nz(11), color: C.textLight },
  right:  { alignItems: 'flex-end', gap: rs(5) },
  amount: { fontSize: nz(15), fontWeight: '800', color: C.text },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function EarningsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { SW, isTablet } = useResponsive();

  const [refreshing,    setRefreshing]    = useState(false);
  const [earnsChanging, setEarnsChanging] = useState(false);
  const [payChanging,   setPayChanging]   = useState(false);

  const {
    monthlyStats, statsLoading, statsError,
    earningsHistory, earningsLoading, earningsError, earningsPagination,
    payoutHistory,   payoutLoading,   payoutError,   payoutPagination,
    selectedMonth,
    initializeEarnings, changeMonth,
    fetchEarningsHistory, fetchPayoutHistory,
  } = useEarningsStore();

  useEffect(() => {
    initializeEarnings(undefined, EARN_LIMIT, PAY_LIMIT);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeEarnings(selectedMonth, EARN_LIMIT, PAY_LIMIT);
    setRefreshing(false);
  }, [selectedMonth]);

  const onEarnPage = useCallback(async (page) => {
    setEarnsChanging(true);
    await fetchEarningsHistory({
      page,
      limit: earningsPagination.limit || EARN_LIMIT,
      month: selectedMonth,
    });
    setEarnsChanging(false);
  }, [selectedMonth, earningsPagination.limit]);

  const onPayPage = useCallback(async (page) => {
    setPayChanging(true);
    await fetchPayoutHistory({
      page,
      limit: payoutPagination.limit || PAY_LIMIT,
    });
    setPayChanging(false);
  }, [payoutPagination.limit]);

  const earnsSpinning = earningsLoading || earnsChanging;
  const paySpinning   = payoutLoading   || payChanging;
  const hPad          = isTablet ? rs(32) : rs(16);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={nz(24)} color={C.black} />
        </TouchableOpacity>

        <Text style={s.title}>My Earnings</Text>

        {/* Mirror spacer — keeps title centered */}
        <View style={{ width: nz(24) }} />
      </View>

      {/* ── MONTH PICKER ── */}
      <MonthPicker
        month={selectedMonth}
        onPrev={() => changeMonth(shiftMonth(selectedMonth, -1))}
        onNext={() => changeMonth(shiftMonth(selectedMonth, +1))}
      />

      {/* ── SCROLLABLE BODY ── */}
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
        {/* Stats Card */}
        {statsError ? (
          <View style={s.errCard}>
            <Text style={s.errTxt}>{statsError}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
              <Text style={s.retryTxt}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <StatsCard data={monthlyStats} loading={statsLoading} />
        )}

        {/* ── TRANSACTIONS ── */}
        <View>
          <SectionTitle
            title="Transactions"
            total={earningsPagination.totalDocuments}
          />
          <View style={s.listCard}>
            {earningsError ? (
              <Empty msg={earningsError} />
            ) : earnsSpinning && earningsHistory.length === 0 ? (
              <Loader msg="Loading transactions…" />
            ) : earningsHistory.length === 0 ? (
              <Empty msg={`No transactions for ${monthLabel(selectedMonth)}`} />
            ) : (
              <>
                {earnsSpinning && (
                  <View style={s.dimOverlay}>
                    <ActivityIndicator color={C.primary} size="large" />
                  </View>
                )}
                {earningsHistory.map((item, i) => (
                  <EarningRow
                    key={item._id}
                    item={item}
                    isLast={i === earningsHistory.length - 1}
                  />
                ))}
                <Pagination
                  pagination={earningsPagination}
                  onPage={onEarnPage}
                  loading={earnsSpinning}
                />
              </>
            )}
          </View>
        </View>

        {/* ── PAYOUT HISTORY ── */}
        <View>
          <SectionTitle
            title="Payout History"
            total={payoutPagination.totalDocuments}
          />
          <View style={s.listCard}>
            {payoutError ? (
              <Empty msg={payoutError} />
            ) : paySpinning && payoutHistory.length === 0 ? (
              <Loader msg="Loading payouts…" />
            ) : payoutHistory.length === 0 ? (
              <Empty msg="No payout records found" />
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
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  body:   { paddingTop: rs(20), gap: rs(20) },

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
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.80)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },

  errCard: {
    backgroundColor: C.errorBg,
    borderRadius: C.r,
    padding: rs(18),
    alignItems: 'center',
    gap: rs(10),
    borderWidth: 1,
    borderColor: '#FECACA',
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
  },
  retryTxt: { color: C.white, fontWeight: '700', fontSize: nz(13) },
});