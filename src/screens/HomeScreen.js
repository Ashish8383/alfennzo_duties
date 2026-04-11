// screens/HomeScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { off, onChildAdded, onValue, ref } from 'firebase/database';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../stores/authStore';
import useUIStore from '../stores/uiStore';
import colors from '../utils/colors';
import { database } from '../utils/firebase';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

const TABS = [
  { key: 'pending', label: 'Pending order' },
  { key: 'ongoing', label: 'Ongoing Order' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Top Toast ────────────────────────────────────────────────────────────────
function Toast({ toastRef }) {
  const translateY = useRef(new Animated.Value(-nzVertical(80))).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const [msg, setMsg]   = useState('');
  const [type, setType] = useState('success');
  const timerRef = useRef(null);

  toastRef.current = (message, kind = 'success') => {
    clearTimeout(timerRef.current);
    setMsg(message);
    setType(kind);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 16 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -nzVertical(80), duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }, 2800);
  };

  const bg = type === 'success' ? colors.primary : type === 'error' ? '#D32F2F' : '#37474F';
  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'close-circle' : 'information-circle';

  return (
    <Animated.View pointerEvents="none" style={[toastSt.wrap, { backgroundColor: bg, opacity, transform: [{ translateY }] }]}>
      <Ionicons name={iconName} size={nz(18)} color="#fff" />
      <Text style={toastSt.txt} numberOfLines={2}>{msg}</Text>
    </Animated.View>
  );
}

const toastSt = StyleSheet.create({
  wrap: {
    position: 'absolute', top: nzVertical(54), left: nz(16), right: nz(16),
    flexDirection: 'row', alignItems: 'center', gap: nz(10),
    paddingHorizontal: nz(16), paddingVertical: nzVertical(13),
    borderRadius: nz(14), shadowColor: '#000', shadowOpacity: 0.22,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 9999,
  },
  txt: { flex: 1, fontSize: rs(13), fontWeight: '600', color: '#fff', lineHeight: nzVertical(19) },
});

// ─── Duty Toggle Switch ───────────────────────────────────────────────────────
function DutySwitch({ value, onValueChange, disabled }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 10, speed: 14 }).start();
  }, [value]);
  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['#FFCDD2', '#4CD964'] });
  const thumbLeft  = anim.interpolate({ inputRange: [0, 1], outputRange: [nz(3), nz(27)] });
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => !disabled && onValueChange(!value)} disabled={disabled}>
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.switchThumb, { left: thumbLeft }]}>
          {disabled
            ? <ActivityIndicator size={nz(10)} color={value ? '#4CD964' : '#FF3B30'} />
            : <Ionicons name={value ? 'checkmark' : 'close'} size={nz(11)} color={value ? '#4CD964' : '#FF3B30'} />}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Duty Confirm Modal ───────────────────────────────────────────────────────
function DutyModal({ visible, goingOnDuty, onConfirm, onCancel, isLoading }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, mdSt.overlay, { opacity: anim }]}>
      <Animated.View style={[mdSt.box, { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
        <View style={[mdSt.iconWrap, { backgroundColor: goingOnDuty ? '#E8F5F0' : '#FFF3F3' }]}>
          <Ionicons name={goingOnDuty ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={nz(40)} color={goingOnDuty ? colors.primary : '#E53935'} />
        </View>
        <Text style={mdSt.title}>{goingOnDuty ? 'Go On Duty?' : 'Go Off Duty?'}</Text>
        <Text style={mdSt.subtitle}>
          {goingOnDuty
            ? 'You will start receiving new orders and appear available to customers.'
            : 'You will stop receiving new orders. Finish current orders before going off duty.'}
        </Text>
        <View style={mdSt.btnRow}>
          <TouchableOpacity style={mdSt.cancelBtn} onPress={onCancel} disabled={isLoading} activeOpacity={0.7}>
            <Text style={mdSt.cancelText}>Not Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[mdSt.confirmBtn, { backgroundColor: goingOnDuty ? colors.primary : '#E53935' }, isLoading && { opacity: 0.7 }]}
            onPress={onConfirm} disabled={isLoading} activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={mdSt.confirmText}>{goingOnDuty ? 'Go On Duty' : 'Go Off Duty'}</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const mdSt = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: nz(28), zIndex: 99 },
  box: { backgroundColor: colors.white, borderRadius: nz(22), padding: nz(24), alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  iconWrap: { width: nz(72), height: nz(72), borderRadius: nz(36), justifyContent: 'center', alignItems: 'center', marginBottom: nzVertical(16) },
  title: { fontSize: rs(18), fontWeight: '700', color: colors.black, marginBottom: nzVertical(8), textAlign: 'center' },
  subtitle: { fontSize: rs(13), color: colors.textLight, textAlign: 'center', lineHeight: nzVertical(20), marginBottom: nzVertical(22) },
  btnRow: { flexDirection: 'row', gap: nz(12), width: '100%' },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: nz(12), paddingVertical: nzVertical(13), alignItems: 'center' },
  cancelText: { fontSize: rs(14), fontWeight: '600', color: colors.textLight },
  confirmBtn: { flex: 1, borderRadius: nz(12), paddingVertical: nzVertical(13), alignItems: 'center' },
  confirmText: { fontSize: rs(14), fontWeight: '700', color: colors.white },
});

// ─── Veg Dot ──────────────────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  const c = isVeg ? '#2ECC40' : '#FF3B30';
  return (
    <View style={[styles.vegDot, { borderColor: c }]}>
      <View style={[styles.vegDotInner, { backgroundColor: c }]} />
    </View>
  );
}

// ─── Order Item ───────────────────────────────────────────────────────────────
function OrderItem({ item }) {
  const isVeg = item.veg !== undefined ? item.veg : item.foodtype === 'Veg';
  const name  = item.name || item.foodName || '';
  const qty   = item.qty || (item.quantity != null ? `×${item.quantity}` : '');
  return (
    <View style={styles.orderItemRow}>
      <View style={styles.foodThumb}>
        <Ionicons name="fast-food-outline" size={nz(18)} color={colors.textLight} />
      </View>
      <VegDot isVeg={isVeg} />
      <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
      <Text style={styles.itemQty}>{qty}</Text>
    </View>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, actionLabel, actionIcon, actionLoading, onAction }) {
  const [expanded, setExpanded] = useState(false);

  const tableLabel   = order.seatNo || (order.tableNo != null ? `Table No. ${order.tableNo}` : '—');
  const customerName = order.customer || order.fullname || 'Customer';
  const restName     = order.restaurant?.name || order.restaurantName || '—';
  const ago          = order.timeAgo || timeAgo(order.createdAt || order.WaiterAcceptedAt);
  const totalLabel   = order.TotalAmount != null ? `₹${order.TotalAmount}` : `${(order.items || order.order || []).length} Items`;
  const rawItems = order.items || order.order || [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tableChip}>
          <Ionicons name="location-outline" size={nz(13)} color={colors.white} style={{ marginRight: nz(3) }} />
          <Text style={styles.tableChipText} numberOfLines={1}>{tableLabel}</Text>
        </View>
        <View style={styles.timeChip}>
          <Ionicons name="time-outline" size={nz(13)} color={colors.textLight} />
          <Text style={styles.timeChipText}> {ago}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Restaurant</Text>
          <View style={styles.metaValueRow}>
            <View style={styles.subwayBadge}>
              <Text style={styles.subwayBadgeText}>{restName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.metaValue} numberOfLines={1}>{restName}</Text>
          </View>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Customer</Text>
          <View style={styles.metaValueRow}>
            <Ionicons name="person" size={nz(18)} color={colors.black} style={{ marginRight: nz(5) }} />
            <Text style={styles.metaValue} numberOfLines={1}>{customerName}</Text>
          </View>
        </View>
      </View>

      {expanded && (
        <>
          <View style={styles.divider} />
          <View style={styles.orderDetailsHeader}>
            <Text style={styles.orderDetailsLabel}>Order details</Text>
            <Text style={styles.orderDetailsQty}>Qty</Text>
          </View>
          {rawItems.map((item, idx) => (
            <View key={item.id || item._id || idx}>
              <OrderItem item={item} />
              {item.combo_items?.length > 0 && (
                <View style={styles.comboBlock}>
                  {item.combo_items.map((ci, j) => (
                    <Text key={j} style={styles.comboLine}>· {ci.foodName}  ×{ci.quantity}</Text>
                  ))}
                </View>
              )}
              {idx < rawItems.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{totalLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, actionLoading && styles.actionBtnLoading]}
            onPress={onAction} disabled={actionLoading} activeOpacity={0.85}
          >
            {actionLoading
              ? <><ActivityIndicator color={colors.white} size="small" /><Text style={styles.actionBtnText}>Please wait…</Text></>
              : <><Ionicons name={actionIcon} size={nz(19)} color={colors.white} /><Text style={styles.actionBtnText}>{actionLabel}</Text></>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.moreDetailsFooter} onPress={() => setExpanded(p => !p)} activeOpacity={0.7}>
        <Text style={styles.moreDetailsText}>{expanded ? 'Hide details' : 'More details'}</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-double-up' : 'chevron-double-down'} size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Off-Duty Banner ──────────────────────────────────────────────────────────
function OffDutyBanner() {
  return (
    <View style={styles.offDutyWrap}>
      <View style={styles.offDutyIconWrap}>
        <MaterialCommunityIcons name="sleep" size={nz(44)} color={colors.textLighter} />
      </View>
      <Text style={styles.offDutyTitle}>You are Off Duty</Text>
      <Text style={styles.offDutySubtitle}>Toggle the switch above to go on duty and start receiving orders.</Text>
    </View>
  );
}

// ─── Lottie Empty State ───────────────────────────────────────────────────────
// Shows the panda.json animation with a label and subtitle.
// Used for both Pending and Ongoing tabs when empty.
function LottieEmptyPage({ label, sub }) {
  return (
    <View style={styles.lottieEmptyWrap}>
      <LottieView
        source={require('../assets/images/panda.json')}
        autoPlay
        loop
        style={styles.lottieAnim}
      />
      <Text style={styles.lottieLabel}>{label}</Text>
      {sub ? <Text style={styles.lottieSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Ripple Badge ─────────────────────────────────────────────────────────────
const BADGE_SIZE = nz(20);
const RING_COUNT = 2;

function RippleBadge({ count, isFocused }) {
  const rings = useRef(
    Array.from({ length: RING_COUNT }, (_, i) => ({
      scale: new Animated.Value(1), opacity: new Animated.Value(0), delay: i * 550,
    }))
  ).current;
  const loopsRef = useRef([]);

  useEffect(() => {
    loopsRef.current.forEach(l => l.stop());
    loopsRef.current = [];

    if (count > 0) {
      rings.forEach(({ scale, opacity, delay }) => {
        scale.setValue(1); opacity.setValue(0.75);
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale,   { toValue: 2.8, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0,   duration: 1300, easing: Easing.out(Easing.quad),  useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(scale,   { toValue: 1,    duration: 0, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0.75, duration: 0, useNativeDriver: true }),
            ]),
          ])
        );
        loop.start();
        loopsRef.current.push(loop);
      });
    } else {
      rings.forEach(({ scale, opacity }) => { scale.setValue(1); opacity.setValue(0); });
    }
    return () => loopsRef.current.forEach(l => l.stop());
  }, [count]);

  const ringColor = isFocused ? 'rgba(255,255,255,0.6)' : `${colors.primary}60`;

  return (
    <View style={rbSt.outer}>
      {rings.map(({ scale, opacity }, i) => (
        <Animated.View key={i} pointerEvents="none"
          style={[rbSt.ring, { backgroundColor: ringColor, opacity, transform: [{ scale }] }]} />
      ))}
      <View style={[rbSt.badge, isFocused ? rbSt.badgeFocused : rbSt.badgeInactive]}>
        <Text style={rbSt.badgeText}>{count}</Text>
      </View>
    </View>
  );
}

const rbSt = StyleSheet.create({
  outer:         { width: nz(30), height: nz(30), justifyContent: 'center', alignItems: 'center' },
  ring:          { position: 'absolute', width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2 },
  badge:         { minWidth: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2, justifyContent: 'center', alignItems: 'center', paddingHorizontal: nz(5) },
  badgeFocused:  { backgroundColor: 'rgba(255,255,255,0.30)' },
  badgeInactive: { backgroundColor: colors.primary },
  badgeText:     { fontSize: rs(10), fontWeight: '700', color: colors.white },
});

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
function TabSwitcher({ activePage, onTabPress, pendingCount, ongoingCount }) {
  return (
    <View style={styles.tabSwitcher}>
      {TABS.map((tab, index) => {
        const isFocused = activePage === index;
        const count     = index === 0 ? pendingCount : ongoingCount;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabPill, isFocused && styles.tabPillActive]}
            onPress={() => onTabPress(index)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabPillText, isFocused && styles.tabPillTextActive]}>
              {tab.label}
            </Text>
            {count > 0 && <RippleBadge count={count} isFocused={isFocused} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const { user, changeDutytoggal } = useAuthStore();
  const {
    pendingOrders, pendingOrdersLoading,
    acceptedOrders, acceptedOrdersLoading,
    acceptingOrderIds, deliveringOrderIds,
    fetchPendingOrders, fetchAcceptedOrders,
    acceptOrder, markDelivered, clearOrderLists,
  } = useUIStore();

  const displayName  = user?.fullName || user?.name || 'Waiter';
  const firstName    = displayName.split(' ')[0];
  const restaurantId = user?.restaurantId || user?.restaurant?._id || null;
  const waiterId     = user?.waiterId || user?.waiter?._id || user?._id || user?.id || null;

  const [isOnDuty,      setIsOnDuty]      = useState(user?.isOnDuty ?? false);
  const [activePage,    setActivePage]    = useState(0);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [pendingToggle, setPendingToggle] = useState(false);
  const [dutyLoading,   setDutyLoading]   = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const pagerRef  = useRef(null);
  const showToast = useRef(null);
  const insets    = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  // Handle notification-tap deep link
  useEffect(() => {
    const tab = route?.params?.initialTab;
    if (tab !== undefined && tab !== null) {
      switchTab(tab);
      navigation?.setParams?.({ initialTab: undefined });
    }
  }, [route?.params?.initialTab]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchPendingOrders(), fetchAcceptedOrders()]);
  }, [fetchPendingOrders, fetchAcceptedOrders]);

  // Firebase Realtime DB — data refresh only (no showInAppNotification here)
  useEffect(() => {
    if (!isOnDuty) { clearOrderLists?.(); return; }
    if (!restaurantId) return;

    fetchAll();
    const listeners = [];

    const connectedRef = ref(database, '.info/connected');
    const connectedCb  = (snap) => setFirebaseConnected(snap.val() === true);
    onValue(connectedRef, connectedCb);
    listeners.push({ ref: connectedRef, callback: connectedCb, type: 'value' });

    const eventsRef   = ref(database, `${restaurantId}/events`);
    const skipInitial = { current: true };
    const skipTimer   = setTimeout(() => { skipInitial.current = false; }, 2000);

    const eventCb = (snapshot) => {
      const d = snapshot.val();
      let eventType;
      if (typeof d?.data === 'string') eventType = d.data;
      else if (d?.data?.type)          eventType = d.data.type;
      else if (d?.type)                eventType = d.type;

      if (skipInitial.current || !eventType) return;

      switch (eventType) {
        case 'ORDERPLACED':
          fetchPendingOrders();
          fetchAcceptedOrders();
          showToast.current?.('New order received!', 'info');
          break;
        case 'WAITER_ACCEPTED': {
          const acceptedWaiterId = d?.data?.waiterId;
          fetchPendingOrders();
          fetchAcceptedOrders();
          if (acceptedWaiterId && waiterId && acceptedWaiterId !== waiterId)
            showToast.current?.('Another waiter accepted an order', 'info');
          break;
        }
        case 'ORDER_DELIVERED_CONFIRMED':
          fetchAcceptedOrders();
          showToast.current?.('Order delivered!', 'success');
          break;
        default: break;
      }
    };

    onChildAdded(eventsRef, eventCb);
    listeners.push({ ref: eventsRef, callback: eventCb, type: 'child_added' });

    return () => {
      clearTimeout(skipTimer);
      listeners.forEach(({ ref: r, callback: cb, type: t }) => off(r, t, cb));
    };
  }, [isOnDuty, restaurantId, fetchAll]);

  useEffect(() => {
    if (user?.isOnDuty !== undefined) setIsOnDuty(user.isOnDuty);
  }, [user?.isOnDuty]);

  const switchTab = useCallback((index) => {
    setActivePage(index);
    pagerRef.current?.setPage(index);
  }, []);

  const onPageSelected = useCallback((e) => setActivePage(e.nativeEvent.position), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleSwitchTap = (value) => { setPendingToggle(value); setModalVisible(true); };

  const handleConfirm = async () => {
    setDutyLoading(true);
    const result = await changeDutytoggal(pendingToggle);
    setDutyLoading(false);
    if (result?.success) {
      setIsOnDuty(pendingToggle);
      setModalVisible(false);
      showToast.current?.(pendingToggle ? 'You are now On Duty. Orders incoming.' : 'You are now Off Duty.', pendingToggle ? 'success' : 'info');
      if (pendingToggle) setTimeout(() => fetchAll(), 500);
    } else {
      showToast.current?.(result?.error || 'Something went wrong. Try again.', 'error');
      setModalVisible(false);
    }
  };

  const handleCancel = () => { if (!dutyLoading) setModalVisible(false); };

  const handleAcceptOrder = useCallback(async (order) => {
    const result = await acceptOrder(order.Id);
    if (result.success) {
      showToast.current?.(`Order accepted for ${order.fullname || 'customer'}.`, 'success');
      setTimeout(() => switchTab(1), 600);
    } else {
      showToast.current?.(result.error || 'Could not accept order. Try again.', 'error');
    }
  }, [acceptOrder, switchTab]);

  const handleMarkDelivered = useCallback(async (order) => {
    const result = await markDelivered(order.Id);
    if (result.success) {
      showToast.current?.(`Delivered to ${order.fullname || 'customer'} successfully.`, 'success');
    } else {
      showToast.current?.(result.error || 'Could not mark as delivered. Try again.', 'error');
    }
  }, [markDelivered]);

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />;

  const renderLoader = (label) => (
    <View style={styles.loaderWrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loaderText}>{label}</Text>
    </View>
  );

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        <View style={styles.topSection}>
          <View style={styles.greetingRow}>
            <View style={{ flex: 1, marginRight: nz(12) }}>
              <Text style={styles.greetingBold} numberOfLines={1}>
                Hi, <Text style={styles.greetingLight}>{firstName}</Text>
              </Text>
              <View style={styles.dutyStatusRow}>
                <View style={[styles.dutyDot, { backgroundColor: isOnDuty ? '#4CD964' : '#FF3B30' }]} />
                <Text style={[styles.dutyStatusText, { color: isOnDuty ? colors.primary : '#E53935' }]}>
                  {isOnDuty ? 'On Duty — Receiving Orders' : 'Off Duty'}
                </Text>
                {firebaseConnected && isOnDuty && (
                  <View style={{ marginLeft: nz(8), flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: nz(6), height: nz(6), borderRadius: nz(3), backgroundColor: '#4CD964', marginRight: nz(4) }} />
                    <Text style={{ fontSize: rs(9), color: '#4CD964' }}>Live</Text>
                  </View>
                )}
              </View>
            </View>
            <DutySwitch value={isOnDuty} onValueChange={handleSwitchTap} disabled={dutyLoading} />
          </View>

          {isOnDuty && (
            <TabSwitcher
              activePage={activePage}
              onTabPress={switchTab}
              pendingCount={pendingOrders.length}
              ongoingCount={acceptedOrders.length}
            />
          )}
        </View>

        {!isOnDuty ? (
          <ScrollView
            contentContainerStyle={[styles.offDutyContainer, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
            showsVerticalScrollIndicator={false}
          >
            <OffDutyBanner />
          </ScrollView>
        ) : (
          <PagerView ref={pagerRef} style={styles.pager} initialPage={0} onPageSelected={onPageSelected} overdrag offscreenPageLimit={1}>

            {/* ── Pending Tab ── */}
            <ScrollView
              key="pending"
              contentContainerStyle={[styles.pageContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
              overScrollMode="never"
              refreshControl={refreshControl}
            >
              {pendingOrdersLoading && !refreshing && pendingOrders.length === 0
                ? renderLoader('Loading orders…')
                : pendingOrders.length === 0
                  ? (
                    // 🐼 Lottie panda for empty pending orders
                    <LottieEmptyPage
                      label="No pending orders"
                      sub="New orders will appear here instantly."
                    />
                  )
                  : pendingOrders.map(order => (
                    <OrderCard
                      key={order._id || order.Id}
                      order={order}
                      actionLabel="Accept Order"
                      actionIcon="checkmark-circle-outline"
                      actionLoading={!!acceptingOrderIds?.[order.Id]}
                      onAction={() => handleAcceptOrder(order)}
                    />
                  ))
              }
            </ScrollView>

            {/* ── Ongoing Tab ── */}
            <ScrollView
              key="ongoing"
              contentContainerStyle={[styles.pageContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
              overScrollMode="never"
              refreshControl={refreshControl}
            >
              {acceptedOrders.length > 0 && (
                <View style={styles.ongoingLabelRow}>
                  <View style={styles.ongoingDot} />
                  <Text style={styles.ongoingLabel}>Ongoing Orders</Text>
                </View>
              )}
              {acceptedOrdersLoading && !refreshing && acceptedOrders.length === 0
                ? renderLoader('Loading ongoing orders…')
                : acceptedOrders.length === 0
                  ? (
                    // 🐼 Lottie panda for empty ongoing orders
                    <LottieEmptyPage
                      label="No ongoing orders"
                      sub="Accepted orders will appear here."
                    />
                  )
                  : acceptedOrders.map(order => (
                    <OrderCard
                      key={order._id || order.Id}
                      order={order}
                      actionLabel="Mark as Delivered"
                      actionIcon="bag-check-outline"
                      actionLoading={!!deliveringOrderIds?.[order.Id]}
                      onAction={() => handleMarkDelivered(order)}
                    />
                  ))
              }
            </ScrollView>
          </PagerView>
        )}
      </SafeAreaView>

      <DutyModal visible={modalVisible} goingOnDuty={pendingToggle} onConfirm={handleConfirm} onCancel={handleCancel} isLoading={dutyLoading} />
      <Toast toastRef={showToast} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: colors.white },
  topSection: { paddingHorizontal: nz(20), paddingTop: nzVertical(14), paddingBottom: nzVertical(4), backgroundColor: colors.white },

  greetingRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: nzVertical(18) },
  greetingBold:   { fontSize: rs(isTablet ? 26 : 22), fontWeight: '700', color: colors.black, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  greetingLight:  { fontWeight: '400', color: colors.textLight },
  dutyStatusRow:  { flexDirection: 'row', alignItems: 'center', marginTop: nzVertical(4), gap: nz(5) },
  dutyDot:        { width: nz(7), height: nz(7), borderRadius: nz(3.5) },
  dutyStatusText: { fontSize: rs(11), fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },

  switchTrack: { width: nz(54), height: nz(30), borderRadius: nz(15), justifyContent: 'center' },
  switchThumb: {
    position: 'absolute', width: nz(24), height: nz(24), borderRadius: nz(12),
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },

  tabSwitcher: { flexDirection: 'row', backgroundColor: '#E3F2ED', borderRadius: nz(32), padding: nz(4), marginBottom: nzVertical(10), overflow: 'visible' },
  tabPill:     { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: nzVertical(13), borderRadius: nz(28), gap: nz(6), overflow: 'visible' },
  tabPillActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  tabPillText:       { fontSize: rs(14), fontWeight: '600', color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  tabPillTextActive: { color: colors.white },

  pager:       { flex: 1 },
  pageContent: { paddingHorizontal: nz(20), paddingTop: nzVertical(12), gap: nzVertical(14), flexGrow: 1 },

  // ── Lottie empty state ───────────────────────────────────────────────────
  lottieEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: nzVertical(40),
    paddingBottom: nzVertical(20),
  },
  lottieAnim: {
    width: nz(220),
    height: nz(220),
  },
  lottieLabel: {
    fontSize: rs(17),
    fontWeight: '700',
    color: colors.text,
    marginTop: nzVertical(8),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  lottieSub: {
    fontSize: rs(13),
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: nz(32),
    lineHeight: nzVertical(20),
    marginTop: nzVertical(6),
  },

  offDutyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: nz(32) },
  offDutyWrap:      { alignItems: 'center', gap: nzVertical(12) },
  offDutyIconWrap:  { width: nz(90), height: nz(90), borderRadius: nz(45), backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: nzVertical(4) },
  offDutyTitle:     { fontSize: rs(20), fontWeight: '700', color: colors.text, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  offDutySubtitle:  { fontSize: rs(14), color: colors.textLight, textAlign: 'center', lineHeight: nzVertical(22) },

  loaderWrap: { alignItems: 'center', paddingTop: nzVertical(60), gap: nzVertical(12) },
  loaderText: { fontSize: rs(13), color: colors.textLight },

  ongoingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: nz(8) },
  ongoingDot:      { width: nz(10), height: nz(10), borderRadius: nz(5), backgroundColor: '#F5A623' },
  ongoingLabel:    { fontSize: rs(16), fontWeight: '700', color: '#F5A623', fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },

  card: { backgroundColor: colors.white, borderRadius: nz(16), shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(16), paddingTop: nzVertical(16), paddingBottom: nzVertical(12) },
  tableChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: nz(20), paddingHorizontal: nz(14), paddingVertical: nzVertical(8), maxWidth: '62%' },
  tableChipText: { color: colors.white, fontSize: rs(13), fontWeight: '700', flexShrink: 1 },
  timeChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: nz(20), paddingHorizontal: nz(10), paddingVertical: nzVertical(6) },
  timeChipText: { fontSize: rs(12), color: colors.textLight },

  metaRow:      { flexDirection: 'row', paddingHorizontal: nz(16), paddingBottom: nzVertical(14), gap: nz(12) },
  metaBlock:    { flex: 1, minWidth: 0 },
  metaLabel:    { fontSize: rs(11), color: colors.textLighter, marginBottom: nzVertical(4) },
  metaValueRow: { flexDirection: 'row', alignItems: 'center' },
  metaValue:    { fontSize: rs(15), fontWeight: '600', color: colors.black, flexShrink: 1, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  subwayBadge:     { width: nz(26), height: nz(26), borderRadius: nz(4), backgroundColor: '#FBBC04', justifyContent: 'center', alignItems: 'center', marginRight: nz(6), flexShrink: 0 },
  subwayBadgeText: { color: '#1B5E20', fontWeight: '900', fontSize: rs(14) },

  divider:            { height: 1, backgroundColor: colors.border, marginHorizontal: nz(16), marginBottom: nzVertical(12) },
  orderDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), marginBottom: nzVertical(4) },
  orderDetailsLabel:  { fontSize: rs(12), color: colors.textLight, fontWeight: '500' },
  orderDetailsQty:    { fontSize: rs(12), color: colors.textLight, fontWeight: '500' },

  orderItemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(16), paddingVertical: nzVertical(9) },
  foodThumb:    { width: nz(44), height: nz(44), borderRadius: nz(8), backgroundColor: '#F4F4F4', justifyContent: 'center', alignItems: 'center', marginRight: nz(8) },
  vegDot:       { width: nz(14), height: nz(14), borderRadius: nz(2), borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: nz(6), flexShrink: 0 },
  vegDotInner:  { width: nz(7), height: nz(7), borderRadius: nz(3.5) },
  itemName:     { flex: 1, fontSize: rs(13), color: colors.text, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  itemQty:      { fontSize: rs(13), fontWeight: '600', color: colors.black, marginLeft: nz(6) },
  itemDivider:  { height: 1, backgroundColor: '#EFEFEF', marginHorizontal: nz(16), borderStyle: 'dashed' },

  comboBlock: { paddingLeft: nz(28), paddingBottom: nzVertical(6) },
  comboLine:  { fontSize: rs(11), color: colors.textLight, lineHeight: nzVertical(18) },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), paddingTop: nzVertical(14), paddingBottom: nzVertical(14) },
  totalLabel: { fontSize: rs(14), fontWeight: '700', color: colors.black },
  totalValue: { fontSize: rs(14), fontWeight: '700', color: colors.black },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(8),
    marginHorizontal: nz(16), marginBottom: nzVertical(16),
    borderRadius: nz(12), paddingVertical: nzVertical(15),
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.30, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  actionBtnLoading: { opacity: 0.72 },
  actionBtnText:    { color: colors.white, fontSize: rs(15), fontWeight: '700' },

  moreDetailsFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#C9E8E0', paddingVertical: nzVertical(13), gap: nz(6) },
  moreDetailsText:   { fontSize: rs(13), color: colors.text, fontWeight: '500' },
});