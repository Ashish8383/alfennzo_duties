// screens/POSScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryTabs from '../components/pos/CategoryTabs';
import ComboItemsModal from '../components/pos/ComboItemsModal';
import ComboSection from '../components/pos/ComboSection';
import FloatingCart from '../components/pos/FloatingCart';
import MenuItem from '../components/pos/MenuItem';
import MenuSectionHeader from '../components/pos/MenuSectionHeader';
import ProductDetailModal from '../components/pos/ProductDetailModal';
import SearchBar from '../components/pos/SearchBar';
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

export default function POSScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [cart,             setCart]             = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct,  setSelectedProduct]  = useState(null);
  const [selectedCombo,    setSelectedCombo]    = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showComboModal,   setShowComboModal]   = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [dutyLoading,      setDutyLoading]      = useState(false);

  const scrollViewRef = useRef();

  const {
    posMenu,
    posMenuLoading,
    posMenuError,
    fetchPOSMenu,
    restaurantInfo,
  } = useUIStore();

  const { user, changeDutytoggal } = useAuthStore();

  // Check if waiter is on duty
  const isOnDuty = user?.isOnDuty === true;

  useEffect(() => { 
    fetchPOSMenu(); 
  }, []);

  // ── Handle duty toggle ─────────────────────────────────────────────────────
  const handleToggleDuty = async () => {
    setDutyLoading(true);
    const newDutyStatus = !isOnDuty;
    const result = await changeDutytoggal(newDutyStatus);
    setDutyLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to update duty status');
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const regularItems = useMemo(() => posMenu?.regularItems ?? [], [posMenu]);
  const comboItems   = useMemo(() => posMenu?.comboItems   ?? [], [posMenu]);

  const filteredRegularItems = useMemo(() => {
    let items = regularItems;
    if (selectedCategory !== 'all') {
      items = items.filter(it => it.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(it =>
        it.name?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q) ||
        it.categoryName?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [regularItems, selectedCategory, searchQuery]);

  // Combos are shown in a separate section — only filter by search, not by category
  const filteredComboItems = useMemo(() => {
    if (!searchQuery.trim()) return comboItems;
    const q = searchQuery.toLowerCase().trim();
    return comboItems.filter(it =>
      it.name?.toLowerCase().includes(q) ||
      it.description?.toLowerCase().includes(q),
    );
  }, [comboItems, searchQuery]);

  // ── Cart helpers ────────────────────────────────────────────────────────────
  const getCartItem = useCallback(id => cart[id], [cart]);

  const addToCart = useCallback(item => {
    if (!isOnDuty) {
      Alert.alert('Off Duty', 'You must be on duty to add items to cart');
      return;
    }
    
    const id = item.id || item._id;
    setCart(prev => {
      if (prev[id]) {
        return { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } };
      }
      const isCombo = item.itemType === 'combo' || item.comboData || item.comboItemCount;
      const entry = {
        id,
        name:         item.name || item.itemName || item.combofoodName || 'Item',
        price:        item.price || item.comboprice || 0,
        image:        item.image || item.categoryImage,
        isVeg:        item.isVeg !== undefined ? item.isVeg : true,
        description:  item.description,
        categoryName: item.categoryName,
        itemType:     isCombo ? 'combo' : 'regular',
        quantity:     1,
        isDiscountedByRestraurant:         item.isDiscountedByRestraurant,
        discountinPercentageByRestraurant: item.discountinPercentageByRestraurant,
      };
      if (isCombo) {
        entry.comboItemCount = item.comboItemCount || item.comboData?.ComboItems?.length || item.ComboItems?.length || 0;
        entry.comboData = item.comboData || {
          ComboItems:    item.ComboItems || [],
          combofoodName: item.combofoodName || item.name,
          comboprice:    item.comboprice    || item.price,
          image:         item.image,
          isVeg:         item.isVeg,
        };
      }
      return { ...prev, [id]: entry };
    });
  }, [isOnDuty]);

  const increaseQuantity = useCallback(id => {
    if (!isOnDuty) {
      Alert.alert('Off Duty', 'You must be on duty to modify cart');
      return;
    }
    
    setCart(prev => prev[id]
      ? { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } }
      : prev);
  }, [isOnDuty]);

  const decreaseQuantity = useCallback(id => {
    if (!isOnDuty) {
      Alert.alert('Off Duty', 'You must be on duty to modify cart');
      return;
    }
    
    setCart(prev => {
      if (!prev[id]) return prev;
      const qty = prev[id].quantity - 1;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: { ...prev[id], quantity: qty } };
    });
  }, [isOnDuty]);

  // ── Cart totals ─────────────────────────────────────────────────────────────
  const cartItemsCount = useMemo(
    () => Object.values(cart).reduce((s, it) => s + (it?.quantity || 0), 0),
    [cart],
  );

  const cartTotal = useMemo(() =>
    Object.values(cart).reduce((s, it) => {
      if (!it) return s;
      const p = it.isDiscountedByRestraurant && it.discountinPercentageByRestraurant > 0
        ? it.price * (1 - it.discountinPercentageByRestraurant / 100)
        : it.price;
      return s + p * (it.quantity || 0);
    }, 0),
    [cart],
  );

  // ── Navigate to CartScreen ──────────────────────────────────────────────────
  const goToCart = () => {
    if (!isOnDuty) {
      Alert.alert('Off Duty', 'You must be on duty to view cart');
      return;
    }
    if (cartItemsCount === 0) return;
    navigation.navigate('Cart', {
      cart,
      onCartChange: updatedCart => setCart(updatedCart ?? {}),
    });
  };

  // ── Product / combo modal ───────────────────────────────────────────────────
  const handleProductPress = product => {
    if (!isOnDuty) {
      Alert.alert('Off Duty', 'You must be on duty to view product details');
      return;
    }
    
    if (product.itemType === 'combo') {
      setSelectedCombo(product);
      setShowComboModal(true);
    } else {
      setSelectedProduct(product);
      setShowProductModal(true);
    }
  };

  // ── Clear cart when going off duty ─────────────────────────────────────────
  useEffect(() => {
    if (!isOnDuty && cartItemsCount > 0) {
      // Clear cart when going off duty
      setCart({});
    }
  }, [isOnDuty]);

  // ── Render regular items grid (2 columns) ───────────────────────────────────
  const renderRegularItems = () => {
    const rows = [];
    for (let i = 0; i < filteredRegularItems.length; i += 2) {
      rows.push(filteredRegularItems.slice(i, i + 2));
    }
    return rows.map((row, rowIdx) => (
      <View key={rowIdx} style={styles.menuRow}>
        {row.map(item => {
          const qty = getCartItem(item.id)?.quantity || 0;
          return (
            <View key={item.id} style={styles.menuItemWrapper}>
              <MenuItem
                item={item}
                quantity={qty}
                onAdd={() => addToCart(item)}
                onIncrease={() => increaseQuantity(item.id)}
                onDecrease={() => decreaseQuantity(item.id)}
                onPress={handleProductPress}
                disabled={!isOnDuty}
              />
            </View>
          );
        })}
        {row.length === 1 && <View style={styles.menuItemPlaceholder} />}
      </View>
    ));
  };

  // Both sections empty → show empty state
  const showEmpty = filteredRegularItems.length === 0 && filteredComboItems.length === 0;

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (posMenuLoading && !posMenu) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading Menu…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (posMenuError && !posMenu) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={nz(48)} color={colors.error} />
          <Text style={styles.errorText}>{posMenuError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPOSMenu}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Off Duty Screen ─────────────────────────────────────────────────────────
  if (!isOnDuty) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{restaurantInfo?.name || 'M Cafe'}</Text>
              <Text style={styles.headerSubtitle}>{restaurantInfo?.location || 'Point of Sale'}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.dutyButton, styles.dutyButtonOff]} 
              onPress={handleToggleDuty}
              disabled={dutyLoading}
              activeOpacity={0.8}
            >
              {dutyLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <View style={styles.dutyIndicator} />
                  <Text style={styles.dutyButtonText}>Off Duty</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Off Duty Content */}
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
              {dutyLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="sunny-outline" size={nz(20)} color={colors.white} />
                  <Text style={styles.goOnDutyButtonText}>Go On Duty</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{restaurantInfo?.name || 'M Cafe'}</Text>
            <Text style={styles.headerSubtitle}>{restaurantInfo?.location || 'Point of Sale'}</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Duty Status Indicator */}
            <TouchableOpacity 
              style={[styles.dutyButton, styles.dutyButtonOn]} 
              onPress={handleToggleDuty}
              disabled={dutyLoading}
              activeOpacity={0.8}
            >
              {dutyLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <View style={[styles.dutyIndicator, styles.dutyIndicatorOn]} />
                  <Text style={styles.dutyButtonText}>On Duty</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Cart Button */}
            <TouchableOpacity style={styles.cartButton} onPress={goToCart} activeOpacity={0.8}>
              <View style={styles.cartIconContainer}>
                <Ionicons name="cart-outline" size={nz(22)} color={PRIMARY} />
                {cartItemsCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
                  </View>
                )}
              </View>
              {cartItemsCount > 0 && (
                <Text style={styles.cartTotal}>₹{Math.round(cartTotal)}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search dishes, combos…"
        />

        {/* ── Category tabs (hidden during search) ── */}
        {!searchQuery && posMenu?.categories && (
          <CategoryTabs
            categories={posMenu.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {/* ── Content ── */}
        {showEmpty ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={nz(48)} color={TEXT_LIGHT} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + nzVertical(88) },
            ]}
            bounces
          >

            {/* ── 1. Regular menu items ── */}
            {filteredRegularItems.length > 0 && (
              <>
                <MenuSectionHeader
                  title="Menu Items"
                  itemCount={filteredRegularItems.length}
                />
                {renderRegularItems()}
              </>
            )}

            {/* ── 2. Special Combos — below regular items, same grid width ── */}
            {filteredComboItems.length > 0 && (
              <>
                {/* Divider / spacing between sections */}
                {filteredRegularItems.length > 0 && (
                  <View style={styles.sectionDivider} />
                )}
                <ComboSection
                  combos={filteredComboItems}
                  getCartItem={getCartItem}
                  onAdd={addToCart}
                  onIncrease={increaseQuantity}
                  onDecrease={decreaseQuantity}
                  onComboPress={handleProductPress}
                />
              </>
            )}

          </ScrollView>
        )}

        {/* ── Floating cart bar ── */}
        <FloatingCart
          itemsCount={cartItemsCount}
          total={cartTotal}
          onPress={goToCart}
          bottomInset={insets.bottom}
        />
      </SafeAreaView>

      {/* ── Product detail modal ── */}
      <ProductDetailModal
        visible={showProductModal}
        product={selectedProduct}
        quantity={selectedProduct ? (getCartItem(selectedProduct.id)?.quantity || 0) : 0}
        onClose={() => setShowProductModal(false)}
        onAdd={() => selectedProduct && addToCart(selectedProduct)}
        onIncrease={() => selectedProduct && increaseQuantity(selectedProduct.id)}
        onDecrease={() => selectedProduct && decreaseQuantity(selectedProduct.id)}
      />

      {/* ── Combo detail modal ── */}
      <ComboItemsModal
        visible={showComboModal}
        combo={selectedCombo}
        onClose={() => setShowComboModal(false)}
        onAddToCart={combo => addToCart(combo)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: nzVertical(12), fontSize: rs(16), color: TEXT_LIGHT },
  errorText: { fontSize: rs(16), color: colors.error, textAlign: 'center', marginVertical: nzVertical(16) },
  retryBtn:  { backgroundColor: PRIMARY, paddingHorizontal: nz(24), paddingVertical: nzVertical(12), borderRadius: nz(8) },
  retryBtnText: { fontSize: rs(14), fontWeight: '600', color: colors.white },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: nz(16), paddingVertical: nzVertical(12),
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  headerTitle:    { fontSize: rs(22), fontWeight: '700', color: TEXT_PRIMARY },
  headerSubtitle: { fontSize: rs(12), color: TEXT_LIGHT, marginTop: nzVertical(2) },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: nz(10) },

  // Duty Button
  dutyButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: nz(12), paddingVertical: nzVertical(8),
    borderRadius: nz(20), gap: nz(6),
    borderWidth: 1.5,
  },
  dutyButtonOn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  dutyButtonOff: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  dutyIndicator: {
    width: nz(8), height: nz(8), borderRadius: nz(4),
    backgroundColor: '#F44336',
  },
  dutyIndicatorOn: {
    backgroundColor: '#4CAF50',
  },
  dutyButtonText: {
    fontSize: rs(12), fontWeight: '600',
  },

  // Cart Button
  cartButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: nz(12), paddingVertical: nzVertical(8),
    borderRadius: nz(12), gap: nz(8),
  },
  cartIconContainer: { position: 'relative' },
  cartBadge: {
    position: 'absolute', top: -nzVertical(6), right: -nz(6),
    backgroundColor: PRIMARY, borderRadius: nz(10),
    minWidth: nz(18), height: nz(18),
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: nz(4),
  },
  cartBadgeText: { fontSize: rs(10), fontWeight: '600', color: colors.white },
  cartTotal:     { fontSize: rs(15), fontWeight: '700', color: PRIMARY },

  // Off Duty Screen
  offDutyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(40),
  },
  offDutyIconContainer: {
    width: nz(140),
    height: nz(140),
    borderRadius: nz(70),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(24),
  },
  offDutyTitle: {
    fontSize: rs(24),
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(8),
  },
  offDutySubtitle: {
    fontSize: rs(14),
    color: TEXT_LIGHT,
    textAlign: 'center',
    lineHeight: nzVertical(20),
    marginBottom: nzVertical(32),
  },
  goOnDutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: nz(8),
    backgroundColor: PRIMARY,
    paddingHorizontal: nz(32),
    paddingVertical: nzVertical(14),
    borderRadius: nz(12),
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  goOnDutyButtonText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: nz(40) },
  emptyText:      { fontSize: rs(14), color: TEXT_LIGHT, marginTop: nzVertical(12) },

  scrollContent: {
    paddingHorizontal: nz(12),
    paddingTop: nzVertical(8),
  },

  // Regular items grid
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: nzVertical(12),
  },
  menuItemWrapper:     { width: (SCREEN_WIDTH - nz(36)) / 2 },
  menuItemPlaceholder: { width: (SCREEN_WIDTH - nz(36)) / 2 },

  // Divider between regular items and combos
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: nzVertical(16),
    marginHorizontal: nz(4),
  },
});