// screens/HomeScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const PENDING_ORDERS = [
  {
    id: 'p1', tableNo: 21, timeAgo: '5 min ago',
    restaurant: { name: 'Subway' }, customer: 'Amrit Randhawa',
    items: [
      { id: '1', name: 'Chiken Fried Rice (Boneless)', qty: 'Half', veg: false },
      { id: '2', name: 'Burger (Double Patty)',        qty: '×2',   veg: true  },
      { id: '3', name: 'Ice Cream (Chocolate)',        qty: '×1',   veg: true  },
    ],
  },
  {
    id: 'p2', tableNo: 8, timeAgo: '2 min ago',
    restaurant: { name: 'Subway' }, customer: 'Priya Sharma',
    items: [
      { id: '4', name: 'Paneer Wrap',  qty: '×1', veg: true  },
      { id: '5', name: 'Cold Coffee',  qty: '×2', veg: true  },
    ],
  },
];

const ONGOING_ORDERS = [
  {
    id: 'o1', tableNo: 14, timeAgo: '8 min ago',
    restaurant: { name: 'Subway' }, customer: 'Rohan Verma',
    items: [
      { id: '6', name: 'Veg Sub 6"',  qty: '×1', veg: true  },
      { id: '7', name: 'Cookies',      qty: '×3', veg: true  },
    ],
  },
];

const TABS = [
  { key: 'pending', label: 'Pending order' },
  { key: 'ongoing', label: 'Ongoing Order' },
];

// ─── Duty Toggle Confirm Modal ────────────────────────────────────────────────
function DutyModal({ visible, goingOnDuty, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={modal.overlay}>
        <View style={modal.box}>
          {/* Icon */}
          <View style={[modal.iconWrap, { backgroundColor: goingOnDuty ? '#E8F5F0' : '#FFF3F3' }]}>
            <Ionicons
              name={goingOnDuty ? 'checkmark-circle-outline' : 'pause-circle-outline'}
              size={nz(40)}
              color={goingOnDuty ? colors.primary : '#E53935'}
            />
          </View>

          <Text style={modal.title}>
            {goingOnDuty ? 'Go On Duty?' : 'Go Off Duty?'}
          </Text>
          <Text style={modal.subtitle}>
            {goingOnDuty
              ? 'You will start receiving new orders and appear available to customers.'
              : 'You will stop receiving new orders. Finish your current orders before going off duty.'}
          </Text>

          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={modal.cancelText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.confirmBtn, { backgroundColor: goingOnDuty ? colors.primary : '#E53935' }]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={modal.confirmText}>
                {goingOnDuty ? 'Go On Duty' : 'Go Off Duty'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Veg Dot ─────────────────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  const c = isVeg ? '#2ECC40' : '#FF3B30';
  return (
    <View style={[styles.vegDot, { borderColor: c }]}>
      <View style={[styles.vegDotInner, { backgroundColor: c }]} />
    </View>
  );
}

// ─── Order Item Row ───────────────────────────────────────────────────────────
function OrderItem({ item }) {
  return (
    <View style={styles.orderItemRow}>
      <View style={styles.foodThumb}>
        <Ionicons name="fast-food-outline" size={20} color={colors.textLight} />
      </View>
      <VegDot isVeg={item.veg} />
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.itemQty}>{item.qty}</Text>
    </View>
  );
}

// ─── Order Card (collapsed by default) ───────────────────────────────────────
function OrderCard({ order, actionLabel, onAction }) {
  // ✅ Default collapsed — user taps "More details" to expand
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.tableChip}>
          <Text style={styles.tableChipText}>Table No. {order.tableNo}</Text>
        </View>
        <View style={styles.timeChip}>
          <Ionicons name="time-outline" size={13} color={colors.textLight} />
          <Text style={styles.timeChipText}> {order.timeAgo}</Text>
        </View>
      </View>

      {/* Meta */}
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
            <Ionicons name="person" size={18} color={colors.black} style={{ marginRight: nz(5) }} />
            <Text style={styles.metaValue}>{order.customer}</Text>
          </View>
        </View>
      </View>

      {/* Expanded body */}
      {expanded && (
        <>
          <View style={styles.divider} />
          <View style={styles.orderDetailsHeader}>
            <Text style={styles.orderDetailsLabel}>Order details</Text>
            <Text style={styles.orderDetailsQty}>Qty</Text>
          </View>
          {order.items.map((item, idx) => (
            <View key={item.id}>
              <OrderItem item={item} />
              {idx < order.items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.items.length} Items</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onAction}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        </>
      )}

      {/* More / Hide details footer */}
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
          size={18}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Off-Duty Empty State ─────────────────────────────────────────────────────
function OffDutyBanner() {
  return (
    <View style={styles.offDutyWrap}>
      <View style={styles.offDutyIconWrap}>
        <MaterialCommunityIcons name="sleep" size={nz(44)} color={colors.textLighter} />
      </View>
      <Text style={styles.offDutyTitle}>You are Off Duty</Text>
      <Text style={styles.offDutySubtitle}>
        Toggle the switch above to go on duty and start receiving orders.
      </Text>
    </View>
  );
}

// ─── Empty Page State ─────────────────────────────────────────────────────────
function EmptyPage({ label }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="receipt-outline" size={nz(50)} color={colors.border} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
function TabSwitcher({ activePage, onTabPress, pendingCount, ongoingCount }) {
  return (
    <View style={styles.tabSwitcher}>
      {TABS.map((tab, index) => {
        const isFocused = activePage === index;
        const count = index === 0 ? pendingCount : ongoingCount;
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
            {count > 0 && (
              <View style={[styles.badge, isFocused && styles.badgeActive]}>
                <Text style={[styles.badgeText, isFocused && styles.badgeTextActive]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [activePage,    setActivePage]    = useState(0);
  const [isOnDuty,      setIsOnDuty]      = useState(false); // Off by default
  const [modalVisible,  setModalVisible]  = useState(false);
  const [pendingToggle, setPendingToggle] = useState(false); // what they're trying to switch TO
  const pagerRef = useRef(null);

  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  const switchTab = useCallback((index) => {
    setActivePage(index);
    pagerRef.current?.setPage(index);
  }, []);

  const onPageSelected = useCallback((e) => {
    setActivePage(e.nativeEvent.position);
  }, []);

  // When user taps the switch — show confirm modal first
  const handleSwitchTap = (value) => {
    setPendingToggle(value);
    setModalVisible(true);
  };

  const handleConfirm = () => {
    setIsOnDuty(pendingToggle);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* ── Fixed header ── */}
        <View style={styles.topSection}>

          {/* Greeting + Duty toggle */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingBold}>
                Hi, <Text style={styles.greetingLight}>Worker Name</Text>
              </Text>
              {/* Duty status label under name */}
              <View style={styles.dutyStatusRow}>
                <View style={[
                  styles.dutyDot,
                  { backgroundColor: isOnDuty ? '#4CD964' : '#FF3B30' },
                ]} />
                <Text style={[
                  styles.dutyStatusText,
                  { color: isOnDuty ? colors.primary : '#E53935' },
                ]}>
                  {isOnDuty ? 'On Duty — Receiving Orders' : 'Off Duty'}
                </Text>
              </View>
            </View>

            <Switch
              value={isOnDuty}
              onValueChange={handleSwitchTap}
              trackColor={{ false: '#FFCDD2', true: '#4CD964' }}
              thumbColor={colors.white}
              ios_backgroundColor="#FFCDD2"
            />
          </View>

          {/* Tab switcher — only show when on duty */}
          {isOnDuty && (
            <TabSwitcher
              activePage={activePage}
              onTabPress={switchTab}
              pendingCount={PENDING_ORDERS.length}
              ongoingCount={ONGOING_ORDERS.length}
            />
          )}
        </View>

        {/* ── Body ── */}
        {!isOnDuty ? (
          /* Off duty full-screen message */
          <ScrollView
            contentContainerStyle={[
              styles.offDutyContainer,
              { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <OffDutyBanner />
          </ScrollView>
        ) : (
          /* On duty — pager with order cards */
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={onPageSelected}
            overdrag
            offscreenPageLimit={1}
          >
            {/* Page 0 — Pending orders */}
            <ScrollView
              key="pending"
              contentContainerStyle={[
                styles.pageContent,
                { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
              overScrollMode="never"
            >
              {PENDING_ORDERS.length === 0 ? (
                <EmptyPage label="No pending orders" />
              ) : (
                PENDING_ORDERS.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actionLabel="Start Delivery"
                    onAction={() => {}}
                  />
                ))
              )}
            </ScrollView>

            {/* Page 1 — Ongoing orders */}
            <ScrollView
              key="ongoing"
              contentContainerStyle={[
                styles.pageContent,
                { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
              overScrollMode="never"
            >
              {/* Ongoing label */}
              {ONGOING_ORDERS.length > 0 && (
                <View style={styles.ongoingLabelRow}>
                  <View style={styles.ongoingDot} />
                  <Text style={styles.ongoingLabel}>Ongoing Orders</Text>
                </View>
              )}

              {ONGOING_ORDERS.length === 0 ? (
                <EmptyPage label="No ongoing orders" />
              ) : (
                ONGOING_ORDERS.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actionLabel="Mark as Delivered"
                    onAction={() => {}}
                  />
                ))
              )}
            </ScrollView>
          </PagerView>
        )}
      </SafeAreaView>

      {/* ── Duty confirm modal ── */}
      <DutyModal
        visible={modalVisible}
        goingOnDuty={pendingToggle}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(28),
  },
  box: {
    backgroundColor: colors.white,
    borderRadius: nz(20),
    padding: nz(24),
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: nz(72),
    height: nz(72),
    borderRadius: nz(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(16),
  },
  title: {
    fontSize: rs(18),
    fontWeight: '700',
    color: colors.black,
    marginBottom: nzVertical(8),
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  subtitle: {
    fontSize: rs(13),
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: nzVertical(20),
    marginBottom: nzVertical(22),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  btnRow: {
    flexDirection: 'row',
    gap: nz(12),
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(12),
    paddingVertical: nzVertical(13),
    alignItems: 'center',
  },
  cancelText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.textLight,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: nz(12),
    paddingVertical: nzVertical(13),
    alignItems: 'center',
  },
  confirmText: {
    fontSize: rs(14),
    fontWeight: '700',
    color: colors.white,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // Top section
  topSection: {
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(14),
    paddingBottom: nzVertical(4),
    backgroundColor: colors.white,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nzVertical(18),
  },
  greetingBold: {
    fontSize: rs(isTablet ? 26 : 22),
    fontWeight: '700',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  greetingLight: {
    fontWeight: '400',
    color: colors.textLight,
  },

  // Duty status
  dutyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nzVertical(4),
    gap: nz(5),
  },
  dutyDot: {
    width: nz(7),
    height: nz(7),
    borderRadius: nz(3.5),
  },
  dutyStatusText: {
    fontSize: rs(11),
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E3F2ED',
    borderRadius: nz(32),
    padding: nz(4),
    marginBottom: nzVertical(10),
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: nzVertical(13),
    borderRadius: nz(28),
    gap: nz(6),
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tabPillText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  tabPillTextActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: nz(10),
    minWidth: nz(18),
    height: nz(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(4),
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    fontSize: rs(10),
    fontWeight: '700',
    color: colors.white,
  },
  badgeTextActive: {
    color: colors.white,
  },

  // Pager
  pager: { flex: 1 },
  pageContent: {
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(12),
    gap: nzVertical(14),
  },

  // Off duty
  offDutyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: nz(32),
  },
  offDutyWrap: {
    alignItems: 'center',
    gap: nzVertical(12),
  },
  offDutyIconWrap: {
    width: nz(90),
    height: nz(90),
    borderRadius: nz(45),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(4),
  },
  offDutyTitle: {
    fontSize: rs(20),
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  offDutySubtitle: {
    fontSize: rs(14),
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: nzVertical(22),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Empty page
  emptyWrap: {
    alignItems: 'center',
    paddingTop: nzVertical(60),
    gap: nzVertical(12),
  },
  emptyText: {
    fontSize: rs(15),
    color: colors.textLight,
  },

  // Ongoing label
  ongoingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(8),
  },
  ongoingDot: {
    width: nz(10),
    height: nz(10),
    borderRadius: nz(5),
    backgroundColor: '#F5A623',
  },
  ongoingLabel: {
    fontSize: rs(16),
    fontWeight: '700',
    color: '#F5A623',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nz(16),
    paddingTop: nzVertical(16),
    paddingBottom: nzVertical(12),
  },
  tableChip: {
    backgroundColor: colors.primary,
    borderRadius: nz(20),
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
  },
  tableChipText: {
    color: colors.white,
    fontSize: rs(14),
    fontWeight: '700',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: nz(20),
    paddingHorizontal: nz(10),
    paddingVertical: nzVertical(6),
  },
  timeChipText: {
    fontSize: rs(12),
    color: colors.textLight,
  },
  metaRow: {
    flexDirection: 'row',
    paddingHorizontal: nz(16),
    paddingBottom: nzVertical(14),
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
    fontSize: rs(15),
    fontWeight: '600',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  subwayBadge: {
    width: nz(26),
    height: nz(26),
    borderRadius: nz(4),
    backgroundColor: '#FBBC04',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(6),
  },
  subwayBadgeText: {
    color: '#1B5E20',
    fontWeight: '900',
    fontSize: rs(14),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: nz(16),
    marginBottom: nzVertical(12),
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
    fontWeight: '500',
  },
  orderDetailsQty: {
    fontSize: rs(12),
    color: colors.textLight,
    fontWeight: '500',
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(9),
  },
  foodThumb: {
    width: nz(44),
    height: nz(44),
    borderRadius: nz(8),
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(8),
  },
  vegDot: {
    width: nz(14),
    height: nz(14),
    borderRadius: nz(2),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(6),
  },
  vegDotInner: {
    width: nz(7),
    height: nz(7),
    borderRadius: nz(3.5),
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
    backgroundColor: '#EFEFEF',
    marginHorizontal: nz(16),
    borderStyle: 'dashed',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingTop: nzVertical(14),
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
    color: colors.black,
  },
  actionBtn: {
    marginHorizontal: nz(16),
    marginBottom: nzVertical(16),
    backgroundColor: colors.primary,
    borderRadius: nz(12),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: rs(16),
    fontWeight: '700',
  },
  moreDetailsFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C9E8E0',
    paddingVertical: nzVertical(13),
    gap: nz(6),
  },
  moreDetailsText: {
    fontSize: rs(13),
    color: colors.text,
    fontWeight: '500',
  },
});