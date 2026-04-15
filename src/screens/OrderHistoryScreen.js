// screens/OrderHistoryScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
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

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Date helpers ─────────────────────────────────────────────────────────────
/** Format ISO date string → "28 Jul, 12:38 PM" */
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d    = new Date(iso);
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

// ─── Shimmer Hook ─────────────────────────────────────────────────────────────
function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  return opacity;
}

// ─── Skeleton Block ───────────────────────────────────────────────────────────
const SkeletonBlock = memo(({ width, height, borderRadius = nz(6), style }) => {
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#D8D8D8' },
        { opacity },
        style,
      ]}
    />
  );
});

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = memo(() => (
  <View style={styles.card}>
    {/* Header row */}
    <View style={[styles.cardHeader, { paddingBottom: nzVertical(12) }]}>
      <View style={{ flex: 1, gap: nzVertical(6) }}>
        <SkeletonBlock width="45%" height={nz(14)} />
        <SkeletonBlock width="30%" height={nz(11)} />
      </View>
      <SkeletonBlock width={nz(76)} height={nz(28)} borderRadius={nz(20)} />
    </View>

    <View style={styles.cardDivider} />

    {/* Meta row */}
    <View style={[styles.metaRow, { paddingVertical: nzVertical(14) }]}>
      <View style={{ flex: 1, gap: nzVertical(6) }}>
        <SkeletonBlock width="40%" height={nz(10)} />
        <SkeletonBlock width="70%" height={nz(14)} />
      </View>
      <View style={{ flex: 1, gap: nzVertical(6) }}>
        <SkeletonBlock width="40%" height={nz(10)} />
        <SkeletonBlock width="60%" height={nz(14)} />
      </View>
    </View>

    {/* Footer chip */}
    <View style={[styles.moreDetailsFooter, { backgroundColor: '#ECECEC' }]}>
      <SkeletonBlock width="35%" height={nz(12)} />
    </View>
  </View>
));

// ─── Skeleton List ────────────────────────────────────────────────────────────
const SkeletonList = memo(() => (
  <View style={{ gap: nzVertical(12) }}>
    {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
  </View>
));

// ─── Analytics Banner ─────────────────────────────────────────────────────────
const AnalyticsBanner = memo(({ analytics }) => {
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
});

// ─── Veg Dot ──────────────────────────────────────────────────────────────────
const VegDot = memo(({ isVeg }) => {
  const c = isVeg ? '#2ECC40' : '#FF3B30';
  return (
    <View style={[styles.vegDot, { borderColor: c }]}>
      <View style={[styles.vegDotInner, { backgroundColor: c }]} />
    </View>
  );
});

// ─── History Order Card ───────────────────────────────────────────────────────
// Using local Animated ref for expand animation instead of useState re-renders
const HistoryCard = memo(({ order }) => {
  const expandAnim  = useRef(new Animated.Value(0)).current;
  const isExpanded  = useRef(false);

  const toggleExpand = useCallback(() => {
    const next = !isExpanded.current;
    isExpanded.current = next;
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [expandAnim]);

  const chevron = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Map API fields
  const seat        = order.seatNo || order.tableNo || '—';
  const customer    = order.fullname || order.customer || 'Customer';
  const restName    = order.restaurantName || order.restaurant?.name || '—';
  const restInitial = restName.charAt(0).toUpperCase();
  const dateTime    = fmtDateTime(order.DeliveredAt || order.WaiterAcceptedAt);
  const totalAmount = order.TotalAmount != null ? `₹ ${Number(order.TotalAmount).toFixed(2)}` : '—';
  const items       = order.order || order.items || [];

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

      {/* Expanded items — maxHeight collapses to 0 so content is truly hidden */}
      <Animated.View style={{
        overflow: 'hidden',
        opacity: expandAnim,
        maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 800] }),
      }}>
        <View style={styles.expandDivider} />
        <View style={styles.orderDetailsHeader}>
          <Text style={styles.orderDetailsLabel}>Order details</Text>
          <Text style={styles.orderDetailsLabel}>Qty</Text>
        </View>

        {items.map((item, idx) => {
          const isVeg = item.veg !== undefined ? item.veg : item.foodtype === 'Veg';
          const name  = item.name || item.foodName || '';
          const qty   = item.qty || (item.quantity != null ? `×${item.quantity}` : '');
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
      </Animated.View>

      {/* Expand toggle */}
      <TouchableOpacity
        style={styles.moreDetailsFooter}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={styles.moreDetailsText}>More details</Text>
        <Animated.View style={{
          transform: [{
            rotate: chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
          }],
        }}>
          <MaterialCommunityIcons name="chevron-double-down" size={nz(18)} color={colors.text} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = memo(() => (
  <View style={styles.emptyWrap}>
    <Ionicons name="receipt-outline" size={nz(52)} color="#D0D0D0" />
    <Text style={styles.emptyText}>No completed orders</Text>
  </View>
));

// ─── Load More Footer ─────────────────────────────────────────────────────────
const LoadMoreFooter = memo(({ loading, page, totalPages, onPress }) => {
  if (page >= totalPages) return <View style={{ height: nzVertical(8) }} />;
  return (
    <TouchableOpacity
      style={styles.loadMoreBtn}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading ? (
        <SkeletonBlock width="40%" height={nz(14)} borderRadius={nz(6)} />
      ) : (
        <>
          <Ionicons name="chevron-down-circle-outline" size={nz(18)} color={colors.primary} />
          <Text style={styles.loadMoreText}>Load more</Text>
        </>
      )}
    </TouchableOpacity>
  );
});

// ─── Error Banner ─────────────────────────────────────────────────────────────
const ErrorBanner = memo(({ error, onRetry }) => {
  if (!error) return null;
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={nz(14)} color="#D32F2F" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── Static separator & key extractor ────────────────────────────────────────
const Separator = () => <View style={{ height: nzVertical(12) }} />;
const keyExtractor = (item) => item._id || item.id;

// ─── ORDER HISTORY SCREEN ─────────────────────────────────────────────────────
export default function OrderHistoryScreen() {
  const {
    completedOrders,
    completedLoading,
    completedLoadingMore,
    completedPage,
    completedTotalPages,
    analytics,
    error,
    fetchAllOrders,
    loadMoreCompleted,
  } = useOrderHistoryStore();

  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const renderCard = useCallback(({ item }) => <HistoryCard order={item} />, []);
  const handleRetry = useCallback(() => fetchAllOrders(), [fetchAllOrders]);

  const listFooter = (
    <LoadMoreFooter
      loading={completedLoadingMore}
      page={completedPage}
      totalPages={completedTotalPages}
      onPress={loadMoreCompleted}
    />
  );

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* ── Header ── */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Order History</Text>
          <AnalyticsBanner analytics={analytics} />
          <ErrorBanner error={error} onRetry={handleRetry} />
        </View>

        {/* ── Body ── */}
        <View style={styles.grayBody}>
          {completedLoading ? (
            // Skeleton shown only on first load
            <FlatList
              data={SKELETON_DATA}
              keyExtractor={i => i}
              renderItem={() => <SkeletonCard />}
              ItemSeparatorComponent={Separator}
              contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (
            <FlatList
              data={completedOrders}
              keyExtractor={keyExtractor}
              renderItem={renderCard}
              ItemSeparatorComponent={Separator}
              contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
              overScrollMode="never"
              removeClippedSubviews
              maxToRenderPerBatch={8}
              windowSize={10}
              initialNumToRender={6}
              updateCellsBatchingPeriod={50}
              ListEmptyComponent={<EmptyState />}
              ListFooterComponent={listFooter}
            />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

// Stable reference array for skeleton list — avoids re-creation on renders
const SKELETON_DATA = ['s0', 's1', 's2', 's3', 's4'];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },

  // Header
  headerSection: {
    backgroundColor: colors.white,
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(10),
    paddingBottom: nzVertical(14),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: rs(isTablet ? 22 : 18),
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
    marginBottom: nzVertical(12),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },

  // Analytics banner
  analyticsBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '0D',
    borderRadius: nz(14),
    paddingVertical: nzVertical(12),
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  analyticCard:   { flex: 1, alignItems: 'center', gap: nzVertical(3) },
  analyticValue:  { fontSize: rs(20), fontWeight: '800', color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' },
  analyticLabel:  { fontSize: rs(10), color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  analyticDivider:{ width: 1, backgroundColor: colors.primary + '30' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(6),
    marginTop: nzVertical(10),
    backgroundColor: '#FFF5F5',
    borderRadius: nz(8),
    paddingHorizontal: nz(12),
    paddingVertical: nzVertical(8),
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText:  { flex: 1, fontSize: rs(12), color: '#D32F2F' },
  retryText:  { fontSize: rs(12), color: colors.primary, fontWeight: '700' },

  // Body
  grayBody:    { flex: 1, backgroundColor: '#EBEBEB', paddingTop: nzVertical(14), paddingHorizontal: nz(14) },
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

  metaRow:      { flexDirection: 'row', paddingHorizontal: nz(16), paddingVertical: nzVertical(14), gap: nz(12) },
  metaBlock:    { flex: 1, minWidth: 0 },
  metaLabel:    { fontSize: rs(11), color: colors.textLighter, marginBottom: nzVertical(4) },
  metaValueRow: { flexDirection: 'row', alignItems: 'center' },
  metaValue:    { fontSize: rs(14), fontWeight: '600', color: colors.black, flexShrink: 1, fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' },
  restBadge:    { width: nz(24), height: nz(24), borderRadius: nz(4), backgroundColor: '#FBBC04', justifyContent: 'center', alignItems: 'center', marginRight: nz(6) },
  restBadgeText:{ color: '#1B5E20', fontWeight: '900', fontSize: rs(12) },

  expandDivider:      { height: 1, backgroundColor: colors.border, marginHorizontal: nz(16), marginBottom: nzVertical(10) },
  orderDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: nz(16), marginBottom: nzVertical(4) },
  orderDetailsLabel:  { fontSize: rs(12), color: colors.textLight, fontWeight: '600' },

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