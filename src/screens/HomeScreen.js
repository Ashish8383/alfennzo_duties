import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { off, onChildAdded, onValue, ref } from 'firebase/database';
import LottieView from 'lottie-react-native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';
import useAuthStore from '../stores/authStore';
import useUIStore from '../stores/uiStore';
import colors from '../utils/colors';
import { database } from '../utils/firebase';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';
import { playClickSound, startOrderSound, stopOrderSound } from '../utils/soundManager';

const ROUTES = [
  { key: 'pending', title: 'Pending' },
  { key: 'ongoing', title: 'Ongoing' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function isOrderGoneError(errorMsg = '', statusCode) {
  if (statusCode === 409 || statusCode === 404 || statusCode === 410) return true;
  const lower = (errorMsg || '').toLowerCase();
  return (
    lower.includes('already accepted') ||
    lower.includes('already taken') ||
    lower.includes('order not found') ||
    lower.includes('not available') ||
    lower.includes('already been accepted') ||
    lower.includes('taken by another') ||
    lower.includes('no longer available')
  );
}

const SkeletonBox = memo(({ width, height, borderRadius = nz(8), style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#D1D5DB', opacity }, style]}
    />
  );
});
SkeletonBox.displayName = 'SkeletonBox';

const SkeletonCard = memo(() => (
  <View style={skSt.card}>
    <View style={skSt.headerRow}>
      <SkeletonBox width={nz(120)} height={nzVertical(32)} borderRadius={nz(20)} />
      <SkeletonBox width={nz(70)} height={nzVertical(28)} borderRadius={nz(20)} />
    </View>
    <View style={skSt.metaRow}>
      <View style={skSt.metaBlock}>
        <SkeletonBox width={nz(60)} height={nzVertical(10)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(6) }} />
        <SkeletonBox width={nz(110)} height={nzVertical(16)} borderRadius={nz(4)} />
      </View>
      <View style={skSt.metaBlock}>
        <SkeletonBox width={nz(60)} height={nzVertical(10)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(6) }} />
        <SkeletonBox width={nz(90)} height={nzVertical(16)} borderRadius={nz(4)} />
      </View>
    </View>
    <View style={skSt.divider} />
    {[0, 1, 2].map(i => (
      <View key={i} style={skSt.itemRow}>
        <SkeletonBox width={nz(44)} height={nz(44)} borderRadius={nz(8)} />
        <View style={{ flex: 1, marginLeft: nz(10), gap: nzVertical(6) }}>
          <SkeletonBox width="70%" height={nzVertical(13)} borderRadius={nz(4)} />
          <SkeletonBox width="40%" height={nzVertical(11)} borderRadius={nz(4)} />
        </View>
        <SkeletonBox width={nz(28)} height={nzVertical(14)} borderRadius={nz(4)} />
      </View>
    ))}
    <View style={skSt.totalRow}>
      <SkeletonBox width={nz(40)} height={nzVertical(14)} borderRadius={nz(4)} />
      <SkeletonBox width={nz(60)} height={nzVertical(14)} borderRadius={nz(4)} />
    </View>
    <SkeletonBox
      width="100%"
      height={nzVertical(52)}
      borderRadius={nz(12)}
      style={{ marginTop: nzVertical(4), marginBottom: nzVertical(16) }}
    />
    <View style={skSt.footer}>
      <SkeletonBox width={nz(80)} height={nzVertical(13)} borderRadius={nz(4)} />
    </View>
  </View>
));
SkeletonCard.displayName = 'SkeletonCard';

const skSt = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: nz(16), overflow: 'hidden', marginBottom: nzVertical(14), shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(16), paddingTop: nzVertical(16), paddingBottom: nzVertical(12) },
  metaRow: { flexDirection: 'row', paddingHorizontal: nz(16), paddingBottom: nzVertical(14), gap: nz(12) },
  metaBlock: { flex: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: nz(16), marginBottom: nzVertical(12) },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(16), paddingVertical: nzVertical(9) },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), paddingVertical: nzVertical(14) },
  footer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', paddingVertical: nzVertical(12) },
});

const SkeletonList = memo(() => (
  <View style={{ paddingHorizontal: nz(20), paddingTop: nzVertical(12) }}>
    <SkeletonCard /><SkeletonCard />
  </View>
));
SkeletonList.displayName = 'SkeletonList';

const HomeScreenSkeleton = memo(() => (
  <View style={{ flex: 1, backgroundColor: colors.white }}>
    <View style={homeSk.header}>
      <View style={{ gap: nzVertical(8) }}>
        <SkeletonBox width={nz(160)} height={nzVertical(22)} borderRadius={nz(6)} />
        <SkeletonBox width={nz(120)} height={nzVertical(13)} borderRadius={nz(6)} />
      </View>
      <SkeletonBox width={nz(54)} height={nzVertical(30)} borderRadius={nz(15)} />
    </View>
    <View style={homeSk.tabWrap}>
      <SkeletonBox width="100%" height={nzVertical(54)} borderRadius={nz(32)} />
    </View>
    <View style={{ paddingHorizontal: nz(20), paddingTop: nzVertical(12) }}>
      <SkeletonCard /><SkeletonCard />
    </View>
  </View>
));
HomeScreenSkeleton.displayName = 'HomeScreenSkeleton';

const homeSk = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(20), paddingTop: nzVertical(14), paddingBottom: nzVertical(12), backgroundColor: colors.white },
  tabWrap: { paddingHorizontal: nz(20), paddingVertical: nzVertical(10), backgroundColor: colors.white },
});

const Toast = ({ toastRef }) => {
  const translateY = useRef(new Animated.Value(-nzVertical(80))).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('success');
  const timerRef = useRef(null);

  toastRef.current = useCallback((message, kind = 'success') => {
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
  }, [translateY, opacity]);

  const bg = type === 'success' ? colors.primary : type === 'error' ? '#D32F2F' : '#37474F';
  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'close-circle' : 'information-circle';

  return (
    <Animated.View
      pointerEvents="none"
      style={[toastSt.wrap, { backgroundColor: bg, opacity, transform: [{ translateY }] }]}
    >
      <Ionicons name={iconName} size={nz(18)} color="#fff" />
      <Text style={toastSt.txt} numberOfLines={2}>{msg}</Text>
    </Animated.View>
  );
};

const toastSt = StyleSheet.create({
  wrap: { position: 'absolute', top: nzVertical(54), left: nz(16), right: nz(16), flexDirection: 'row', alignItems: 'center', gap: nz(10), paddingHorizontal: nz(16), paddingVertical: nzVertical(13), borderRadius: nz(14), shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 9999 },
  txt: { flex: 1, fontSize: rs(13), fontWeight: '600', color: '#fff', lineHeight: nzVertical(19) },
});

// ─── Duty Switch ──────────────────────────────────────────────────────────────
const DutySwitch = memo(({ value, onValueChange, disabled, large }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 10, speed: 14 }).start();
  }, [value, anim]);

  const trackW = large ? nz(80) : nz(54);
  const trackH = large ? nz(44) : nz(30);
  const trackR = large ? nz(22) : nz(15);
  const thumbSz = large ? nz(36) : nz(24);
  const thumbR = large ? nz(18) : nz(12);
  const thumbL0 = large ? nz(4) : nz(3);
  const thumbL1 = large ? nz(40) : nz(27);

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['#FFCDD2', '#4CD964'] });
  const thumbLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [thumbL0, thumbL1] });

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => !disabled && onValueChange(!value)} disabled={disabled}>
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackColor, width: trackW, height: trackH, borderRadius: trackR }]}>
        <Animated.View style={[styles.switchThumb, { left: thumbLeft, width: thumbSz, height: thumbSz, borderRadius: thumbR }]}>
          {disabled
            ? <ActivityIndicator size={large ? nz(14) : nz(10)} color={value ? '#4CD964' : '#FF3B30'} />
            : <Ionicons name={value ? 'checkmark' : 'close'} size={large ? nz(16) : nz(11)} color={value ? '#4CD964' : '#FF3B30'} />}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});
DutySwitch.displayName = 'DutySwitch';

// ─── Duty Modal ───────────────────────────────────────────────────────────────
const DutyModal = memo(({ visible, goingOnDuty, onConfirm, onCancel, isLoading }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, mdSt.overlay, { opacity: anim }]}>
      <Animated.View style={[mdSt.box, { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
        <View style={[mdSt.iconWrap, { backgroundColor: goingOnDuty ? '#E8F5F0' : '#FFF3F3' }]}>
          <Ionicons
            name={goingOnDuty ? 'checkmark-circle-outline' : 'pause-circle-outline'}
            size={nz(40)}
            color={goingOnDuty ? colors.primary : '#E53935'}
          />
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
            onPress={onConfirm}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={mdSt.confirmText}>{goingOnDuty ? 'Go On Duty' : 'Go Off Duty'}</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
});
DutyModal.displayName = 'DutyModal';

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

const AlreadyAcceptedModal = memo(({ visible, orderInfo, onClose }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, alertMdSt.overlay, { opacity: anim }]}>
      <Animated.View style={[alertMdSt.box, { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
        <View style={alertMdSt.iconWrap}>
          <Ionicons name="information-circle-outline" size={nz(48)} color="#F5A623" />
        </View>
        <Text style={alertMdSt.title}>Order Already Accepted!</Text>
        <Text style={alertMdSt.subMessage}>The order has been removed from your list.</Text>
        <TouchableOpacity style={alertMdSt.okButton} onPress={onClose} activeOpacity={0.8}>
          <Text style={alertMdSt.okButtonText}>OK, Got it</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});
AlreadyAcceptedModal.displayName = 'AlreadyAcceptedModal';

const alertMdSt = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: nz(32), zIndex: 100 },
  box: { backgroundColor: colors.white, borderRadius: nz(20), padding: nz(24), alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  iconWrap: { width: nz(80), height: nz(80), borderRadius: nz(40), backgroundColor: '#FFF8E7', justifyContent: 'center', alignItems: 'center', marginBottom: nzVertical(16) },
  title: { fontSize: rs(18), fontWeight: '700', color: colors.black, marginBottom: nzVertical(8), textAlign: 'center' },
  subMessage: { fontSize: rs(12), color: colors.textLight, textAlign: 'center', marginBottom: nzVertical(20) },
  okButton: { backgroundColor: colors.primary, borderRadius: nz(12), paddingVertical: nzVertical(14), paddingHorizontal: nz(40), width: '100%', alignItems: 'center' },
  okButtonText: { fontSize: rs(15), fontWeight: '700', color: colors.white },
});
const VegDot = memo(({ isVeg }) => {
  const c = isVeg ? '#2ECC40' : '#FF3B30';
  return (
    <View style={[styles.vegDot, { borderColor: c }]}>
      <View style={[styles.vegDotInner, { backgroundColor: c }]} />
    </View>
  );
});
VegDot.displayName = 'VegDot';

const OrderItem = memo(({ item }) => {
  const isVeg = item.veg !== undefined ? item.veg : item.foodtype === 'Veg';
  const name = item.name || item.foodName || '';
  const qty = item.qty || (item.quantity != null ? `×${item.quantity}` : '');
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
});
OrderItem.displayName = 'OrderItem';

// ─── Order Card ───────────────────────────────────────────────────────────────
// Custom memo comparison: skip onAction/label/icon — they are stable from parent.
// Only re-render when order reference, loading state, disabled, or keepSlidOut changes.
const OrderCardInner = ({
  order,
  actionLabel,
  actionIcon,
  actionLoading,
  onAction,
  disabled = false,
  keepSlidOut = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const chevronAnim = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(null);
  const { width: screenWidth } = useWindowDimensions();
  const [isSlidOut, setIsSlidOut] = useState(false);

  const toggleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(chevronAnim, { toValue: next ? 1 : 0, useNativeDriver: true, bounciness: 4, speed: 18 }).start();
  }, [expanded, chevronAnim]);

  const handleActionPress = useCallback(() => {
    if (actionLoading || disabled || isSlidOut) return;
    playClickSound().catch(() => { });

    if (slideAnim.current) { slideAnim.current.stop(); slideAnim.current = null; }

    slideAnim.current = Animated.timing(slideX, {
      toValue: -screenWidth - nz(50),
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    slideAnim.current.start(() => { slideAnim.current = null; setIsSlidOut(true); });
    onAction(order);
  }, [actionLoading, disabled, isSlidOut, onAction, order, slideX, screenWidth]);

  // Restore card on error (keepSlidOut = false after ghost clears)
  useEffect(() => {
    if (!actionLoading && isSlidOut && !keepSlidOut) {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start(() => setIsSlidOut(false));
    }
  }, [actionLoading, isSlidOut, keepSlidOut, slideX]);

  const chevronRotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const tableLabel = order.seatNo || (order.tableNo != null ? `Table No. ${order.tableNo}` : '—');
  const customerName = order.customer || order.fullname || 'Customer';
  const restName = order.restaurant?.name || order.restaurantName || '—';
  const ago = order.timeAgo || timeAgo(order.createdAt || order.WaiterAcceptedAt);
  const totalLabel = order.TotalAmount != null ? `₹${order.TotalAmount}` : `${(order.items || order.order || []).length} items`;
  const rawItems = order.items || order.order || [];

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ translateX: slideX }] }, isSlidOut && { opacity: 0.7 }]}>
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
              style={[styles.actionBtn, actionLoading && styles.actionBtnLoading, disabled && styles.actionBtnDisabled]}
              onPress={handleActionPress}
              disabled={actionLoading || disabled || isSlidOut}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <><ActivityIndicator color={colors.white} size="small" /><Text style={styles.actionBtnText}>Please wait…</Text></>
                : <>
                  <Ionicons name={actionIcon} size={nz(19)} color={colors.white} />
                  <Text style={styles.actionBtnText}>{disabled ? 'Waiting for Handover' : actionLabel}</Text>
                </>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.moreDetailsFooter} onPress={toggleExpand} activeOpacity={0.7}>
          <Text style={styles.moreDetailsText}>{expanded ? 'Hide details' : 'View details'}</Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={nz(16)} color={colors.text} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Custom comparison: only re-render when data meaningful to this card changes
const OrderCard = memo(OrderCardInner, (prev, next) =>
  prev.order === next.order &&
  prev.actionLoading === next.actionLoading &&
  prev.disabled === next.disabled &&
  prev.keepSlidOut === next.keepSlidOut
  // onAction, actionLabel, actionIcon intentionally omitted — parent keeps them stable
);
OrderCard.displayName = 'OrderCard';

// ─── Off-Duty Banner ──────────────────────────────────────────────────────────
const OffDutyBanner = memo(({ onGoOnDuty, dutyLoading }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.offDutyWrap}>
      <LottieView source={require('../assets/images/panda.json')} autoPlay loop style={styles.pandaAnim} />
      <Text style={styles.offDutyTitle}>You are Off Duty</Text>
      <Animated.View style={[styles.offDutySwitchWrap, { transform: [{ scale: pulseAnim }] }]}>
        <DutySwitch value={false} onValueChange={onGoOnDuty} disabled={dutyLoading} large />
      </Animated.View>
    </View>
  );
});
OffDutyBanner.displayName = 'OffDutyBanner';

const LottieEmptyPage = memo(({ label, sub }) => (
  <View style={styles.lottieEmptyWrap}>
    <LottieView source={require('../assets/images/Order_Received.json')} autoPlay loop style={styles.lottieAnim} />
    <Text style={styles.lottieLabel}>{label}</Text>
    {sub ? <Text style={styles.lottieSub}>{sub}</Text> : null}
  </View>
));
LottieEmptyPage.displayName = 'LottieEmptyPage';
const BADGE_SIZE = nz(20);

const RippleBadge = memo(({ count, position, tabIndex }) => {
  const rings = useRef([
    { scale: new Animated.Value(1), opacity: new Animated.Value(0), delay: 0 },
    { scale: new Animated.Value(1), opacity: new Animated.Value(0), delay: 550 },
  ]).current;
  const loopsRef = useRef([]);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current === count) return;
    prevCountRef.current = count;
    loopsRef.current.forEach(l => l.stop());
    loopsRef.current = [];
    if (count > 0) {
      rings.forEach(({ scale, opacity, delay }) => {
        scale.setValue(1); opacity.setValue(0.75);
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, { toValue: 2.8, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
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
  }, [count, rings]);

  const activeOp = useMemo(() => position.interpolate({
    inputRange: [tabIndex - 1, tabIndex, tabIndex + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  }), [position, tabIndex]);

  const inactOp = useMemo(() => activeOp.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), [activeOp]);

  return (
    <View style={rbSt.outer}>
      {rings.map(({ scale, opacity }, i) => (
        <Animated.View key={i} pointerEvents="none"
          style={[rbSt.ring, { backgroundColor: `${colors.primary}60`, opacity: Animated.multiply(opacity, inactOp), transform: [{ scale }] }]}
        />
      ))}
      <Animated.View style={[rbSt.badge, { backgroundColor: colors.primary, opacity: inactOp, position: 'absolute' }]}>
        <Text style={rbSt.badgeText}>{count}</Text>
      </Animated.View>
      <Animated.View style={[rbSt.badge, { backgroundColor: 'rgba(255,255,255,0.30)', opacity: activeOp, position: 'absolute' }]}>
        <Text style={rbSt.badgeText}>{count}</Text>
      </Animated.View>
    </View>
  );
});
RippleBadge.displayName = 'RippleBadge';

const rbSt = StyleSheet.create({
  outer: { width: nz(28), height: nz(28), justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2 },
  badge: { minWidth: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2, justifyContent: 'center', alignItems: 'center', paddingHorizontal: nz(5) },
  badgeText: { fontSize: rs(10), fontWeight: '700', color: colors.white },
});

// ─── Tab Item ─────────────────────────────────────────────────────────────────
const TabItem = memo(({ route, index, position, count, jumpTo, tabWidth }) => {
  const activeOp = useMemo(() => position.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  }), [position, index]);

  const inactOp = useMemo(
    () => activeOp.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    [activeOp]
  );

  const sweepX = useRef(new Animated.Value(0)).current;
  const sweepLoop = useRef(null);
  const prevCount = useRef(count);

  useEffect(() => {
    const countChanged = prevCount.current !== count;
    prevCount.current = count;

    if (count > 0) {
      if (countChanged || !sweepLoop.current) {
        sweepLoop.current?.stop();
        const startX = -(tabWidth + nz(50));
        sweepX.setValue(startX);
        sweepLoop.current = Animated.loop(
          Animated.sequence([
            Animated.delay(index * 300),
            Animated.timing(sweepX, { toValue: tabWidth + nz(50), duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.delay(1400),
            Animated.timing(sweepX, { toValue: startX, duration: 0, useNativeDriver: true }),
          ])
        );
        sweepLoop.current.start();
      }
    } else {
      sweepLoop.current?.stop();
      sweepLoop.current = null;
      sweepX.setValue(-(tabWidth + nz(50)));
    }

    return () => { sweepLoop.current?.stop(); sweepLoop.current = null; };
  }, [count, tabWidth, index, sweepX]);

  const handlePress = useCallback(() => jumpTo(route.key), [jumpTo, route.key]);

  return (
    <TouchableOpacity
      style={tabSt.tab}
      onPress={handlePress}
      activeOpacity={0.8}
      hitSlop={{ top: nz(6), bottom: nz(6), left: nz(4), right: nz(4) }}
    >
      {count > 0 && (
        <>
          <Animated.View pointerEvents="none"
            style={[tabSt.waveSweep, tabSt.waveSweepInactive, { opacity: inactOp, transform: [{ translateX: sweepX }, { skewX: '-18deg' }] }]}
          />
          <Animated.View pointerEvents="none"
            style={[tabSt.waveSweep, tabSt.waveSweepActive, { opacity: activeOp, transform: [{ translateX: sweepX }, { skewX: '-18deg' }] }]}
          />
        </>
      )}
      <Animated.View style={[tabSt.labelWrap, { opacity: inactOp }]}>
        <Text style={[tabSt.label, { color: colors.primary }]}>{route.title}</Text>
        {count > 0 && <RippleBadge count={count} position={position} tabIndex={index} />}
      </Animated.View>
      <Animated.View style={[tabSt.labelWrap, StyleSheet.absoluteFill, tabSt.labelOverlay, { opacity: activeOp }]}>
        <Text style={[tabSt.label, { color: colors.white }]}>{route.title}</Text>
        {count > 0 && <RippleBadge count={count} position={position} tabIndex={index} />}
      </Animated.View>
    </TouchableOpacity>
  );
});
TabItem.displayName = 'TabItem';

const CustomTabBar = memo(({ position, jumpTo, pendingCount, ongoingCount, SW }) => {
  const TAB_BAR_W = SW - nz(40);
  const TAB_W = TAB_BAR_W / ROUTES.length;

  const pillX = useMemo(() => position.interpolate({
    inputRange: ROUTES.map((_, i) => i),
    outputRange: ROUTES.map((_, i) => i * TAB_W),
    extrapolate: 'clamp',
  }), [position, TAB_W]);

  const counts = [pendingCount, ongoingCount];

  return (
    <View style={tabSt.wrapper}>
      <Animated.View pointerEvents="none" style={[tabSt.pill, { width: TAB_W, transform: [{ translateX: pillX }] }]} />
      {ROUTES.map((route, index) => (
        <TabItem
          key={route.key}
          route={route}
          index={index}
          position={position}
          count={counts[index]}
          jumpTo={jumpTo}
          tabWidth={TAB_W}
        />
      ))}
    </View>
  );
});
CustomTabBar.displayName = 'CustomTabBar';

const TAB_PADDING = nz(4);
const TAB_H = nzVertical(50);

const tabSt = StyleSheet.create({
  wrapper: { flexDirection: 'row', backgroundColor: '#E3F2ED', borderRadius: nz(32), padding: TAB_PADDING, marginHorizontal: nz(20), marginBottom: nzVertical(10), position: 'relative', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: nz(6), shadowOffset: { width: 0, height: nzVertical(2) }, elevation: 2 },
  pill: { position: 'absolute', top: TAB_PADDING, bottom: TAB_PADDING, left: TAB_PADDING, borderRadius: nz(28), backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.30, shadowRadius: nz(8), shadowOffset: { width: 0, height: nzVertical(3) }, elevation: 4 },
  tab: { flex: 1, height: TAB_H, justifyContent: 'center', alignItems: 'center', zIndex: 1, minHeight: nzVertical(44), overflow: 'hidden', borderRadius: nz(28) },
  waveSweep: { position: 'absolute', top: 0, bottom: 0, width: nz(40) },
  waveSweepInactive: { backgroundColor: `${colors.primary}30` },
  waveSweepActive: { backgroundColor: 'rgba(255,255,255,0.20)' },
  labelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(6) },
  labelOverlay: { justifyContent: 'center' },
  label: { fontSize: rs(isTablet ? 15 : 14), fontWeight: '700', letterSpacing: 0.2, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
});

const PendingScene = memo(({
  pendingOrders, pendingOrdersLoading, refreshing,
  onRefresh, acceptingOrderIds, onAction,
  TAB_BAR_HEIGHT, ghostPendingIds,
}) => {
  if (pendingOrdersLoading && !refreshing && pendingOrders.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }} showsVerticalScrollIndicator={false}>
        <SkeletonList />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.pageContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS === 'ios'}
      overScrollMode="never"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      {pendingOrders.length === 0
        ? <LottieEmptyPage label="No pending orders" sub="New orders will appear here instantly." />
        : pendingOrders.map(order => (
          <OrderCard
            key={order._id || order.Id}
            order={order}
            actionLabel="Accept Order"
            actionIcon="checkmark-circle-outline"
            actionLoading={!!acceptingOrderIds?.[order.Id]}
            onAction={onAction}
            keepSlidOut={!!ghostPendingIds?.[order.Id]}
          />
        ))}
    </ScrollView>
  );
});
PendingScene.displayName = 'PendingScene';

const OngoingScene = memo(({
  acceptedOrders, acceptedOrdersLoading, refreshing,
  onRefresh, deliveringOrderIds, onAction, TAB_BAR_HEIGHT,
}) => {
  if (acceptedOrdersLoading && !refreshing && acceptedOrders.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }} showsVerticalScrollIndicator={false}>
        <SkeletonList />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.pageContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS === 'ios'}
      overScrollMode="never"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      {acceptedOrders.length === 0
        ? <LottieEmptyPage label="No ongoing orders" sub="Accepted orders will appear here." />
        : acceptedOrders.map(order => {
          const isReady = order.waiterStatus === 'HANDED_TO_WAITER';
          return (
            <OrderCard
              key={order._id || order.Id}
              order={order}
              actionLabel={isReady ? 'Mark as Delivered' : 'Waiting for Handover'}
              actionIcon="bag-check-outline"
              actionLoading={!!deliveringOrderIds?.[order.Id]}
              onAction={onAction}
              disabled={!isReady}
            />
          );
        })}
    </ScrollView>
  );
});
OngoingScene.displayName = 'OngoingScene';

export default function HomeScreen({ navigation, route }) {
  const { user, changeDutytoggal } = useAuthStore();
  const {
    pendingOrders, pendingOrdersLoading,
    acceptedOrders, acceptedOrdersLoading,
    acceptingOrderIds, deliveringOrderIds,
    fetchPendingOrders, fetchAcceptedOrders,
    acceptOrder, markDelivered, clearOrderLists,
  } = useUIStore();

  const { width: SW } = useWindowDimensions();

  const displayName = user?.fullName || user?.name || 'Waiter';
  const firstName = displayName.split(' ')[0];
  const restaurantId = user?.restaurantId || user?.restaurant?._id || null;
  const waiterId = user?._profile?.Id || null;
  const userLoaded = user != null;
  const isOnDuty = userLoaded ? (user.isOnDuty ?? null) : null;

  const [tabIndex, setTabIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const [inflightAccepted, setInflightAccepted] = useState({});
  const [restoredAccepted, setRestoredAccepted] = useState({});
  const [inflightPending, setInflightPending] = useState({});
  const [restoredPending, setRestoredPending] = useState({});
  const [ghostPendingIds, setGhostPendingIds] = useState({});
  const [alreadyAcceptedModal, setAlreadyAcceptedModal] = useState({ visible: false, orderInfo: null });

  const showToast = useRef(null);
  const insets = useSafeAreaInsets();
  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;

  const actionsRef = useRef({});
  actionsRef.current = { fetchPendingOrders, fetchAcceptedOrders, clearOrderLists };

  const displayedPendingRef = useRef([]);
  const displayedAcceptedRef = useRef([]);

  const soundActiveRef = useRef(false);

  const debounceTimerRef = useRef(null);

  const mergeAtOriginalPositions = useCallback((storeOrders, inflightMap, restoredMap) => {
    const inflightIds = new Set(Object.keys(inflightMap));
    const idsToStrip = new Set();
    const extras = [];
    for (const { order, index } of Object.values(inflightMap)) {
      idsToStrip.add(order.Id); extras.push({ order, index });
    }
    for (const { order, index } of Object.values(restoredMap)) {
      if (!inflightIds.has(String(order.Id))) { idsToStrip.add(order.Id); extras.push({ order, index }); }
    }
    if (extras.length === 0) return storeOrders;
    const base = storeOrders.filter(o => !idsToStrip.has(o.Id));
    extras.sort((a, b) => a.index - b.index);
    for (const { order, index } of extras) base.splice(Math.min(index, base.length), 0, order);
    return base;
  }, []);

  const displayedPendingOrders = useMemo(
    () => mergeAtOriginalPositions(pendingOrders, inflightPending, restoredPending),
    [pendingOrders, inflightPending, restoredPending, mergeAtOriginalPositions]
  );
  const displayedAcceptedOrders = useMemo(
    () => mergeAtOriginalPositions(acceptedOrders, inflightAccepted, restoredAccepted),
    [acceptedOrders, inflightAccepted, restoredAccepted, mergeAtOriginalPositions]
  );

  displayedPendingRef.current = displayedPendingOrders;
  displayedAcceptedRef.current = displayedAcceptedOrders;

  const TAB_BAR_HEIGHT = useMemo(
    () => nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12)),
    [insets.bottom]
  );

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      actionsRef.current.fetchPendingOrders();
      actionsRef.current.fetchAcceptedOrders();
    }, 250);
  }, []);

  const prevCountsRef = useRef({ pending: 0, ongoing: 0 });
  const seenDataRef = useRef(false);

  useEffect(() => {
    const p = displayedPendingOrders.length;
    const o = displayedAcceptedOrders.length;
    if (!seenDataRef.current) {
      if (p > 0 || o > 0) { seenDataRef.current = true; prevCountsRef.current = { pending: p, ongoing: o }; }
      return;
    }
    const prev = prevCountsRef.current;
    const tab = tabIndexRef.current;
    if (tab === 1 && o === 0 && p > 0 && prev.ongoing > 0) setTabIndex(0);
    else if (tab === 0 && p === 0 && o > 0 && prev.pending > 0) setTabIndex(1);
    prevCountsRef.current = { pending: p, ongoing: o };
  }, [displayedPendingOrders.length, displayedAcceptedOrders.length]);

  useEffect(() => {
    if (!isOnDuty) {
      if (soundActiveRef.current) { stopOrderSound(); soundActiveRef.current = false; }
      return;
    }
    if (displayedPendingOrders.length > 0 && !soundActiveRef.current) {
      startOrderSound(); soundActiveRef.current = true;
    } else if (displayedPendingOrders.length === 0 && soundActiveRef.current) {
      stopOrderSound(); soundActiveRef.current = false;
    }
  }, [displayedPendingOrders.length, isOnDuty]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && isOnDuty) {
        actionsRef.current.fetchPendingOrders();
        actionsRef.current.fetchAcceptedOrders();
      }
    });
    return () => sub.remove();
  }, [isOnDuty]);

  useEffect(() => {
    const tab = route?.params?.initialTab;
    if (tab != null) { setTabIndex(tab); navigation?.setParams?.({ initialTab: undefined }); }
  }, [route?.params?.initialTab, navigation]); 

  useEffect(() => {
    if (isOnDuty == null) return;

    if (!isOnDuty) {
      actionsRef.current.clearOrderLists?.();
      stopOrderSound();
      soundActiveRef.current = false;
      return;
    }

    if (!restaurantId) return;

    actionsRef.current.fetchPendingOrders();
    actionsRef.current.fetchAcceptedOrders();

    const listeners = [];

    const connRef = ref(database, '.info/connected');
    const connCb = snap => setFirebaseConnected(snap.val() === true);
    onValue(connRef, connCb);
    listeners.push({ r: connRef, cb: connCb, type: 'value' });

    // Restaurant events
    const eventsRef = ref(database, `${restaurantId}/events`);
    const skipInitial = { current: true };
    const skipTimer = setTimeout(() => { skipInitial.current = false; }, 2000);

    const eventCb = snapshot => {
      const d = snapshot.val();
      let eventType, eventData;
      if (typeof d?.data === 'string') { eventType = d.data; eventData = d; }
      else if (d?.data?.type) { eventType = d.data.type; eventData = d.data; }
      else if (d?.type) { eventType = d.type; eventData = d; }
      if (skipInitial.current || !eventType) return;

      switch (eventType) {
        case 'ORDERPLACED':
          debouncedFetch();
          showToast.current?.('New order received!', 'info');
          break;
        case 'WAITER_ACCEPTED': {
          debouncedFetch();
          const acceptedWId = eventData?.waiterId;
          if (acceptedWId && waiterId && acceptedWId !== waiterId)
            showToast.current?.('Another waiter accepted an order', 'info');
          break;
        }
        case 'ORDER_HANDED_TO_WAITER': {
          const orderId = eventData?.orderId || d?.data?.orderId || '';
          const eventWaiterId = eventData?.waiterId || d?.data?.waiterId || '';
          if (eventWaiterId && eventWaiterId === waiterId) {
            debouncedFetch();
            showToast.current?.(`Order${orderId ? ' #' + orderId : ''} is ready for delivery!`, 'success');
          }
          break;
        }
        case 'ORDER_DELIVERED_CONFIRMED':
          actionsRef.current.fetchAcceptedOrders();
          showToast.current?.('Order delivered!', 'success');
          break;
        default: break;
      }
    };

    onChildAdded(eventsRef, eventCb);
    listeners.push({ r: eventsRef, cb: eventCb, type: 'child_added' });

    if (waiterId) {
      const waiterEvRef = ref(database, waiterId);
      let isInitial = true;
      const waiterCb = snapshot => {
        const d = snapshot.val();
        if (isInitial) { isInitial = false; return; }
        if (d?.data?.type === 'ORDER_HANDED_TO_WAITER') {
          const orderId = d.orderId || d.data?.orderId || '';
          const wId = d.waiterId || d.data?.waiterId || '';
          if (wId && wId === waiterId) {
            actionsRef.current.fetchAcceptedOrders();
            showToast.current?.(`Order${orderId ? ' #' + orderId : ''} is ready for delivery!`, 'success');
          }
        }
      };
      onChildAdded(waiterEvRef, waiterCb);
      listeners.push({ r: waiterEvRef, cb: waiterCb, type: 'child_added' });
    }

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(debounceTimerRef.current);
      listeners.forEach(({ r, cb, type }) => off(r, type, cb));
    };
  }, [isOnDuty, restaurantId, waiterId, debouncedFetch]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRestoredAccepted({});
    setRestoredPending({});
    setGhostPendingIds({});
    await Promise.all([
      actionsRef.current.fetchPendingOrders(),
      actionsRef.current.fetchAcceptedOrders(),
    ]);
    setRefreshing(false);
  }, []);

  const handleSwitchTap = useCallback((value) => {
    setPendingToggle(value);
    setModalVisible(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    setDutyLoading(true);
    const result = await changeDutytoggal(pendingToggle);
    setDutyLoading(false);
    if (result?.success) {
      setModalVisible(false);
      showToast.current?.(
        pendingToggle ? 'You are now On Duty. Orders incoming.' : 'You are now Off Duty.',
        pendingToggle ? 'success' : 'info'
      );
      if (pendingToggle) setTimeout(() => { actionsRef.current.fetchPendingOrders(); actionsRef.current.fetchAcceptedOrders(); }, 500);
    } else {
      showToast.current?.(result?.error || 'Something went wrong. Try again.', 'error');
      setModalVisible(false);
    }
  }, [changeDutytoggal, pendingToggle]);

  const handleCancel = useCallback(() => { if (!dutyLoading) setModalVisible(false); }, [dutyLoading]);
  const handleAcceptOrder = useCallback(async (order) => {
    const originalIndex = displayedPendingRef.current.findIndex(o => o.Id === order.Id);
    setInflightPending(prev => ({ ...prev, [order.Id]: { order, index: originalIndex } }));

    const result = await acceptOrder(order.Id);

    if (result.success) {
      setInflightPending(prev => { const n = { ...prev }; delete n[order.Id]; return n; });
      showToast.current?.(`Order accepted for ${order.fullname || 'customer'}.`, 'success');

    } else if (isOrderGoneError(result.error, result.statusCode)) {
      setGhostPendingIds(prev => ({ ...prev, [order.Id]: true }));
      setInflightPending(prev => { const n = { ...prev }; delete n[order.Id]; return n; });
      setAlreadyAcceptedModal({ visible: true, orderInfo: { orderId: order.Id, customerName: order.fullname || order.customer || 'customer' } });
      actionsRef.current.fetchPendingOrders().then(() => {
        setGhostPendingIds(prev => { const n = { ...prev }; delete n[order.Id]; return n; });
      });

    } else {
      setRestoredPending(prev => ({ ...prev, [order.Id]: { order, index: originalIndex } }));
      setInflightPending(prev => { const n = { ...prev }; delete n[order.Id]; return n; });
      showToast.current?.(result.error || 'Could not accept order. Try again.', 'error');
    }
  }, [acceptOrder]); // ← only 1 dep

  const handleMarkDelivered = useCallback(async (order) => {
    const originalIndex = displayedAcceptedRef.current.findIndex(o => o.Id === order.Id);
    setInflightAccepted(prev => ({ ...prev, [order.Id]: { order, index: originalIndex } }));

    const result = await markDelivered(order.Id);

    if (result.success) {
      setInflightAccepted(prev => { const n = { ...prev }; delete n[order.Id]; return n; });
      showToast.current?.(`Delivered to ${order.fullname || 'customer'} successfully.`, 'success');
    } else {
      setRestoredAccepted(prev => ({ ...prev, [order.Id]: { order, index: originalIndex } }));
      setInflightAccepted(prev => { const n = { ...prev }; delete n[order.Id]; return n; });
      showToast.current?.(result.error || 'Could not mark as delivered. Try again.', 'error');
    }
  }, [markDelivered]);

  const acceptHandlerRef = useRef(handleAcceptOrder);
  acceptHandlerRef.current = handleAcceptOrder;
  const stableAccept = useRef((order) => acceptHandlerRef.current(order)).current;

  const deliverHandlerRef = useRef(handleMarkDelivered);
  deliverHandlerRef.current = handleMarkDelivered;
  const stableDeliver = useRef((order) => deliverHandlerRef.current(order)).current;

  const handleCloseAlreadyAcceptedModal = useCallback(
    () => setAlreadyAcceptedModal({ visible: false, orderInfo: null }),
    []
  );

  const renderScene = useCallback(({ route: r }) => {
    if (r.key === 'pending') {
      return (
        <PendingScene
          pendingOrders={displayedPendingOrders}
          pendingOrdersLoading={pendingOrdersLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          acceptingOrderIds={acceptingOrderIds}
          onAction={stableAccept}
          TAB_BAR_HEIGHT={TAB_BAR_HEIGHT}
          ghostPendingIds={ghostPendingIds}
        />
      );
    }
    return (
      <OngoingScene
        acceptedOrders={displayedAcceptedOrders}
        acceptedOrdersLoading={acceptedOrdersLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        deliveringOrderIds={deliveringOrderIds}
        onAction={stableDeliver}
        TAB_BAR_HEIGHT={TAB_BAR_HEIGHT}
      />
    );
  }, [
    displayedPendingOrders, pendingOrdersLoading,
    displayedAcceptedOrders, acceptedOrdersLoading,
    refreshing, onRefresh, acceptingOrderIds, deliveringOrderIds,
    stableAccept, stableDeliver, TAB_BAR_HEIGHT, ghostPendingIds,
  ]);

  const renderTabBar = useCallback((props) => (
    <View style={{ backgroundColor: colors.white, paddingTop: nzVertical(2), paddingBottom: nzVertical(4) }}>
      <CustomTabBar
        {...props}
        pendingCount={displayedPendingOrders.length}
        ongoingCount={displayedAcceptedOrders.length}
        SW={SW}
      />
    </View>
  ), [displayedPendingOrders.length, displayedAcceptedOrders.length, SW]);

  const renderLazyPlaceholder = useCallback(() => (
    <View style={{ flex: 1 }}><SkeletonList /></View>
  ), []);
  if (isOnDuty == null) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.white }}>
        <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <HomeScreenSkeleton />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* Header */}
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
            {isOnDuty && (
              <DutySwitch value={isOnDuty} onValueChange={handleSwitchTap} disabled={dutyLoading} />
            )}
          </View>
        </View>

        {!isOnDuty ? (
          <ScrollView
            contentContainerStyle={[styles.offDutyContainer, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
            showsVerticalScrollIndicator={false}
          >
            <OffDutyBanner onGoOnDuty={handleSwitchTap} dutyLoading={dutyLoading} />
          </ScrollView>
        ) : (
          <TabView
            navigationState={{ index: tabIndex, routes: ROUTES }}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={setTabIndex}
            initialLayout={{ width: SW }}
            swipeEnabled
            lazy                                   // ← only mount active scene
            renderLazyPlaceholder={renderLazyPlaceholder}
            style={{ flex: 1 }}
            swipeVelocityImpact={0.15}
          />
        )}
      </SafeAreaView>

      <DutyModal
        visible={modalVisible}
        goingOnDuty={pendingToggle}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={dutyLoading}
      />
      <Toast toastRef={showToast} />
      <AlreadyAcceptedModal
        visible={alreadyAcceptedModal.visible}
        orderInfo={alreadyAcceptedModal.orderInfo}
        onClose={handleCloseAlreadyAcceptedModal}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  topSection: { paddingHorizontal: nz(20), paddingTop: nzVertical(14), paddingBottom: nzVertical(14), backgroundColor: colors.white },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingBold: { fontSize: rs(isTablet ? 26 : 22), fontWeight: '700', color: colors.black, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  greetingLight: { fontWeight: '400', color: colors.textLight },
  dutyStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: nzVertical(4), gap: nz(5) },
  dutyDot: { width: nz(7), height: nz(7), borderRadius: nz(3.5) },
  dutyStatusText: { fontSize: rs(11), fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },

  switchTrack: { justifyContent: 'center' },
  switchThumb: { position: 'absolute', backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },

  pageContent: { paddingHorizontal: nz(16), paddingTop: nzVertical(14), gap: nzVertical(12), flexGrow: 1 },

  lottieEmptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: nzVertical(40) },
  lottieAnim: { width: nz(200), height: nz(200) },
  lottieLabel: { fontSize: rs(17), fontWeight: '700', color: colors.text, marginTop: nzVertical(8), fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  lottieSub: { fontSize: rs(13), color: colors.textLight, textAlign: 'center', paddingHorizontal: nz(32), lineHeight: nzVertical(20), marginTop: nzVertical(6) },

  offDutyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: nz(32) },
  offDutyWrap: { alignItems: 'center', gap: nzVertical(10) },
  pandaAnim: { width: nz(240), height: nz(240) },
  offDutyTitle: { fontSize: rs(20), fontWeight: '700', color: colors.text },
  offDutySwitchWrap: { alignItems: 'center', gap: nzVertical(10), marginTop: nzVertical(4) },

  cardWrapper: { marginBottom: nzVertical(14), borderRadius: nz(16) },
  card: { backgroundColor: colors.white, borderRadius: nz(16), shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: nz(14), shadowOffset: { width: 0, height: nzVertical(4) }, elevation: 5, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(16), paddingTop: nzVertical(16), paddingBottom: nzVertical(12), gap: nz(8) },
  tableChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: nz(20), paddingHorizontal: nz(12), paddingVertical: nzVertical(7), maxWidth: '60%', gap: nz(3) },
  tableChipText: { color: colors.white, fontSize: rs(12), fontWeight: '700', flexShrink: 1, letterSpacing: 0.1 },
  timeChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: nz(20), paddingHorizontal: nz(10), paddingVertical: nzVertical(6), gap: nz(3) },
  timeChipText: { fontSize: rs(11), color: colors.textLight, letterSpacing: 0.1 },

  metaRow: { flexDirection: 'row', paddingHorizontal: nz(16), paddingBottom: nzVertical(14), gap: nz(16) },
  metaBlock: { flex: 1, minWidth: 0 },
  metaLabel: { fontSize: rs(10), color: colors.textLighter, marginBottom: nzVertical(5), letterSpacing: 0.4, textTransform: 'uppercase' },
  metaValueRow: { flexDirection: 'row', alignItems: 'center' },
  metaValue: { fontSize: rs(14), fontWeight: '600', color: colors.black, flexShrink: 1, lineHeight: nzVertical(20) },
  subwayBadge: { width: nz(24), height: nz(24), borderRadius: nz(5), backgroundColor: '#FBBC04', justifyContent: 'center', alignItems: 'center', marginRight: nz(6), flexShrink: 0 },
  subwayBadgeText: { color: '#1B5E20', fontWeight: '900', fontSize: rs(13) },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: nz(16), marginBottom: nzVertical(10) },
  orderDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), paddingBottom: nzVertical(6), paddingTop: nzVertical(2) },
  orderDetailsLabel: { fontSize: rs(11), color: colors.textLight, fontWeight: '600', letterSpacing: 0.3 },
  orderDetailsQty: { fontSize: rs(11), color: colors.textLight, fontWeight: '600', letterSpacing: 0.3 },

  orderItemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(16), paddingVertical: nzVertical(8), minHeight: nzVertical(44) },
  foodThumb: { width: nz(40), height: nz(40), borderRadius: nz(8), backgroundColor: '#F4F4F4', justifyContent: 'center', alignItems: 'center', marginRight: nz(8) },
  vegDot: { width: nz(13), height: nz(13), borderRadius: nz(2), borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: nz(6), flexShrink: 0 },
  vegDotInner: { width: nz(6), height: nz(6), borderRadius: nz(3) },
  itemName: { flex: 1, fontSize: rs(13), color: colors.text, lineHeight: nzVertical(18) },
  itemQty: { fontSize: rs(13), fontWeight: '700', color: colors.black, marginLeft: nz(6), minWidth: nz(28), textAlign: 'right' },
  itemDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#EFEFEF', marginHorizontal: nz(16) },

  comboBlock: { paddingLeft: nz(28), paddingBottom: nzVertical(6) },
  comboLine: { fontSize: rs(11), color: colors.textLight, lineHeight: nzVertical(18) },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(16), paddingTop: nzVertical(12), paddingBottom: nzVertical(12), backgroundColor: '#FAFAFA', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  totalLabel: { fontSize: rs(13), fontWeight: '700', color: colors.text, letterSpacing: 0.1 },
  totalValue: { fontSize: rs(15), fontWeight: '800', color: colors.black, letterSpacing: 0.1 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(8), marginHorizontal: nz(16), marginBottom: nzVertical(16), borderRadius: nz(12), paddingVertical: nzVertical(Math.max(14, (44 - rs(15) * 1.3) / 2)), minHeight: nzVertical(52), backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: nz(10), shadowOffset: { width: 0, height: nzVertical(4) }, elevation: 5 },
  actionBtnLoading: { opacity: 0.7 },
  actionBtnText: { color: colors.white, fontSize: rs(15), fontWeight: '700', letterSpacing: 0.2 },
  actionBtnDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0.10, shadowColor: '#000' },
  moreDetailsFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF7F4', paddingVertical: nzVertical(13), minHeight: nzVertical(44), gap: nz(6) },
  moreDetailsText: { fontSize: rs(12), color: colors.text, fontWeight: '500', letterSpacing: 0.1 },
});