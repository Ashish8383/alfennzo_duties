// screens/POSScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryTabs from '../components/pos/CategoryTabs';
import ComboItemsModal from '../components/pos/ComboItemsModal';
import FloatingCart from '../components/pos/FloatingCart';
import MenuItem from '../components/pos/MenuItem';
import MenuSectionHeader from '../components/pos/MenuSectionHeader';
import ProductDetailModal from '../components/pos/ProductDetailModal';
import useAuthStore from '../stores/authStore';
import useUIStore from '../stores/uiStore';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY       = colors.primary;
const PRIMARY_LIGHT = '#E8F5F2';
const TEXT_PRIMARY  = '#1A1A1A';
const TEXT_LIGHT    = '#999999';
const BORDER_COLOR  = '#F0F0F0';

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, borderRadius = nz(6), style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#E0E0E0', opacity }, style]}
    />
  );
};

const SkeletonMenuItem = () => (
  <View style={styles.skeletonItem}>
    <SkeletonBox width={nz(70)} height={nz(70)} borderRadius={nz(10)} />
    <View style={styles.skeletonItemBody}>
      <SkeletonBox width="70%" height={nzVertical(14)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(8) }} />
      <SkeletonBox width="45%" height={nzVertical(12)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(6) }} />
      <SkeletonBox width="35%" height={nzVertical(11)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(10) }} />
      <View style={styles.skeletonPriceRow}>
        <SkeletonBox width={nz(60)} height={nzVertical(16)} borderRadius={nz(4)} />
        <SkeletonBox width={nz(72)} height={nzVertical(32)} borderRadius={nz(8)} />
      </View>
    </View>
  </View>
);

const SkeletonSection = ({ itemCount = 4 }) => (
  <View style={styles.skeletonSection}>
    <View style={styles.skeletonSectionHeader}>
      <SkeletonBox width={nz(120)} height={nzVertical(18)} borderRadius={nz(4)} />
      <SkeletonBox width={nz(40)} height={nzVertical(14)} borderRadius={nz(10)} />
    </View>
    {Array.from({ length: itemCount }).map((_, index) => (
      <View key={index}>
        <SkeletonMenuItem />
        {index < itemCount - 1 && <View style={styles.skeletonDivider} />}
      </View>
    ))}
  </View>
);

const POSMenuSkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.skeletonScrollContent}>
    <View style={styles.skeletonTabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skeletonTabsScroll}>
        {[90, 70, 85, 65, 95, 75].map((width, index) => (
          <SkeletonBox key={index} width={nz(width)} height={nzVertical(36)} borderRadius={nz(20)} style={{ marginRight: nz(8) }} />
        ))}
      </ScrollView>
    </View>
    <SkeletonSection itemCount={5} />
    <View style={{ height: nzVertical(16) }} />
    <SkeletonSection itemCount={3} />
    <View style={{ height: nzVertical(16) }} />
    <SkeletonSection itemCount={4} />
  </ScrollView>
);

// ─── Animated Header Search Bar ───────────────────────────────────────────────
function HeaderSearchBar({ restaurantInfo, dutyLoading, handleToggleDuty, isOnDuty, searchQuery, setSearchQuery }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [setSearchQuery]);

  return (
    <View style={styles.header}>
      {/* Restaurant info — fully gone when search is open */}
      {!isSearchOpen && (
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {restaurantInfo?.name || 'M Cafe'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {restaurantInfo?.location || 'Point of Sale'}
          </Text>
        </View>
      )}

      {/* Search input — takes full width when open */}
      {isSearchOpen && (
        <View style={[styles.headerSearchWrap, { flex: 1 }]}>
          <Ionicons name="search-outline" size={nz(18)} color={TEXT_LIGHT} style={{ marginRight: nz(6) }} />
          <TextInput
            ref={searchInputRef}
            style={styles.headerSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search dishes, combos…"
            placeholderTextColor={TEXT_LIGHT}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={nz(16)} color={TEXT_LIGHT} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search / Close icon */}
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={isSearchOpen ? closeSearch : openSearch}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isSearchOpen ? 'close' : 'search-outline'}
          size={nz(22)}
          color={PRIMARY}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function POSScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [cart, setCart] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dutyLoading, setDutyLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const scrollViewRef = useRef();

  const { posMenu, posMenuLoading, posMenuError, fetchPOSMenu, restaurantInfo } = useUIStore();
  const { user, changeDutytoggal } = useAuthStore();

  const isOnDuty = user?.isOnDuty === true;

  useEffect(() => { loadMenu(); }, []);

  const loadMenu = async () => {
    setIsInitialLoading(true);
    await fetchPOSMenu();
    setIsInitialLoading(false);
  };

  // ── Duty toggle ───────────────────────────────────────────────────────────
  const handleToggleDuty = async () => {
    setDutyLoading(true);
    const result = await changeDutytoggal(!isOnDuty);
    setDutyLoading(false);
    if (!result.success) Alert.alert('Error', result.error || 'Failed to update duty status');
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const regularItems = useMemo(() => posMenu?.regularItems ?? [], [posMenu]);
  const comboItems   = useMemo(() => posMenu?.comboItems   ?? [], [posMenu]);

  const filteredRegularItems = useMemo(() => {
    let items = regularItems;
    if (selectedCategory !== 'all') items = items.filter(it => it.categoryId === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(it =>
        it.name?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q) ||
        it.categoryName?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [regularItems, selectedCategory, searchQuery]);

  const filteredComboItems = useMemo(() => {
    if (!searchQuery.trim()) return comboItems;
    const q = searchQuery.toLowerCase().trim();
    return comboItems.filter(it =>
      it.name?.toLowerCase().includes(q) ||
      it.description?.toLowerCase().includes(q)
    );
  }, [comboItems, searchQuery]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const getCartItem = useCallback(id => cart[id], [cart]);

  const addToCart = useCallback(item => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'You must be on duty to add items to cart'); return; }
    const id = item.id || item._id;
    setCart(prev => {
      if (prev[id]) return { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } };
      const isCombo = item.itemType === 'combo' || item.comboData || item.comboItemCount;
      const entry = {
        id,
        name: item.name || item.itemName || item.combofoodName || 'Item',
        price: item.price || item.comboprice || 0,
        image: item.image || item.categoryImage,
        isVeg: item.isVeg !== undefined ? item.isVeg : true,
        description: item.description,
        categoryName: item.categoryName,
        itemType: isCombo ? 'combo' : 'regular',
        quantity: 1,
        isDiscountedByRestraurant: item.isDiscountedByRestraurant,
        discountinPercentageByRestraurant: item.discountinPercentageByRestraurant,
      };
      if (isCombo) {
        entry.comboItemCount = item.comboItemCount || item.comboData?.ComboItems?.length || item.ComboItems?.length || 0;
        entry.comboData = item.comboData || {
          ComboItems: item.ComboItems || [],
          combofoodName: item.combofoodName || item.name,
          comboprice: item.comboprice || item.price,
          image: item.image,
          isVeg: item.isVeg,
        };
      }
      return { ...prev, [id]: entry };
    });
  }, [isOnDuty]);

  const increaseQuantity = useCallback(id => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'You must be on duty to modify cart'); return; }
    setCart(prev => prev[id] ? { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } } : prev);
  }, [isOnDuty]);

  const decreaseQuantity = useCallback(id => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'You must be on duty to modify cart'); return; }
    setCart(prev => {
      if (!prev[id]) return prev;
      const qty = prev[id].quantity - 1;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: { ...prev[id], quantity: qty } };
    });
  }, [isOnDuty]);

  // ── Cart totals ───────────────────────────────────────────────────────────
  const cartItemsCount = useMemo(
    () => Object.values(cart).reduce((s, it) => s + (it?.quantity || 0), 0),
    [cart]
  );

  const cartTotal = useMemo(() =>
    Object.values(cart).reduce((s, it) => {
      if (!it) return s;
      const p = it.isDiscountedByRestraurant && it.discountinPercentageByRestraurant > 0
        ? it.price * (1 - it.discountinPercentageByRestraurant / 100)
        : it.price;
      return s + p * (it.quantity || 0);
    }, 0),
    [cart]
  );

  // ── Navigate to CartScreen ────────────────────────────────────────────────
  const goToCart = () => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'You must be on duty to view cart'); return; }
    if (cartItemsCount === 0) return;
    navigation.navigate('Cart', { cart, onCartChange: updatedCart => setCart(updatedCart ?? {}) });
  };

  // ── Product / combo modal ─────────────────────────────────────────────────
  const handleProductPress = product => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'You must be on duty to view product details'); return; }
    if (product.itemType === 'combo') { setSelectedCombo(product); setShowComboModal(true); }
    else { setSelectedProduct(product); setShowProductModal(true); }
  };

  // ── Clear cart on off duty ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnDuty && cartItemsCount > 0) setCart({});
  }, [isOnDuty]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderRegularItems = () => (
    <FlatList
      data={filteredRegularItems}
      keyExtractor={item => (item.id || item._id).toString()}
      renderItem={({ item }) => (
        <MenuItem
          item={item}
          quantity={getCartItem(item.id)?.quantity || 0}
          onPress={() => handleProductPress(item)}
          onAdd={() => addToCart(item)}
          onIncrease={() => increaseQuantity(item.id)}
          onDecrease={() => decreaseQuantity(item.id)}
        />
      )}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );

  const renderComboItems = () => (
    <FlatList
      data={filteredComboItems}
      keyExtractor={item => (item.id || item._id).toString()}
      renderItem={({ item }) => (
        <MenuItem
          item={item}
          quantity={getCartItem(item.id)?.quantity || 0}
          onPress={() => handleProductPress(item)}
          onAdd={() => addToCart(item)}
          onIncrease={() => increaseQuantity(item.id)}
          onDecrease={() => decreaseQuantity(item.id)}
        />
      )}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );

  const showEmpty = filteredRegularItems.length === 0 && filteredComboItems.length === 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <SkeletonBox width={nz(120)} height={nzVertical(22)} borderRadius={nz(4)} />
              <SkeletonBox width={nz(80)} height={nzVertical(12)} borderRadius={nz(4)} style={{ marginTop: nzVertical(4) }} />
            </View>
            <SkeletonBox width={nz(40)} height={nz(40)} borderRadius={nz(20)} />
          </View>
          <POSMenuSkeleton />
        </SafeAreaView>
      </>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (posMenuError && !posMenu) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={nz(48)} color={colors.error} />
          <Text style={styles.errorText}>{posMenuError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadMenu}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Off Duty ──────────────────────────────────────────────────────────────
  if (!isOnDuty) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{restaurantInfo?.name || 'M Cafe'}</Text>
              <Text style={styles.headerSubtitle}>{restaurantInfo?.location || 'Point of Sale'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.dutyButton, styles.dutyButtonOff]}
              onPress={handleToggleDuty}
              disabled={dutyLoading}
              activeOpacity={0.8}
            >
              {dutyLoading
                ? <ActivityIndicator size="small" color={colors.white} />
                : <><View style={styles.dutyIndicator} /><Text style={styles.dutyButtonText}>Off Duty</Text></>}
            </TouchableOpacity>
          </View>

          <View style={styles.offDutyContainer}>
            <View style={styles.offDutyIconContainer}>
              <Ionicons name="moon-outline" size={nz(80)} color={TEXT_LIGHT} />
            </View>
            <Text style={styles.offDutyTitle}>You're Off Duty</Text>
            <Text style={styles.offDutySubtitle}>
              Turn on your duty status to start taking orders and serving customers
            </Text>
            <TouchableOpacity
              style={styles.goOnDutyButton}
              onPress={handleToggleDuty}
              disabled={dutyLoading}
              activeOpacity={0.85}
            >
              {dutyLoading
                ? <ActivityIndicator size="small" color={colors.white} />
                : <><Ionicons name="sunny-outline" size={nz(20)} color={colors.white} /><Text style={styles.goOnDutyButtonText}>Go On Duty</Text></>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // ── Main POS ──────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* Header with animated search */}
        <HeaderSearchBar
          restaurantInfo={restaurantInfo}
          dutyLoading={dutyLoading}
          handleToggleDuty={handleToggleDuty}
          isOnDuty={isOnDuty}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Category tabs — hidden while searching */}
        {!searchQuery && posMenu?.categories && (
          <CategoryTabs
            categories={posMenu.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {/* Content */}
        {showEmpty ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={nz(48)} color={TEXT_LIGHT} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + nzVertical(80) }]}
            bounces
          >
            {filteredRegularItems.length > 0 && (
              <>
                <MenuSectionHeader title="Menu Items" itemCount={filteredRegularItems.length} />
                {renderRegularItems()}
              </>
            )}
            {filteredComboItems.length > 0 && (
              <>
                {filteredRegularItems.length > 0 && <View style={styles.sectionDivider} />}
                <MenuSectionHeader title="Combos" itemCount={filteredComboItems.length} />
                {renderComboItems()}
              </>
            )}
          </ScrollView>
        )}

        <FloatingCart
          itemsCount={cartItemsCount}
          total={cartTotal}
          onPress={goToCart}
          bottomInset={10}
        />
      </SafeAreaView>

      <ProductDetailModal
        visible={showProductModal}
        product={selectedProduct}
        quantity={selectedProduct ? (getCartItem(selectedProduct.id)?.quantity || 0) : 0}
        onClose={() => setShowProductModal(false)}
        onAdd={() => selectedProduct && addToCart(selectedProduct)}
        onIncrease={() => selectedProduct && increaseQuantity(selectedProduct.id)}
        onDecrease={() => selectedProduct && decreaseQuantity(selectedProduct.id)}
      />

      <ComboItemsModal
        visible={showComboModal}
        combo={selectedCombo}
        onClose={() => setShowComboModal(false)}
        onAddToCart={combo => addToCart(combo)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  errorText:    { fontSize: rs(16), color: colors.error, textAlign: 'center', marginVertical: nzVertical(16) },
  retryBtn:     { backgroundColor: PRIMARY, paddingHorizontal: nz(24), paddingVertical: nzVertical(12), borderRadius: nz(8) },
  retryBtnText: { fontSize: rs(14), fontWeight: '600', color: colors.white },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(12),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    gap: nz(8),
  },
  headerTitle:    { fontSize: rs(22), fontWeight: '700', color: TEXT_PRIMARY },
  headerSubtitle: { fontSize: rs(12), color: TEXT_LIGHT, marginTop: nzVertical(2) },

  // Animated search row inside header
  headerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: nz(10),
    paddingHorizontal: nz(10),
    height: nzVertical(40),
    overflow: 'hidden',
  },
  headerSearchInput: {
    flex: 1,
    fontSize: rs(14),
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },

  // Search / close icon button
  headerIconBtn: {
    width: nz(40),
    height: nz(40),
    borderRadius: nz(20),
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Duty button ───────────────────────────────────────────────────────────
  dutyButton:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(12), paddingVertical: nzVertical(8), borderRadius: nz(20), gap: nz(6), borderWidth: 1.5 },
  dutyButtonOff: { backgroundColor: '#FFEBEE', borderColor: '#F44336' },
  dutyIndicator: { width: nz(8), height: nz(8), borderRadius: nz(4), backgroundColor: '#F44336' },
  dutyButtonText:{ fontSize: rs(12), fontWeight: '600' },

  // ── Off duty screen ───────────────────────────────────────────────────────
  offDutyContainer:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: nz(40) },
  offDutyIconContainer: { width: nz(140), height: nz(140), borderRadius: nz(70), backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: nzVertical(24) },
  offDutyTitle:         { fontSize: rs(24), fontWeight: '700', color: TEXT_PRIMARY, marginBottom: nzVertical(8) },
  offDutySubtitle:      { fontSize: rs(14), color: TEXT_LIGHT, textAlign: 'center', lineHeight: nzVertical(20), marginBottom: nzVertical(32) },
  goOnDutyButton:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(8), backgroundColor: PRIMARY, paddingHorizontal: nz(32), paddingVertical: nzVertical(14), borderRadius: nz(12), shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  goOnDutyButtonText:   { fontSize: rs(16), fontWeight: '700', color: colors.white },

  // ── Content ───────────────────────────────────────────────────────────────
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: nz(40) },
  emptyText:      { fontSize: rs(14), color: TEXT_LIGHT, marginTop: nzVertical(12) },
  scrollContent:  { paddingHorizontal: nz(12), paddingTop: nzVertical(8) },
  sectionDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: nzVertical(16), marginHorizontal: nz(4) },

  // ── Skeleton ──────────────────────────────────────────────────────────────
  skeletonScrollContent:  { paddingHorizontal: nz(12), paddingTop: nzVertical(8) },
  skeletonTabsContainer:  { marginBottom: nzVertical(16) },
  skeletonTabsScroll:     { paddingHorizontal: nz(4), gap: nz(8) },
  skeletonSection:        { backgroundColor: '#FFFFFF', borderRadius: nz(12), marginBottom: nzVertical(12), overflow: 'hidden' },
  skeletonSectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: nz(14), paddingVertical: nzVertical(12), borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  skeletonItem:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(14), paddingVertical: nzVertical(12), gap: nz(12) },
  skeletonItemBody:       { flex: 1 },
  skeletonPriceRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonDivider:        { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: nz(14) },
});