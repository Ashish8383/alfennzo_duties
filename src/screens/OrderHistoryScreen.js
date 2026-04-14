// screens/OrderHistoryScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


import useOrderHistoryStore from '../stores/orderStore';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_IN_MONTH = (m, y) => new Date(y, m + 1, 0).getDate();
const FIRST_DAY     = (m, y) => new Date(y, m, 1).getDay();
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  if (!d) return '──';
  return `${pad(d.day)} ${MONTHS[d.month]} ${d.year}`;
}

/** Format ISO date string → "28 Jul, 12:38 PM" */
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day  = d.getDate();
  const mon  = MONTHS[d.getMonth()];
  let   h    = d.getHours();
  const m    = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day} ${mon}, ${h}:${m} ${ampm}`;
}

/** Format seconds → "4h 12m" or "32m 14s" */
function fmtSeconds(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(sec % 60)}s`;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelectDate, highlightStart, highlightEnd }) {
  const today = new Date();
  const [view, setView] = useState({ month: today.getMonth(), year: today.getFullYear() });

  const prevMonth = () => setView(v => {
    const m = v.month === 0 ? 11 : v.month - 1;
    const y = v.month === 0 ? v.year - 1 : v.year;
    return { month: m, year: y };
  });
  const nextMonth = () => setView(v => {
    const m = v.month === 11 ? 0 : v.month + 1;
    const y = v.month === 11 ? v.year + 1 : v.year;
    return { month: m, year: y };
  });

  const totalDays = DAYS_IN_MONTH(view.month, view.year);
  const startPad  = FIRST_DAY(view.month, view.year);
  const cells     = Array.from({ length: startPad + totalDays }, (_, i) =>
    i < startPad ? null : i - startPad + 1
  );

  const isSelected = (day) =>
    selectedDate &&
    selectedDate.day === day &&
    selectedDate.month === view.month &&
    selectedDate.year === view.year;

  const inRange = (day) => {
    if (!highlightStart || !highlightEnd || !day) return false;
    const d = new Date(view.year, view.month, day);
    const s = new Date(highlightStart.year, highlightStart.month, highlightStart.day);
    const e = new Date(highlightEnd.year,   highlightEnd.month,   highlightEnd.day);
    return d > s && d < e;
  };

  const isEdge = (day) => {
    if (!day) return false;
    return (highlightStart && highlightStart.day === day && highlightStart.month === view.month && highlightStart.year === view.year)
        || (highlightEnd   && highlightEnd.day   === day && highlightEnd.month   === view.month && highlightEnd.year   === view.year);
  };

  return (
    <View style={calSt.wrap}>
      <View style={calSt.navRow}>
        <TouchableOpacity onPress={prevMonth} style={calSt.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={nz(18)} color={colors.text} />
        </TouchableOpacity>
        <Text style={calSt.monthTitle}>{MONTHS[view.month]} {view.year}</Text>
        <TouchableOpacity onPress={nextMonth} style={calSt.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={nz(18)} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={calSt.dayHeaders}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <Text key={d} style={calSt.dayHeader}>{d}</Text>
        ))}
      </View>

      <View style={calSt.grid}>
        {cells.map((day, idx) => {
          const sel     = isSelected(day);
          const edge    = isEdge(day);
          const between = inRange(day);
          return (
            <TouchableOpacity
              key={idx}
              style={[calSt.dayCell, between && calSt.dayCellInRange, (sel || edge) && calSt.dayCellSelected]}
              onPress={() => day && onSelectDate({ day, month: view.month, year: view.year })}
              activeOpacity={day ? 0.7 : 1}
              disabled={!day}
            >
              <Text style={[calSt.dayText, between && calSt.dayTextInRange, (sel || edge) && calSt.dayTextSelected]}>
                {day || ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Date Range Modal ─────────────────────────────────────────────────────────
function DateRangeModal({ visible, onClose, onApply }) {
  const { bottom } = useSafeAreaInsets();
  const [step,  setStep]  = useState('from');
  const [fromD, setFromD] = useState(null);
  const [toD,   setToD]   = useState(null);

  const reset = () => { setStep('from'); setFromD(null); setToD(null); };

  const handleDay = (d) => {
    if (step === 'from') {
      setFromD(d); setToD(null); setStep('to');
    } else {
      const f = new Date(fromD.year, fromD.month, fromD.day);
      const t = new Date(d.year, d.month, d.day);
      if (t < f) { setFromD(d); setToD(null); setStep('to'); }
      else        setToD(d);
    }
  };

  const handleApply = () => {
    if (fromD && toD) { onApply({ from: fromD, to: toD }); reset(); onClose(); }
  };
  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <TouchableOpacity style={modalSt.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={[modalSt.sheet, { paddingBottom: (bottom > 0 ? bottom : nzVertical(16)) + nzVertical(16) }]}>
        <View style={modalSt.handle} />
        <View style={modalSt.titleRow}>
          <Text style={modalSt.title}>Select Date Range</Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={nz(22)} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={modalSt.stepRow}>
          <TouchableOpacity style={[modalSt.stepChip, step === 'from' && modalSt.stepChipActive]} onPress={() => setStep('from')} activeOpacity={0.7}>
            <Text style={modalSt.stepLabel}>FROM</Text>
            <Text style={[modalSt.stepValue, step === 'from' && { color: colors.primary }]}>
              {fromD ? fmtDate(fromD) : 'Pick start date'}
            </Text>
          </TouchableOpacity>
          <Ionicons name="arrow-forward" size={nz(14)} color={colors.textLight} />
          <TouchableOpacity style={[modalSt.stepChip, step === 'to' && modalSt.stepChipActive]} onPress={() => fromD && setStep('to')} activeOpacity={0.7}>
            <Text style={modalSt.stepLabel}>TO</Text>
            <Text style={[modalSt.stepValue, step === 'to' && { color: colors.primary }]}>
              {toD ? fmtDate(toD) : 'Pick end date'}
            </Text>
          </TouchableOpacity>
        </View>

        <MiniCalendar
          selectedDate={step === 'from' ? fromD : toD}
          onSelectDate={handleDay}
          highlightStart={fromD}
          highlightEnd={toD}
        />

        <TouchableOpacity
          style={[modalSt.applyBtn, !(fromD && toD) && modalSt.applyBtnDisabled]}
          onPress={handleApply} activeOpacity={0.85} disabled={!(fromD && toD)}
        >
          <Ionicons name="search" size={nz(16)} color={colors.white} style={{ marginRight: nz(8) }} />
          <Text style={modalSt.applyBtnText}>Search Orders</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Analytics Banner ─────────────────────────────────────────────────────────
function AnalyticsBanner({ analytics }) {
  if (!analytics) return null;
  return (
    <View style={styles.analyticsBanner}>
      <View style={styles.analyticCard}>
        <Ionicons name="checkmark-circle" size={nz(20)} color={colors.primary} />
        <Text style={styles.analyticValue}>{analytics.totalOrdersDelivered}</Text>
        <Text style={styles.analyticLabel}>Delivered</Text>
      </View>
      <View style={styles.analyticDivider} />
      <View style={styles.analyticCard}>
        <Ionicons name="time-outline" size={nz(20)} color="#F5A623" />
        <Text style={[styles.analyticValue, { color: '#F5A623' }]}>
          {fmtSeconds(analytics.avgDeliveryTimeSeconds)}
        </Text>
        <Text style={styles.analyticLabel}>Avg Delivery</Text>
      </View>
    </View>
  );
}

// ─── Veg Dot ──────────────────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  const c = isVeg ? '#2ECC40' : '#FF3B30';
  return (
    <View style={[styles.vegDot, { borderColor: c }]}>
      <View style={[styles.vegDotInner, { backgroundColor: c }]} />
    </View>
  );
}

// ─── History Order Card ───────────────────────────────────────────────────────
function HistoryCard({ order }) {
  const [expanded, setExpanded] = useState(false);

  // Map API fields
  const seat         = order.seatNo || order.tableNo || '—';
  const customer     = order.fullname || order.customer || 'Customer';
  const restName     = order.restaurantName || order.restaurant?.name || '—';
  const restInitial  = restName.charAt(0).toUpperCase();
  const dateTime     = fmtDateTime(order.DeliveredAt || order.WaiterAcceptedAt);
  const totalAmount  = order.TotalAmount != null ? `₹ ${Number(order.TotalAmount).toFixed(2)}` : '—';
  const items        = order.order || order.items || [];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: nz(10) }}>
          <Text style={styles.cardSeat} numberOfLines={1}>{seat}</Text>
          <Text style={styles.cardDateTime}>{dateTime}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: colors.primary }]}>
          <Text style={styles.statusText}>Delivered</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Restaurant + Customer */}
      <View style={styles.metaRow}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Restaurant</Text>
          <View style={styles.metaValueRow}>
            <View style={styles.restBadge}>
              <Text style={styles.restBadgeText}>{restInitial}</Text>
            </View>
            <Text style={styles.metaValue} numberOfLines={1}>{restName}</Text>
          </View>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Customer</Text>
          <View style={styles.metaValueRow}>
            <Ionicons name="person" size={nz(17)} color={colors.black} style={{ marginRight: nz(4) }} />
            <Text style={styles.metaValue} numberOfLines={1}>{customer}</Text>
          </View>
        </View>
      </View>

      {/* Expanded items */}
      {expanded && (
        <>
          <View style={styles.expandDivider} />
          <View style={styles.orderDetailsHeader}>
            <Text style={styles.orderDetailsLabel}>Order details</Text>
            <Text style={styles.orderDetailsLabel}>Qty</Text>
          </View>

          {items.map((item, idx) => {
            const isVeg  = item.veg !== undefined ? item.veg : item.foodtype === 'Veg';
            const name   = item.name || item.foodName || '';
            const qty    = item.qty || (item.quantity != null ? `×${item.quantity}` : '');
            return (
              <View key={item._id || item.id || idx}>
                <View style={styles.orderItemRow}>
                  <View style={styles.foodThumb}>
                    <Ionicons name="fast-food-outline" size={nz(18)} color={colors.textLight} />
                  </View>
                  <VegDot isVeg={isVeg} />
                  <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.itemQty}>{qty}</Text>
                </View>
                {/* Combo sub-items */}
                {item.combo_items?.length > 0 && (
                  <View style={styles.comboBlock}>
                    {item.combo_items.map((ci, j) => (
                      <Text key={j} style={styles.comboLine}>· {ci.foodName}  ×{ci.quantity}</Text>
                    ))}
                  </View>
                )}
                {idx < items.length - 1 && <View style={styles.itemDivider} />}
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{totalAmount}</Text>
          </View>
        </>
      )}

      {/* Expand toggle */}
      <TouchableOpacity
        style={styles.moreDetailsFooter}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <Text style={styles.moreDetailsText}>{expanded ? 'Hide details' : 'More details'}</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-double-up' : 'chevron-double-down'}
          size={nz(18)}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ label, isLoading }) {
  if (isLoading) {
    return (
      <View style={styles.emptyWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyText}>Loading orders…</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="receipt-outline" size={nz(52)} color="#D0D0D0" />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

// ─── Load More Footer ─────────────────────────────────────────────────────────
function LoadMoreFooter({ loading, page, totalPages, onPress }) {
  if (page >= totalPages) return <View style={{ height: nzVertical(8) }} />;
  return (
    <TouchableOpacity style={styles.loadMoreBtn} onPress={onPress} activeOpacity={0.8} disabled={loading}>
      {loading
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <><Ionicons name="chevron-down-circle-outline" size={nz(18)} color={colors.primary} /><Text style={styles.loadMoreText}>Load more</Text></>}
    </TouchableOpacity>
  );
}

// ─── ORDER HISTORY SCREEN (Single Tab) ────────────────────────────────────────
export default function OrderHistoryScreen() {
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const {
    completedOrders,
    completedLoading,
    completedLoadingMore,
    completedPage,
    completedTotalPages,
    analytics,
    dateRange,
    error,
    fetchAllOrders,
    loadMoreCompleted,
    applyDateRange,
    clearDateRange,
  } = useOrderHistoryStore();

  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  // Initial load
  useEffect(() => { 
    fetchAllOrders(); 
  }, []);

  const handleApplyRange = useCallback(async (range) => {
    await applyDateRange(range);
  }, [applyDateRange]);

  const handleClearRange = useCallback(async () => {
    await clearDateRange();
  }, [clearDateRange]);

  const renderCard = useCallback(({ item }) => <HistoryCard order={item} />, []);
  const keyExtractor = useCallback((item) => item._id || item.id, []);
  const separator = useCallback(() => <View style={{ height: nzVertical(12) }} />, []);

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* ── Header ── */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Order History</Text>

          {/* Analytics */}
          <AnalyticsBanner analytics={analytics} />

          {/* Date range filter button */}
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => setDateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={nz(18)} color={colors.primary} />
            <Text style={styles.calendarBtnText} numberOfLines={1}>
              {dateRange
                ? `${fmtDate(dateRange.from)}  →  ${fmtDate(dateRange.to)}`
                : 'Filter by Date Range'}
            </Text>
            {dateRange ? (
              <TouchableOpacity onPress={handleClearRange} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={nz(16)} color={colors.textLight} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={nz(14)} color={colors.textLight} />
            )}
          </TouchableOpacity>

          {/* Error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={nz(14)} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchAllOrders(dateRange)} activeOpacity={0.7}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Body ── */}
        <View style={styles.grayBody}>
          <FlatList
            data={completedOrders}
            keyExtractor={keyExtractor}
            renderItem={renderCard}
            ItemSeparatorComponent={separator}
            contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
            showsVerticalScrollIndicator={false}
            bounces={Platform.OS === 'ios'}
            overScrollMode="never"
            ListEmptyComponent={<EmptyState label="No completed orders" isLoading={completedLoading} />}
            ListFooterComponent={
              <LoadMoreFooter
                loading={completedLoadingMore}
                page={completedPage}
                totalPages={completedTotalPages}
                onPress={loadMoreCompleted}
              />
            }
          />
        </View>
      </SafeAreaView>

      {/* ── Date Range Modal ── */}
      <DateRangeModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        onApply={handleApplyRange}
      />
    </>
  );
}

// ─── Calendar Styles ──────────────────────────────────────────────────────────
const calSt = StyleSheet.create({
  wrap:        { paddingHorizontal: nz(4), paddingBottom: nzVertical(8) },
  navRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: nzVertical(12) },
  navBtn:      { width: nz(36), height: nz(36), borderRadius: nz(18), backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  monthTitle:  { fontSize: rs(15), fontWeight: '700', color: colors.black, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  dayHeaders:  { flexDirection: 'row', marginBottom: nzVertical(6) },
  dayHeader:   { flex: 1, textAlign: 'center', fontSize: rs(11), color: colors.textLighter, fontWeight: '600' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell:     { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: nz(20) },
  dayCellSelected: { backgroundColor: colors.primary },
  dayCellInRange:  { backgroundColor: colors.primary + '20', borderRadius: 0 },
  dayText:         { fontSize: rs(13), color: colors.text, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  dayTextInRange:  { color: colors.primary, fontWeight: '600' },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const modalSt = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopLeftRadius: nz(24), borderTopRightRadius: nz(24), paddingHorizontal: nz(20), paddingTop: nzVertical(12), shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 20 },
  handle:     { width: nz(40), height: nz(4), borderRadius: nz(2), backgroundColor: '#DDDDDD', alignSelf: 'center', marginBottom: nzVertical(16) },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: nzVertical(16) },
  title:      { fontSize: rs(17), fontWeight: '700', color: colors.black, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  stepRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: nzVertical(18), gap: nz(8) },
  stepChip:   { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: nz(10), paddingVertical: nzVertical(10), paddingHorizontal: nz(10) },
  stepChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '0D' },
  stepLabel:  { fontSize: rs(9), color: colors.textLighter, fontWeight: '700', letterSpacing: 0.5, marginBottom: nzVertical(2) },
  stepValue:  { fontSize: rs(12), color: colors.textLight, fontWeight: '600' },
  applyBtn:   { marginTop: nzVertical(18), backgroundColor: colors.primary, borderRadius: nz(12), paddingVertical: nzVertical(15), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  applyBtnDisabled: { backgroundColor: '#B0C4BE', shadowOpacity: 0, elevation: 0 },
  applyBtnText: { color: colors.white, fontSize: rs(15), fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },

  // Header
  headerSection: { backgroundColor: colors.white, paddingHorizontal: nz(20), paddingTop: nzVertical(10), paddingBottom: nzVertical(14), borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:   { fontSize: rs(isTablet ? 22 : 18), fontWeight: '700', color: colors.black, textAlign: 'center', marginBottom: nzVertical(12), fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },

  // Analytics banner
  analyticsBanner:  { flexDirection: 'row', backgroundColor: colors.primary + '0D', borderRadius: nz(14), paddingVertical: nzVertical(12), marginBottom: nzVertical(12), borderWidth: 1, borderColor: colors.primary + '25' },
  analyticCard:     { flex: 1, alignItems: 'center', gap: nzVertical(3) },
  analyticValue:    { fontSize: rs(20), fontWeight: '800', color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  analyticLabel:    { fontSize: rs(10), color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  analyticDivider:  { width: 1, backgroundColor: colors.primary + '30' },

  // Calendar button
  calendarBtn:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, borderRadius: nz(12), paddingHorizontal: nz(14), paddingVertical: nzVertical(12), gap: nz(8), backgroundColor: colors.primary + '08' },
  calendarBtnText: { flex: 1, fontSize: rs(13), color: colors.primary, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: nz(6), marginTop: nzVertical(10), backgroundColor: '#FFF5F5', borderRadius: nz(8), paddingHorizontal: nz(12), paddingVertical: nzVertical(8), borderWidth: 1, borderColor: '#FFCDD2' },
  errorText:   { flex: 1, fontSize: rs(12), color: '#D32F2F' },
  retryText:   { fontSize: rs(12), color: colors.primary, fontWeight: '700' },

  // Gray body
  grayBody: { flex: 1, backgroundColor: '#EBEBEB', paddingTop: nzVertical(14), paddingHorizontal: nz(14) },

  // List
  listContent: { paddingTop: nzVertical(4), paddingHorizontal: nz(2) },

  // Load more
  loadMoreBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(6), marginTop: nzVertical(12), marginBottom: nzVertical(4), paddingVertical: nzVertical(12), borderRadius: nz(12), backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '30' },
  loadMoreText: { fontSize: rs(13), fontWeight: '600', color: colors.primary },

  // Card
  card:        { backgroundColor: colors.white, borderRadius: nz(14), overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(16), paddingTop: nzVertical(14), paddingBottom: nzVertical(12) },
  cardSeat:    { fontSize: rs(14), fontWeight: '700', color: colors.black, marginBottom: nzVertical(2) },
  cardDateTime:{ fontSize: rs(12), color: colors.textLight },
  statusChip:  { borderRadius: nz(20), paddingHorizontal: nz(14), paddingVertical: nzVertical(6) },
  statusText:  { color: colors.white, fontSize: rs(12), fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: nz(16) },

  metaRow:     { flexDirection: 'row', paddingHorizontal: nz(16), paddingVertical: nzVertical(14), gap: nz(12) },
  metaBlock:   { flex: 1, minWidth: 0 },
  metaLabel:   { fontSize: rs(11), color: colors.textLighter, marginBottom: nzVertical(4) },
  metaValueRow:{ flexDirection: 'row', alignItems: 'center' },
  metaValue:   { fontSize: rs(14), fontWeight: '600', color: colors.black, flexShrink: 1, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  restBadge:   { width: nz(24), height: nz(24), borderRadius: nz(4), backgroundColor: '#FBBC04', justifyContent: 'center', alignItems: 'center', marginRight: nz(6) },
  restBadgeText:{ color: '#1B5E20', fontWeight: '900', fontSize: rs(12) },

  expandDivider:       { height: 1, backgroundColor: colors.border, marginHorizontal: nz(16), marginBottom: nzVertical(10) },
  orderDetailsHeader:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), marginBottom: nzVertical(4) },
  orderDetailsLabel:   { fontSize: rs(12), color: colors.textLight, fontWeight: '600' },

  orderItemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(16), paddingVertical: nzVertical(8) },
  foodThumb:    { width: nz(38), height: nz(38), borderRadius: nz(8), backgroundColor: '#F4F4F4', justifyContent: 'center', alignItems: 'center', marginRight: nz(8) },
  vegDot:       { width: nz(13), height: nz(13), borderRadius: nz(2), borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: nz(6), flexShrink: 0 },
  vegDotInner:  { width: nz(6), height: nz(6), borderRadius: nz(3) },
  itemName:     { flex: 1, fontSize: rs(13), color: colors.text, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  itemQty:      { fontSize: rs(13), fontWeight: '600', color: colors.black, marginLeft: nz(6) },
  itemDivider:  { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: nz(16) },

  comboBlock: { paddingLeft: nz(28), paddingBottom: nzVertical(4) },
  comboLine:  { fontSize: rs(11), color: colors.textLight, lineHeight: nzVertical(18) },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), paddingTop: nzVertical(12), paddingBottom: nzVertical(14) },
  totalLabel: { fontSize: rs(14), fontWeight: '700', color: colors.black },
  totalValue: { fontSize: rs(14), fontWeight: '700', color: colors.primary },

  moreDetailsFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#C9E8E0', paddingVertical: nzVertical(12), gap: nz(6) },
  moreDetailsText:   { fontSize: rs(13), color: colors.text, fontWeight: '500' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: nzVertical(60), gap: nzVertical(12) },
  emptyText: { fontSize: rs(14), color: '#B0B0B0' },
});