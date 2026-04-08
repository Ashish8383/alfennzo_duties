// screens/OrderHistoryScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const COMPLETED_ORDERS = [
  {
    id: '1', tableNo: 21, dateTime: '28 July, 12:38 PM', status: 'Delivered',
    restaurant: { name: 'Subway' }, customer: 'Amrit Randhawa',
    items: [
      { id: 'a', name: 'Chiken Fried Rice (Boneless)', qty: 'Half', veg: false },
      { id: 'b', name: 'Burger (Double Patty)',        qty: '×2',   veg: true  },
      { id: 'c', name: 'Ice Cream (Chocolate)',        qty: '×1',   veg: true  },
    ],
    totalAmount: '₹ 540',
  },
  {
    id: '2', tableNo: 14, dateTime: '27 July, 08:10 AM', status: 'Delivered',
    restaurant: { name: 'Subway' }, customer: 'Priya Sharma',
    items: [
      { id: 'd', name: 'Paneer Wrap',     qty: '×1', veg: true  },
      { id: 'e', name: 'Cold Coffee',     qty: '×2', veg: true  },
    ],
    totalAmount: '₹ 320',
  },
  {
    id: '3', tableNo: 9, dateTime: '26 July, 06:45 PM', status: 'Delivered',
    restaurant: { name: 'Subway' }, customer: 'Rohan Verma',
    items: [
      { id: 'f', name: 'Veg Sub 6"',     qty: '×1', veg: true  },
      { id: 'g', name: 'Cookies',         qty: '×3', veg: true  },
    ],
    totalAmount: '₹ 280',
  },
];

const CANCELLED_ORDERS = [
  {
    id: '4', tableNo: 7, dateTime: '26 July, 03:20 PM', status: 'Cancelled',
    restaurant: { name: 'Subway' }, customer: 'Vikas Mehta',
    items: [
      { id: 'h', name: 'Double Patty Burger', qty: '×1', veg: false },
      { id: 'i', name: 'Coke',                qty: '×2', veg: true  },
    ],
    totalAmount: '₹ 370',
  },
  {
    id: '5', tableNo: 3, dateTime: '25 July, 01:10 PM', status: 'Cancelled',
    restaurant: { name: 'Subway' }, customer: 'Neha Singh',
    items: [
      { id: 'j', name: 'Chicken Sub 12"', qty: '×1', veg: false },
    ],
    totalAmount: '₹ 220',
  },
];

// ─── Month / Year data for picker ─────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_IN_MONTH = (m, y) => new Date(y, m + 1, 0).getDate();
const FIRST_DAY     = (m, y) => new Date(y, m, 1).getDay(); // 0=Sun

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  if (!d) return '──';
  return `${pad(d.day)} ${MONTHS[d.month]} ${d.year}`;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelectDate, highlightStart, highlightEnd }) {
  const today = new Date();
  const [view, setView] = useState({ month: today.getMonth(), year: today.getFullYear() });

  const prevMonth = () => {
    setView(v => {
      const m = v.month === 0 ? 11 : v.month - 1;
      const y = v.month === 0 ? v.year - 1 : v.year;
      return { month: m, year: y };
    });
  };
  const nextMonth = () => {
    setView(v => {
      const m = v.month === 11 ? 0 : v.month + 1;
      const y = v.month === 11 ? v.year + 1 : v.year;
      return { month: m, year: y };
    });
  };

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
    const d  = new Date(view.year, view.month, day);
    const s  = new Date(highlightStart.year, highlightStart.month, highlightStart.day);
    const e  = new Date(highlightEnd.year,   highlightEnd.month,   highlightEnd.day);
    return d > s && d < e;
  };

  const isRangeEdge = (day) => {
    if (!day) return false;
    const matchStart = highlightStart &&
      highlightStart.day === day &&
      highlightStart.month === view.month &&
      highlightStart.year === view.year;
    const matchEnd = highlightEnd &&
      highlightEnd.day === day &&
      highlightEnd.month === view.month &&
      highlightEnd.year === view.year;
    return matchStart || matchEnd;
  };

  return (
    <View style={calStyles.wrap}>
      {/* Month nav */}
      <View style={calStyles.navRow}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={nz(18)} color={colors.text} />
        </TouchableOpacity>
        <Text style={calStyles.monthTitle}>
          {MONTHS[view.month]} {view.year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={nz(18)} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={calStyles.dayHeaders}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <Text key={d} style={calStyles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={calStyles.grid}>
        {cells.map((day, idx) => {
          const selected  = isSelected(day);
          const edge      = isRangeEdge(day);
          const between   = inRange(day);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                calStyles.dayCell,
                between && calStyles.dayCellInRange,
                (selected || edge) && calStyles.dayCellSelected,
              ]}
              onPress={() => day && onSelectDate({ day, month: view.month, year: view.year })}
              activeOpacity={day ? 0.7 : 1}
              disabled={!day}
            >
              <Text style={[
                calStyles.dayText,
                between && calStyles.dayTextInRange,
                (selected || edge) && calStyles.dayTextSelected,
              ]}>
                {day || ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Date Range Picker Modal ──────────────────────────────────────────────────
function DateRangeModal({ visible, onClose, onApply }) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [step,    setStep]    = useState('from'); // 'from' | 'to'
  const [fromD,   setFromD]   = useState(null);
  const [toD,     setToD]     = useState(null);

  const reset = () => { setStep('from'); setFromD(null); setToD(null); };

  const handleDay = (dateObj) => {
    if (step === 'from') {
      setFromD(dateObj);
      setToD(null);
      setStep('to');
    } else {
      // Ensure to >= from
      const f = new Date(fromD.year, fromD.month, fromD.day);
      const t = new Date(dateObj.year, dateObj.month, dateObj.day);
      if (t < f) {
        setFromD(dateObj);
        setToD(null);
        setStep('to');
      } else {
        setToD(dateObj);
      }
    }
  };

  const handleApply = () => {
    if (fromD && toD) {
      onApply({ from: fromD, to: toD });
      reset();
      onClose();
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={handleClose} />

      <View style={[modal.sheet, { paddingBottom: (bottomInset > 0 ? bottomInset : nzVertical(16)) + nzVertical(16) }]}>
        {/* Handle */}
        <View style={modal.handle} />

        {/* Title row */}
        <View style={modal.titleRow}>
          <Text style={modal.title}>Select Date Range</Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={nz(22)} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Step indicator */}
        <View style={modal.stepRow}>
          <View style={[modal.stepChip, step === 'from' && modal.stepChipActive]}>
            <Text style={[modal.stepText, step === 'from' && modal.stepTextActive]}>
              From: {fromD ? fmtDate(fromD) : 'Pick start'}
            </Text>
          </View>
          <View style={modal.stepArrow}>
            <Ionicons name="arrow-forward" size={nz(14)} color={colors.textLight} />
          </View>
          <View style={[modal.stepChip, step === 'to' && modal.stepChipActive]}>
            <Text style={[modal.stepText, step === 'to' && modal.stepTextActive]}>
              To: {toD ? fmtDate(toD) : 'Pick end'}
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <MiniCalendar
          selectedDate={step === 'from' ? fromD : toD}
          onSelectDate={handleDay}
          highlightStart={fromD}
          highlightEnd={toD}
        />

        {/* Apply button */}
        <TouchableOpacity
          style={[modal.applyBtn, !(fromD && toD) && modal.applyBtnDisabled]}
          onPress={handleApply}
          activeOpacity={0.85}
          disabled={!(fromD && toD)}
        >
          <Ionicons name="search" size={nz(16)} color={colors.white} style={{ marginRight: nz(8) }} />
          <Text style={modal.applyBtnText}>Search Orders</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Veg / Non-veg dot ───────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  const c = isVeg ? '#2ECC40' : '#FF3B30';
  return (
    <View style={[styles.vegDot, { borderColor: c }]}>
      <View style={[styles.vegDotInner, { backgroundColor: c }]} />
    </View>
  );
}

// ─── History Order Card (expandable) ─────────────────────────────────────────
function HistoryCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const isDelivered = order.status === 'Delivered';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTable}>Table No. {order.tableNo}</Text>
          <Text style={styles.cardDateTime}>{order.dateTime}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: isDelivered ? colors.primary : '#FF3B30' }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Restaurant + Customer */}
      <View style={styles.metaRow}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Restaurant</Text>
          <View style={styles.metaValueRow}>
            <View style={styles.subwayBadge}>
              <Text style={styles.subwayBadgeText}>S</Text>
            </View>
            <Text style={styles.metaValue}>{order.restaurant.name}</Text>
          </View>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Customer</Text>
          <View style={styles.metaValueRow}>
            <Ionicons name="person" size={nz(17)} color={colors.black} style={{ marginRight: nz(4) }} />
            <Text style={styles.metaValue}>{order.customer}</Text>
          </View>
        </View>
      </View>

      {/* Expanded details */}
      {expanded && (
        <>
          <View style={styles.expandDivider} />

          <View style={styles.orderDetailsHeader}>
            <Text style={styles.orderDetailsLabel}>Order details</Text>
            <Text style={styles.orderDetailsLabel}>Qty</Text>
          </View>

          {order.items.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.orderItemRow}>
                <View style={styles.foodThumb}>
                  <Ionicons name="fast-food-outline" size={18} color={colors.textLight} />
                </View>
                <VegDot isVeg={item.veg} />
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemQty}>{item.qty}</Text>
              </View>
              {idx < order.items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{order.totalAmount}</Text>
          </View>
        </>
      )}

      {/* More details toggle */}
      <TouchableOpacity
        style={styles.moreDetailsFooter}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.moreDetailsText}>
          {expanded ? 'Hide details' : 'More details'}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-double-up' : 'chevron-double-down'}
          size={nz(18)}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ label }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="receipt-outline" size={nz(52)} color="#D0D0D0" />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

// ─── ORDER HISTORY SCREEN ─────────────────────────────────────────────────────
export default function OrderHistoryScreen() {
  const [activePage,       setActivePage]       = useState(0);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [appliedRange,     setAppliedRange]     = useState(null);
  const pagerRef = useRef(null);

  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  const switchPage = useCallback((idx) => {
    setActivePage(idx);
    pagerRef.current?.setPage(idx);
  }, []);

  const onPageSelected = useCallback((e) => {
    setActivePage(e.nativeEvent.position);
  }, []);

  const handleApplyRange = (range) => {
    setAppliedRange(range);
  };

  const TABS_CFG = [
    { key: 'completed', label: 'Completed Order', data: COMPLETED_ORDERS },
    { key: 'cancelled', label: 'Cancel Order',    data: CANCELLED_ORDERS },
  ];

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* ── White header ── */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Order History</Text>

          {/* Single calendar button */}
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => setDateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={nz(18)} color={colors.primary} />
            <Text style={styles.calendarBtnText}>
              {appliedRange
                ? `${fmtDate(appliedRange.from)}  →  ${fmtDate(appliedRange.to)}`
                : 'Filter by Date Range'}
            </Text>
            {appliedRange ? (
              <TouchableOpacity
                onPress={() => setAppliedRange(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={nz(16)} color={colors.textLight} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={nz(14)} color={colors.textLight} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Gray body ── */}
        <View style={styles.grayBody}>
          {/* Tab switcher pills */}
          <View style={styles.tabSwitcher}>
            {TABS_CFG.map((tab, idx) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, activePage === idx && styles.tabPillActive]}
                onPress={() => switchPage(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabPillText, activePage === idx && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PagerView */}
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={onPageSelected}
            overdrag
            offscreenPageLimit={1}
          >
            {TABS_CFG.map((tab) => (
              <FlatList
                key={tab.key}
                data={tab.data}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={Platform.OS === 'ios'}
                overScrollMode="never"
                ItemSeparatorComponent={() => <View style={{ height: nzVertical(12) }} />}
                ListEmptyComponent={() => <EmptyState label={`No ${tab.label.toLowerCase()}`} />}
                renderItem={({ item }) => <HistoryCard order={item} />}
              />
            ))}
          </PagerView>
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
const calStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: nz(4),
    paddingBottom: nzVertical(8),
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nzVertical(12),
  },
  navBtn: {
    width: nz(36),
    height: nz(36),
    borderRadius: nz(18),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: rs(15),
    fontWeight: '700',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: nzVertical(6),
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: rs(11),
    color: colors.textLighter,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: nz(20),
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellInRange: {
    backgroundColor: colors.primary + '20',
    borderRadius: 0,
  },
  dayText: {
    fontSize: rs(13),
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  dayTextInRange: {
    color: colors.primary,
    fontWeight: '600',
  },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: nz(24),
    borderTopRightRadius: nz(24),
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(12),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: nz(40),
    height: nz(4),
    borderRadius: nz(2),
    backgroundColor: '#DDDDDD',
    alignSelf: 'center',
    marginBottom: nzVertical(16),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nzVertical(16),
  },
  title: {
    fontSize: rs(17),
    fontWeight: '700',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nzVertical(18),
    gap: nz(8),
  },
  stepChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(10),
    paddingVertical: nzVertical(10),
    paddingHorizontal: nz(10),
    alignItems: 'center',
  },
  stepChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  stepText: {
    fontSize: rs(11),
    color: colors.textLight,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtn: {
    marginTop: nzVertical(18),
    backgroundColor: colors.primary,
    borderRadius: nz(12),
    paddingVertical: nzVertical(15),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  applyBtnDisabled: {
    backgroundColor: '#B0C4BE',
    shadowOpacity: 0,
    elevation: 0,
  },
  applyBtnText: {
    color: colors.white,
    fontSize: rs(15),
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

// ─── Main Screen Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // Header
  headerSection: {
    backgroundColor: colors.white,
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(10),
    paddingBottom: nzVertical(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: rs(isTablet ? 22 : 18),
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
    marginBottom: nzVertical(14),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },

  // Calendar button
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: nz(12),
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(12),
    gap: nz(8),
    backgroundColor: colors.primary + '08',
  },
  calendarBtnText: {
    flex: 1,
    fontSize: rs(13),
    color: colors.primary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Gray body
  grayBody: {
    flex: 1,
    backgroundColor: '#EBEBEB',
    paddingTop: nzVertical(14),
    paddingHorizontal: nz(14),
  },

  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: nz(32),
    padding: nz(4),
    marginBottom: nzVertical(14),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabPill: {
    flex: 1,
    paddingVertical: nzVertical(12),
    borderRadius: nz(28),
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  tabPillText: {
    fontSize: rs(13),
    fontWeight: '600',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  tabPillTextActive: {
    color: colors.white,
  },

  // Pager
  pager: { flex: 1 },
  listContent: {
    paddingTop: nzVertical(4),
    paddingHorizontal: nz(2),
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: nz(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nz(16),
    paddingTop: nzVertical(14),
    paddingBottom: nzVertical(12),
  },
  cardTable: {
    fontSize: rs(15),
    fontWeight: '700',
    color: colors.black,
    marginBottom: nzVertical(2),
  },
  cardDateTime: {
    fontSize: rs(12),
    color: colors.textLight,
  },
  statusChip: {
    borderRadius: nz(20),
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(6),
  },
  statusText: {
    color: colors.white,
    fontSize: rs(12),
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: nz(16),
  },
  metaRow: {
    flexDirection: 'row',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(14),
    gap: nz(12),
  },
  metaBlock: { flex: 1 },
  metaLabel: {
    fontSize: rs(11),
    color: colors.textLighter,
    marginBottom: nzVertical(4),
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaValue: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  subwayBadge: {
    width: nz(24),
    height: nz(24),
    borderRadius: nz(4),
    backgroundColor: '#FBBC04',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(6),
  },
  subwayBadgeText: {
    color: '#1B5E20',
    fontWeight: '900',
    fontSize: rs(12),
  },

  // Expanded
  expandDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: nz(16),
    marginBottom: nzVertical(10),
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    marginBottom: nzVertical(4),
  },
  orderDetailsLabel: {
    fontSize: rs(12),
    color: colors.textLight,
    fontWeight: '600',
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
  },
  foodThumb: {
    width: nz(38),
    height: nz(38),
    borderRadius: nz(8),
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(8),
  },
  vegDot: {
    width: nz(13),
    height: nz(13),
    borderRadius: nz(2),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(6),
  },
  vegDotInner: {
    width: nz(6),
    height: nz(6),
    borderRadius: nz(3),
  },
  itemName: {
    flex: 1,
    fontSize: rs(13),
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  itemQty: {
    fontSize: rs(13),
    fontWeight: '600',
    color: colors.black,
    marginLeft: nz(6),
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: nz(16),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingTop: nzVertical(12),
    paddingBottom: nzVertical(14),
  },
  totalLabel: {
    fontSize: rs(14),
    fontWeight: '700',
    color: colors.black,
  },
  totalValue: {
    fontSize: rs(14),
    fontWeight: '700',
    color: colors.primary,
  },

  // More details footer
  moreDetailsFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C9E8E0',
    paddingVertical: nzVertical(12),
    gap: nz(6),
  },
  moreDetailsText: {
    fontSize: rs(13),
    color: colors.text,
    fontWeight: '500',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingTop: nzVertical(60),
    gap: nzVertical(12),
  },
  emptyText: {
    fontSize: rs(14),
    color: '#B0B0B0',
  },
});