import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ComboItemsModal from '../components/pos/ComboItemsModal';
import FloatingCart from '../components/pos/FloatingCart';
import ProductDetailModal from '../components/pos/ProductDetailModal';
import useAuthStore from '../stores/authStore';
import useUIStore from '../stores/uiStore';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = colors.primary;
const PRIMARY_LIGHT = '#E8F5F2';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#555555';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#EFEFEF';
const BG = '#F4F6F8';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, borderRadius = nz(6), style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });
  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#D8D8D8', opacity }, style]} />
  );
};

const SkeletonRow = () => (
  <View style={sk.row}>
    <SkeletonBox width={nz(58)} height={nz(58)} borderRadius={nz(10)} />
    <View style={{ flex: 1, marginLeft: nz(12), gap: nzVertical(6) }}>
      <SkeletonBox width="65%" height={nzVertical(14)} />
      <SkeletonBox width="35%" height={nzVertical(12)} />
    </View>
    <SkeletonBox width={nz(70)} height={nzVertical(32)} borderRadius={nz(8)} />
  </View>
);

const POSSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: BG }}>
    <View style={sk.searchBox}>
      <SkeletonBox width="100%" height={nzVertical(44)} borderRadius={nz(12)} />
    </View>
    <View style={sk.alphaBox}>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonBox key={i} width={nz(30)} height={nz(30)} borderRadius={nz(8)} />
      ))}
    </View>
    <View style={{ paddingHorizontal: nz(14), paddingTop: nzVertical(8) }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i}>
          <SkeletonRow />
          {i < 6 && <View style={sk.divider} />}
        </View>
      ))}
    </View>
  </View>
);

const sk = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: nzVertical(10) },
  divider: { height: 1, backgroundColor: BORDER_COLOR },
  searchBox: { paddingHorizontal: nz(14), paddingVertical: nzVertical(10) },
  alphaBox: { flexDirection: 'row', gap: nz(6), paddingHorizontal: nz(14), marginBottom: nzVertical(10) },
});

// ─── Unified Item Row ──────────────────────────────────────────────────────────
function ItemRow({ item, quantity, onPress, onAdd, onIncrease, onDecrease }) {
  const [imgErr, setImgErr] = useState(false);

  const displayPrice =
    item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0
      ? item.price * (1 - item.discountinPercentageByRestraurant / 100)
      : item.price || item.comboprice || 0;

  const isCombo = item.itemType === 'combo';
  const imgUri = item.image;

  return (
    <TouchableOpacity style={row.wrap} activeOpacity={0.75} onPress={() => onPress(item)}>
      <View style={row.imgWrap}>
        {!imgErr && imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={row.img}
            onError={() => setImgErr(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={row.imgFallback}>
            <Ionicons name={isCombo ? 'gift-outline' : 'restaurant-outline'} size={nz(22)} color={TEXT_LIGHT} />
          </View>
        )}
        <View style={[row.vegDot, { backgroundColor: item.isVeg ? '#4CAF50' : '#F44336' }]} />
      </View>

      <View style={row.info}>
        <View style={row.nameRow}>
          <Text style={row.name} numberOfLines={1}>{item.name}</Text>
          {isCombo && (
            <View style={row.comboBadge}>
              <Text style={row.comboBadgeText}>COMBO</Text>
            </View>
          )}
        </View>
        <Text style={row.price}>₹{displayPrice}</Text>
        {isCombo && item.comboItemCount > 0 && (
          <Text style={row.comboSub}>{item.comboItemCount} items included</Text>
        )}
        {!isCombo && item.categoryName && (
          <Text style={row.cat} numberOfLines={1}>{item.categoryName}</Text>
        )}
      </View>

      <View style={row.action}>
        {quantity === 0 ? (
          <TouchableOpacity
            style={row.addBtn}
            onPress={e => { e.stopPropagation(); onAdd(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={nz(18)} color={PRIMARY} />
            <Text style={row.addText}>ADD</Text>
          </TouchableOpacity>
        ) : (
          <View style={row.qtyWrap}>
            <TouchableOpacity
              style={row.qtyBtn}
              onPress={e => { e.stopPropagation(); onDecrease(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={nz(14)} color={PRIMARY} />
            </TouchableOpacity>
            <Text style={row.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={row.qtyBtn}
              onPress={e => { e.stopPropagation(); onIncrease(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={nz(14)} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nzVertical(10),
    paddingHorizontal: nz(14),
    backgroundColor: colors.surface,
    gap: nz(10),
  },
  imgWrap: {
    width: nz(58),
    height: nz(58),
    borderRadius: nz(10),
    overflow: 'visible',
    flexShrink: 0,
    position: 'relative',
  },
  img: {
    width: nz(58),
    height: nz(58),
    borderRadius: nz(10),
    backgroundColor: '#F0F0F0',
  },
  imgFallback: {
    width: nz(58),
    height: nz(58),
    borderRadius: nz(10),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    position: 'absolute',
    bottom: nz(-3),
    right: nz(-3),
    width: nz(12),
    height: nz(12),
    borderRadius: nz(6),
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: nz(6), marginBottom: nzVertical(2) },
  name: { fontSize: rs(14), fontWeight: '600', color: TEXT_PRIMARY, flex: 1, flexShrink: 1 },
  comboBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: nz(5), paddingVertical: nzVertical(1), borderRadius: nz(4), flexShrink: 0 },
  comboBadgeText: { fontSize: rs(8), fontWeight: '800', color: '#E65100' },
  price: { fontSize: rs(15), fontWeight: '700', color: PRIMARY, marginBottom: nzVertical(1) },
  cat: { fontSize: rs(11), color: TEXT_LIGHT },
  comboSub: { fontSize: rs(11), color: PRIMARY, opacity: 0.7 },
  action: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: nz(3),
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: nz(8),
    paddingHorizontal: nz(10), paddingVertical: nzVertical(6), backgroundColor: PRIMARY_LIGHT,
  },
  addText: { fontSize: rs(12), fontWeight: '700', color: PRIMARY },
  qtyWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: nz(8),
    backgroundColor: PRIMARY_LIGHT, overflow: 'hidden',
  },
  qtyBtn: { width: nz(28), height: nz(30), justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: rs(13), fontWeight: '700', color: TEXT_PRIMARY, minWidth: nz(22), textAlign: 'center' },
});

// ─── Alphabet Strip ────────────────────────────────────────────────────────────
const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function AlphaStrip({ availableLetters, selectedLetter, onSelect }) {
  const scrollRef = useRef(null);
  return (
    <View style={alpha.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={alpha.scroll}
        bounces={false}
      >
        <TouchableOpacity
          style={[alpha.allBtn, !selectedLetter && alpha.allBtnActive]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <Text style={[alpha.allTxt, !selectedLetter && alpha.allTxtActive]}>ALL</Text>
        </TouchableOpacity>

        <View style={alpha.separator} />

        {ALPHABET.map(letter => {
          const available = availableLetters.has(letter);
          const active = selectedLetter === letter;
          return (
            <TouchableOpacity
              key={letter}
              style={[alpha.btn, active && alpha.btnActive, !available && alpha.btnDim]}
              onPress={() => available && onSelect(active ? null : letter)}
              activeOpacity={available ? 0.7 : 1}
              disabled={!available}
            >
              <Text style={[alpha.txt, active && alpha.txtActive, !available && alpha.txtDim]}>
                {letter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const alpha = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingVertical: nzVertical(6),
  },
  scroll: { paddingHorizontal: nz(10), gap: nz(4), alignItems: 'center' },
  allBtn: {
    paddingHorizontal: nz(10),
    height: nz(28),
    borderRadius: nz(7),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  allBtnActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  allTxt: { fontSize: rs(10), fontWeight: '800', color: TEXT_SECONDARY, letterSpacing: 0.4 },
  allTxtActive: { color: PRIMARY },
  separator: { width: 1, height: nz(18), backgroundColor: BORDER_COLOR, marginHorizontal: nz(2) },
  btn: {
    width: nz(28),
    height: nz(28),
    borderRadius: nz(7),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  btnActive: { backgroundColor: PRIMARY },
  btnDim: { opacity: 0.3 },
  txt: { fontSize: rs(11), fontWeight: '700', color: TEXT_SECONDARY },
  txtActive: { color: colors.white },
  txtDim: { color: TEXT_LIGHT },
});

// ─── Category Chips ────────────────────────────────────────────────────────────
function CategoryChips({ categories, selectedCategory, onSelect }) {
  return (
    <View style={chip.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={chip.scroll}
        bounces={false}
      >
        <TouchableOpacity
          style={[chip.btn, selectedCategory === 'all' && chip.btnActive]}
          onPress={() => onSelect('all')}
        >
          <Text style={[chip.txt, selectedCategory === 'all' && chip.txtActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat._id}
            style={[chip.btn, selectedCategory === cat._id && chip.btnActive]}
            onPress={() => onSelect(selectedCategory === cat._id ? 'all' : cat._id)}
          >
            {cat.categoryImage ? (
              <Image
                source={{ uri: cat.categoryImage }}
                style={chip.catImg}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name="grid-outline"
                size={nz(12)}
                color={selectedCategory === cat._id ? colors.white : TEXT_SECONDARY}
                style={{ marginRight: nz(4) }}
              />
            )}
            <Text style={[chip.txt, selectedCategory === cat._id && chip.txtActive]} numberOfLines={1}>
              {cat.categoryName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingVertical: nzVertical(7),
  },
  scroll: { paddingHorizontal: nz(10), gap: nz(6), flexDirection: 'row', alignItems: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nz(12),
    paddingVertical: nzVertical(5),
    borderRadius: nz(16),
    backgroundColor: '#F0F0F0',
    gap: nz(4),
  },
  btnActive: { backgroundColor: PRIMARY },
  catImg: {
    width: nz(16),
    height: nz(16),
    borderRadius: nz(8),
    backgroundColor: '#F0F0F0',
  },
  txt: { fontSize: rs(12), fontWeight: '600', color: TEXT_SECONDARY },
  txtActive: { color: colors.white },
});

// ─── Section Letter Header ─────────────────────────────────────────────────────
function SectionLetterHeader({ letter }) {
  return (
    <View style={lh.wrap}>
      <Text style={lh.letter}>{letter}</Text>
      <View style={lh.line} />
    </View>
  );
}

const lh = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(5),
    backgroundColor: BG,
    gap: nz(8),
  },
  letter: { fontSize: rs(12), fontWeight: '800', color: PRIMARY, width: nz(16) },
  line: { flex: 1, height: 1, backgroundColor: BORDER_COLOR },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function POSScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const searchRef = useRef(null);
  const listRef = useRef(null);

  const { posMenu, posMenuError, fetchPOSMenu } = useUIStore();
  const { user } = useAuthStore();

  const isOnDuty = user?.isOnDuty === true;

  useFocusEffect(
    useCallback(() => {
      loadMenu();
    }, [])
  );

  const loadMenu = async () => {
    setIsInitialLoading(true);
    await fetchPOSMenu();
    setIsInitialLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPOSMenu();
    setRefreshing(false);
  };

  // Merge all items into one unified sorted list
  const allItems = useMemo(() => {
    const regular = (posMenu?.regularItems ?? []).map(it => ({ ...it, itemType: 'regular' }));
    const combos = (posMenu?.comboItems ?? []).map(it => ({
      ...it,
      itemType: 'combo',
      price: it.comboprice ?? it.price ?? 0,
    }));
    return [...regular, ...combos].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [posMenu]);

  const availableLetters = useMemo(() => {
    const set = new Set();
    allItems.forEach(it => {
      const first = (it.name || '').trim().charAt(0).toUpperCase();
      if (first && /[A-Z]/.test(first)) set.add(first);
      else if (first) set.add('#');
    });
    return set;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (selectedCategory === 'combo') {
      items = items.filter(it => it.itemType === 'combo');
    } else if (selectedCategory !== 'all') {
      items = items.filter(it => it.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(it =>
        it.name?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q) ||
        it.categoryName?.toLowerCase().includes(q)
      );
    }

    if (selectedLetter) {
      items = items.filter(it => {
        const first = (it.name || '').trim().charAt(0).toUpperCase();
        if (selectedLetter === '#') return first && !/[A-Z]/.test(first);
        return first === selectedLetter;
      });
    }

    return items;
  }, [allItems, selectedCategory, searchQuery, selectedLetter]);

  const groupedItems = useMemo(() => {
    if (searchQuery.trim() || selectedLetter) {
      return [{ key: 'results', items: filteredItems, isFlat: true }];
    }
    const groups = {};
    filteredItems.forEach(it => {
      const first = (it.name || '').trim().charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    });
    return Object.keys(groups).sort().map(key => ({ key, items: groups[key] }));
  }, [filteredItems, searchQuery, selectedLetter]);

  const flatData = useMemo(() => {
    const data = [];
    groupedItems.forEach(group => {
      if (!group.isFlat) {
        data.push({ type: 'header', key: group.key, id: `header-${group.key}` });
      }
      group.items.forEach(item => {
        data.push({ type: 'item', item, id: item.id || item._id });
      });
    });
    return data;
  }, [groupedItems]);

  const getCartItem = useCallback(id => cart[id], [cart]);

  const addToCart = useCallback(item => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'Go on duty to add items.'); return; }
    const id = item.id || item._id;
    setCart(prev => {
      if (prev[id]) return { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } };
      const isCombo = item.itemType === 'combo';
      const entry = {
        id,
        name: item.name || item.combofoodName || 'Item',
        price: item.price || item.comboprice || 0,
        image: item.image || null,
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
    if (!isOnDuty) return;
    setCart(prev => prev[id] ? { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } } : prev);
  }, [isOnDuty]);

  const decreaseQuantity = useCallback(id => {
    if (!isOnDuty) return;
    setCart(prev => {
      if (!prev[id]) return prev;
      const qty = prev[id].quantity - 1;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: { ...prev[id], quantity: qty } };
    });
  }, [isOnDuty]);

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

  const goToCart = () => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'Go on duty to view cart.'); return; }
    if (cartItemsCount === 0) return;
    navigation.navigate('Cart', {
      cart,
      onCartChange: updatedCart => setCart(updatedCart ?? {})
    });
  };

  const handleItemPress = item => {
    if (!isOnDuty) { Alert.alert('Off Duty', 'Go on duty to view item details.'); return; }
    if (item.itemType === 'combo') { setSelectedCombo(item); setShowComboModal(true); }
    else { setSelectedProduct(item); setShowProductModal(true); }
  };

  useEffect(() => {
    if (!isOnDuty && cartItemsCount > 0) setCart({});
  }, [isOnDuty]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedLetter(null);
  }, []);

  const renderRow = useCallback(({ item: rowData }) => {
    if (rowData.type === 'header') {
      return <SectionLetterHeader letter={rowData.key} />;
    }
    const it = rowData.item;
    const id = it.id || it._id;
    return (
      <ItemRow
        item={it}
        quantity={getCartItem(id)?.quantity || 0}
        onPress={handleItemPress}
        onAdd={() => addToCart(it)}
        onIncrease={() => increaseQuantity(id)}
        onDecrease={() => decreaseQuantity(id)}
      />
    );
  }, [getCartItem, addToCart, increaseQuantity, decreaseQuantity, handleItemPress]);

  const ItemSeparator = useCallback(({ leadingItem }) => {
    if (!leadingItem || leadingItem.type === 'header') return null;
    return <View style={styles.divider} />;
  }, []);

  // ── Loading State ───────────────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.searchHeader}>
            <SkeletonBox width={nz(60)} height={nzVertical(20)} />
          </View>
          <POSSkeleton />
        </SafeAreaView>
      </>
    );
  }

  // ── Off Duty State ──────────────────────────────────────────────────────────
  if (!isInitialLoading && !isOnDuty) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Simple Header */}
          <View style={styles.searchHeader}>
            <Text style={styles.headerTitle}>POS</Text>
            <View style={styles.dutyStatusRow}>
              <View style={[styles.dutyDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={[styles.dutyStatusText, { color: '#E53935' }]}>Off Duty</Text>
            </View>
          </View>

          {/* Panda Animation */}
          <View style={styles.offDutyContainer}>
            <View style={styles.offDutyWrap}>
              <LottieView 
                source={require('../assets/images/panda.json')} 
                autoPlay 
                loop 
                style={styles.pandaAnim} 
              />
              <Text style={styles.offDutyTitle}>You are Off Duty</Text>
              <Text style={styles.offDutySub}>Go to Home screen to turn on duty</Text>
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────────────
  if (posMenuError && !posMenu) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={nz(48)} color={colors.error} />
        <Text style={{ fontSize: rs(14), color: colors.error, margin: nzVertical(12), textAlign: 'center' }}>
          {posMenuError}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: PRIMARY, paddingHorizontal: nz(24), paddingVertical: nzVertical(12), borderRadius: nz(8) }}
          onPress={loadMenu}
        >
          <Text style={{ fontSize: rs(14), fontWeight: '600', color: colors.white }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Main UI (On Duty) ──────────────────────────────────────────────────────
  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* ── Search Bar Header ── */}
        <View style={styles.searchHeader}>
          <View style={[styles.searchBox, searchQuery.length > 0 && styles.searchBoxActive]}>
            <Ionicons name="search-outline" size={nz(18)} color={searchQuery ? PRIMARY : TEXT_LIGHT} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={text => { setSearchQuery(text); setSelectedLetter(null); }}
              placeholder="Search items, combos, categories…"
              placeholderTextColor={TEXT_LIGHT}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={nz(16)} color={TEXT_LIGHT} />
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Icon Only */}
          <View style={styles.headerActions}>
            {cartItemsCount > 0 && (
              <TouchableOpacity onPress={goToCart} style={styles.cartBadge}>
                <Ionicons name="cart" size={nz(20)} color={PRIMARY} />
                <View style={styles.cartBadgeCount}>
                  <Text style={styles.cartBadgeCountText}>{cartItemsCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Result Count ── */}
        <View style={styles.resultCountWrap}>
          <Text style={styles.resultCount}>
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* ── Category Chips ── */}
        {!searchQuery && (
          <CategoryChips
            categories={posMenu?.categories || []}
            selectedCategory={selectedCategory}
            onSelect={cat => { setSelectedCategory(cat); setSelectedLetter(null); }}
          />
        )}

        {/* ── Alphabet Strip ── */}
        {!searchQuery && (
          <AlphaStrip
            availableLetters={availableLetters}
            selectedLetter={selectedLetter}
            onSelect={letter => setSelectedLetter(letter)}
          />
        )}

        {/* ── Item List ── */}
        {filteredItems.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyWrap}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
            }
          >
            <Ionicons name="search-outline" size={nz(44)} color={TEXT_LIGHT} />
            <Text style={styles.emptyText}>No items found</Text>
            {(searchQuery || selectedLetter || selectedCategory !== 'all') && (
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => {
                setSearchQuery('');
                setSelectedLetter(null);
                setSelectedCategory('all');
              }}>
                <Text style={styles.clearFiltersTxt}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={flatData}
            keyExtractor={rowData => rowData.id?.toString() || rowData.key}
            renderItem={renderRow}
            ItemSeparatorComponent={ItemSeparator}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + nzVertical(90) }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            removeClippedSubviews
            maxToRenderPerBatch={15}
            windowSize={10}
            initialNumToRender={12}
            getItemLayout={(data, index) => ({
              length: nzVertical(78),
              offset: nzVertical(78) * index,
              index,
            })}
          />
        )}

        {/* ── Floating Cart ── */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  
  // ── Header ──
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(10),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    gap: nz(10),
  },
  headerTitle: { fontSize: rs(20), fontWeight: '800', color: TEXT_PRIMARY },
  dutyStatusRow: { flexDirection: 'row', alignItems: 'center', gap: nz(5) },
  dutyDot: { width: nz(7), height: nz(7), borderRadius: nz(3.5) },
  dutyStatusText: { fontSize: rs(12), fontWeight: '600' },
  
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(8),
    flexShrink: 0,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: nz(12),
    paddingHorizontal: nz(12),
    height: nzVertical(44),
    borderWidth: 1.5,
    borderColor: '#d9d6d6',
    gap: nz(8),
  },
  searchBoxActive: {
    borderColor: PRIMARY + '40',
    backgroundColor: PRIMARY_LIGHT,
  },
  searchInput: {
    flex: 1,
    fontSize: rs(14),
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  
  cartBadge: {
    position: 'relative',
    padding: nz(4),
  },
  cartBadgeCount: {
    position: 'absolute',
    top: -nz(4),
    right: -nz(4),
    backgroundColor: PRIMARY,
    minWidth: nz(18),
    height: nz(18),
    borderRadius: nz(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cartBadgeCountText: { fontSize: rs(10), fontWeight: '800', color: colors.white },
  
  resultCountWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(4),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  resultCount: {
    fontSize: rs(11),
    fontWeight: '600',
    color: TEXT_LIGHT,
  },

  listContent: { backgroundColor: BG },
  divider: { height: 1, backgroundColor: BORDER_COLOR, marginLeft: nz(82) },

  // ── Off Duty ──
  offDutyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: nz(40) 
  },
  offDutyWrap: { 
    alignItems: 'center', 
    gap: nzVertical(10) 
  },
  pandaAnim: { 
    width: nz(220), 
    height: nz(220) 
  },
  offDutyTitle: { 
    fontSize: rs(22), 
    fontWeight: '700', 
    color: TEXT_PRIMARY,
    marginTop: nzVertical(8)
  },
  offDutySub: { 
    fontSize: rs(14), 
    color: TEXT_LIGHT, 
    textAlign: 'center' 
  },

  // ── Empty ──
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: nzVertical(80), gap: nzVertical(12) },
  emptyText: { fontSize: rs(15), color: TEXT_LIGHT, fontWeight: '500' },
  clearFiltersBtn: {
    marginTop: nzVertical(4),
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: nz(10),
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  clearFiltersTxt: { fontSize: rs(13), fontWeight: '600', color: PRIMARY },
});