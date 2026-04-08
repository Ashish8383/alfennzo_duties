// screens/POSScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────
const PRIMARY = colors.primary;
const PRIMARY_LIGHT = '#E8F5F2';
const SUCCESS = '#2E7D32';
const SUCCESS_LIGHT = '#E8F5E9';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#666666';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

// ─── Mock Menu Data with Images ───────────────────────────────────────────────
const MENU_ITEMS = [
  { id: '1', name: 'Margherita Pizza', price: 299, description: 'Classic cheese & tomato', isVeg: true, popular: true, image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=200' },
  { id: '2', name: 'Farmhouse Pizza', price: 399, description: 'Bell peppers, onions, corn', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=200' },
  { id: '3', name: 'Chicken Tikka', price: 349, description: 'Grilled chicken tikka', isVeg: false, popular: true, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200' },
  { id: '4', name: 'Paneer Butter Masala', price: 279, description: 'Creamy paneer curry', isVeg: true, popular: true, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200' },
  { id: '5', name: 'Butter Chicken', price: 389, description: 'Rich tomato gravy', isVeg: false, popular: true, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200' },
  { id: '6', name: 'Garlic Naan', price: 49, description: 'Freshly baked', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1609770231080-e321deccc34c?w=200' },
  { id: '7', name: 'Veg Biryani', price: 229, description: 'Aromatic rice with veggies', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1563379091339-03b21dd4a2f8?w=200' },
  { id: '8', name: 'Chicken Biryani', price: 329, description: 'Hyderabadi style', isVeg: false, popular: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21dd4a2f8?w=200' },
  { id: '9', name: 'French Fries', price: 99, description: 'Crispy & salted', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200' },
  { id: '10', name: 'Chocolate Shake', price: 149, description: 'Thick chocolate shake', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200' },
  { id: '11', name: 'Cold Coffee', price: 129, description: 'With ice cream', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=200' },
  { id: '12', name: 'Veg Spring Rolls', price: 179, description: 'Crispy rolls', isVeg: true, popular: false, image: 'https://images.unsplash.com/photo-1625938144755-6d9530d0f9f8?w=200' },
];

// ─── Payment methods ──────────────────────────────────────────────────────────
const PAY_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'card', label: 'Card', icon: 'card-outline' },
  { id: 'upi', label: 'UPI', icon: 'qr-code-outline' },
];

// ─── Default Image Component ──────────────────────────────────────────────────
function DefaultImage({ size = nz(80) }) {
  return (
    <View style={[styles.defaultImage, { width: size, height: size }]}>
      <MaterialCommunityIcons name="food" size={nz(32)} color={TEXT_LIGHT} />
    </View>
  );
}

// ─── Veg / Non-veg dot ────────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  const color = isVeg ? SUCCESS : '#E53935';
  return (
    <View style={[styles.vegDot, { borderColor: color }]}>
      <View style={[styles.vegDotInner, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Quantity Control ─────────────────────────────────────────────────────────
function QuantityControl({ quantity, onIncrease, onDecrease }) {
  return (
    <View style={styles.qtyContainer}>
      <TouchableOpacity 
        style={[styles.qtyBtn, quantity === 0 && styles.qtyBtnDisabled]} 
        onPress={onDecrease}
        disabled={quantity === 0}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={nz(16)} color={quantity === 0 ? TEXT_LIGHT : PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.qtyText}>{quantity}</Text>
      <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} activeOpacity={0.7}>
        <Ionicons name="add" size={nz(16)} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Menu Item Card (White Card with Image) ───────────────────────────────────
function MenuItem({ item, quantity, onAdd, onIncrease, onDecrease }) {
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onAdd();
  };

  return (
    <Animated.View style={[styles.itemCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} style={styles.itemCardInner}>
        {/* Image Section */}
        <View style={styles.itemImageContainer}>
          {!imageError ? (
            <Image 
              source={{ uri: item.image }}
              style={styles.itemImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <DefaultImage size={nz(80)} />
          )}
          {item.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>Popular</Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <VegDot isVeg={item.isVeg} />
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
        </View>
        
        {/* Action Section */}
        <View style={styles.itemAction}>
          {quantity === 0 ? (
            <TouchableOpacity 
              style={styles.addBtn} 
              onPress={handlePress}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <QuantityControl 
              quantity={quantity}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Cart Item Component ──────────────────────────────────────────────────────
function CartItem({ item, quantity, onIncrease, onDecrease, onRemove }) {
  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>₹{item.price}</Text>
      </View>
      <View style={styles.cartItemActions}>
        <QuantityControl 
          quantity={quantity}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
        />
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Ionicons name="trash-outline" size={nz(18)} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Order Summary Modal (Fixed Scrolling) ────────────────────────────────────
function OrderSummaryModal({ visible, cart, items, onClose, onConfirm }) {
  const insets = useSafeAreaInsets();
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [audi, setAudi] = useState('');
  const [row, setRow] = useState('');
  const [seat, setSeat] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const scrollViewRef = useRef();
  
  const cartItems = items.filter(item => cart[item.id] > 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * cart[item.id], 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const isValid = customerName.trim() && phoneNumber.trim().length >= 10 && audi.trim();

  const handleConfirm = () => {
    if (isValid) {
      onConfirm({
        customerName,
        phoneNumber,
        audi,
        row,
        seat,
        paymentMethod,
        specialInstructions,
        items: cartItems,
        subtotal,
        tax,
        total,
      });
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCustomerName('');
      setPhoneNumber('');
      setAudi('');
      setRow('');
      setSeat('');
      setPaymentMethod('cash');
      setSpecialInstructions('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + nzVertical(16) }]}>
              <View style={styles.modalHandle} />
              
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Summary</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={nz(24)} color={TEXT_LIGHT} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false} 
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Order Items */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Items</Text>
                  {cartItems.map(item => (
                    <View key={item.id} style={styles.summaryItem}>
                      <View style={styles.summaryItemLeft}>
                        <Text style={styles.summaryItemQty}>×{cart[item.id]}</Text>
                        <Text style={styles.summaryItemName}>{item.name}</Text>
                      </View>
                      <Text style={styles.summaryItemPrice}>₹{item.price * cart[item.id]}</Text>
                    </View>
                  ))}
                </View>

                {/* Bill Details */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Bill Details</Text>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Subtotal</Text>
                    <Text style={styles.billValue}>₹{subtotal}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>GST (5%)</Text>
                    <Text style={styles.billValue}>₹{tax}</Text>
                  </View>
                  <View style={[styles.billRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₹{total}</Text>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Customer Details</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Customer Name *"
                    placeholderTextColor={TEXT_LIGHT}
                    value={customerName}
                    onChangeText={setCustomerName}
                    returnKeyType="next"
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number *"
                    placeholderTextColor={TEXT_LIGHT}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={13}
                    returnKeyType="next"
                  />
                  
                  <View style={styles.rowFields}>
                    <View style={styles.fieldHalf}>
                      <TextInput
                        style={styles.input}
                        placeholder="Audi No. *"
                        placeholderTextColor={TEXT_LIGHT}
                        value={audi}
                        onChangeText={setAudi}
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <TextInput
                        style={styles.input}
                        placeholder="Row"
                        placeholderTextColor={TEXT_LIGHT}
                        value={row}
                        onChangeText={setRow}
                        autoCapitalize="characters"
                        maxLength={3}
                        returnKeyType="next"
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <TextInput
                        style={styles.input}
                        placeholder="Seat"
                        placeholderTextColor={TEXT_LIGHT}
                        value={seat}
                        onChangeText={setSeat}
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Special Instructions (optional)"
                    placeholderTextColor={TEXT_LIGHT}
                    value={specialInstructions}
                    onChangeText={setSpecialInstructions}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Payment Methods */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <View style={styles.paymentGrid}>
                    {PAY_METHODS.map(method => (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.paymentBtn,
                          paymentMethod === method.id && styles.paymentBtnActive
                        ]}
                        onPress={() => setPaymentMethod(method.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons 
                          name={method.icon} 
                          size={nz(20)} 
                          color={paymentMethod === method.id ? colors.white : TEXT_SECONDARY} 
                        />
                        <Text style={[
                          styles.paymentBtnText,
                          paymentMethod === method.id && styles.paymentBtnTextActive
                        ]}>
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Extra padding for keyboard */}
                <View style={{ height: nzVertical(20) }} />
              </ScrollView>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={!isValid}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnText}>Mark as Paid • ₹{total}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ visible, orderDetails, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.successOverlay}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={nz(60)} color={SUCCESS} />
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>Payment received successfully</Text>
          
          <View style={styles.successDetails}>
            <Text style={styles.successDetailText}>
              Customer: {orderDetails?.customerName}
            </Text>
            <Text style={styles.successDetailText}>
              Phone: {orderDetails?.phoneNumber}
            </Text>
            <Text style={styles.successDetailText}>
              Audi: {orderDetails?.audi} {orderDetails?.row && `| Row: ${orderDetails.row}`} {orderDetails?.seat && `| Seat: ${orderDetails.seat}`}
            </Text>
            <Text style={styles.successDetailText}>
              Amount: ₹{orderDetails?.total}
            </Text>
            <Text style={styles.successDetailText}>
              Payment: {orderDetails?.paymentMethod?.toUpperCase()}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.successBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.successBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main POS Screen ──────────────────────────────────────────────────────────
export default function POSScreen() {
  const [cart, setCart] = useState({});
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const insets = useSafeAreaInsets();

  // Cart helpers
  const getQuantity = (id) => cart[id] || 0;
  
  const addToCart = (id) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };
  
  const increaseQuantity = (id) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };
  
  const decreaseQuantity = (id) => {
    setCart(prev => {
      const newQty = (prev[id] || 0) - 1;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newQty };
    });
  };
  
  const removeItem = (id) => {
    setCart(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = MENU_ITEMS.reduce((sum, item) => sum + (item.price * getQuantity(item.id)), 0);

  const handleProceed = () => {
    if (cartItemsCount > 0) {
      setShowOrderSummary(true);
    }
  };

  const handleConfirmOrder = (details) => {
    setOrderDetails(details);
    setShowOrderSummary(false);
    setShowSuccess(true);
    setCart({});
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setOrderDetails(null);
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <SafeAreaView style={styles.container} edges={['top']}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>POS System</Text>
            <Text style={styles.headerSubtitle}>Point of Sale</Text>
          </View>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={handleProceed}
            activeOpacity={0.8}
          >
            <View style={styles.cartIconContainer}>
              <Ionicons name="cart-outline" size={nz(22)} color={PRIMARY} />
              {cartItemsCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
                </View>
              )}
            </View>
            {cartItemsCount > 0 && (
              <Text style={styles.cartTotal}>₹{cartTotal}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Menu Items Grid */}
        <FlatList
          data={MENU_ITEMS}
          keyExtractor={item => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.menuList,
            { paddingBottom: insets.bottom + nzVertical(80) }
          ]}
          columnWrapperStyle={styles.menuRow}
          renderItem={({ item }) => (
            <View style={styles.menuItemWrapper}>
              <MenuItem
                item={item}
                quantity={getQuantity(item.id)}
                onAdd={() => addToCart(item.id)}
                onIncrease={() => increaseQuantity(item.id)}
                onDecrease={() => decreaseQuantity(item.id)}
              />
            </View>
          )}
        />

        {/* Floating Cart Bar */}
        {cartItemsCount > 0 && (
          <Animated.View style={[styles.floatingCart, { bottom: insets.bottom + nzVertical(16) }]}>
            <View style={styles.floatingCartLeft}>
              <Text style={styles.floatingCartCount}>{cartItemsCount} items</Text>
              <Text style={styles.floatingCartTotal}>₹{cartTotal}</Text>
            </View>
            <TouchableOpacity 
              style={styles.floatingCartBtn}
              onPress={handleProceed}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingCartBtnText}>Proceed</Text>
              <Ionicons name="arrow-forward" size={nz(18)} color={colors.white} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Modals */}
      <OrderSummaryModal
        visible={showOrderSummary}
        cart={cart}
        items={MENU_ITEMS}
        onClose={() => setShowOrderSummary(false)}
        onConfirm={handleConfirmOrder}
      />

      <SuccessModal
        visible={showSuccess}
        orderDetails={orderDetails}
        onClose={handleSuccessClose}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(12),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: {
    fontSize: rs(22),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
    marginTop: nzVertical(2),
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: nz(12),
    paddingVertical: nzVertical(8),
    borderRadius: nz(12),
    gap: nz(8),
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -nzVertical(6),
    right: -nz(6),
    backgroundColor: PRIMARY,
    borderRadius: nz(10),
    minWidth: nz(18),
    height: nz(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(4),
  },
  cartBadgeText: {
    fontSize: rs(10),
    fontWeight: '600',
    color: colors.white,
  },
  cartTotal: {
    fontSize: rs(15),
    fontWeight: '700',
    color: PRIMARY,
  },
  
  // Menu Grid
  menuList: {
    paddingHorizontal: nz(12),
    paddingTop: nzVertical(12),
  },
  menuRow: {
    justifyContent: 'space-between',
    marginBottom: nzVertical(12),
  },
  menuItemWrapper: {
    width: (SCREEN_WIDTH - nz(36)) / 2,
  },
  
  // Menu Item Card
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: nz(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  itemCardInner: {
    padding: nz(12),
  },
  itemImageContainer: {
    alignItems: 'center',
    marginBottom: nzVertical(12),
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: nz(100),
    borderRadius: nz(12),
    backgroundColor: '#F5F5F5',
  },
  defaultImage: {
    width: '100%',
    height: nz(100),
    borderRadius: nz(12),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: nzVertical(8),
    left: nz(8),
    backgroundColor: PRIMARY,
    paddingHorizontal: nz(8),
    paddingVertical: nzVertical(3),
    borderRadius: nz(12),
  },
  popularBadgeText: {
    fontSize: rs(9),
    fontWeight: '600',
    color: colors.white,
  },
  itemInfo: {
    marginBottom: nzVertical(12),
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nzVertical(6),
  },
  itemName: {
    fontSize: rs(14),
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(4),
  },
  itemDescription: {
    fontSize: rs(11),
    color: TEXT_LIGHT,
    marginBottom: nzVertical(8),
    lineHeight: nzVertical(14),
  },
  itemPrice: {
    fontSize: rs(16),
    fontWeight: '700',
    color: PRIMARY,
  },
  itemAction: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: nzVertical(10),
  },
  
  // Add Button
  addBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: nz(24),
    paddingVertical: nzVertical(8),
    borderRadius: nz(8),
    width: '100%',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: rs(13),
    fontWeight: '600',
    color: colors.white,
  },
  
  // Quantity Control
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: nz(12),
    width: '100%',
  },
  qtyBtn: {
    width: nz(28),
    height: nz(28),
    borderRadius: nz(14),
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: BORDER_COLOR,
  },
  qtyText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: TEXT_PRIMARY,
    minWidth: nz(24),
    textAlign: 'center',
  },
  
  // Veg Dot
  vegDot: {
    width: nz(12),
    height: nz(12),
    borderRadius: nz(3),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDotInner: {
    width: nz(5),
    height: nz(5),
    borderRadius: nz(2.5),
  },
  
  // Floating Cart Bar
  floatingCart: {
    position: 'absolute',
    left: nz(16),
    right: nz(16),
    backgroundColor: colors.surface,
    borderRadius: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  floatingCartLeft: {
    gap: nzVertical(2),
  },
  floatingCartCount: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
  },
  floatingCartTotal: {
    fontSize: rs(18),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  floatingCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingHorizontal: nz(20),
    paddingVertical: nzVertical(10),
    gap: nz(8),
  },
  floatingCartBtnText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.white,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: nz(24),
    borderTopRightRadius: nz(24),
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(12),
    maxHeight: '90%',
  },
  modalHandle: {
    width: nz(40),
    height: nz(4),
    borderRadius: nz(2),
    backgroundColor: BORDER_COLOR,
    alignSelf: 'center',
    marginBottom: nzVertical(16),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nzVertical(20),
  },
  modalTitle: {
    fontSize: rs(20),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  modalScrollContent: {
    paddingBottom: nzVertical(20),
  },
  
  // Summary Section
  summarySection: {
    marginBottom: nzVertical(20),
  },
  sectionTitle: {
    fontSize: rs(14),
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: nzVertical(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(8),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  summaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: nz(8),
  },
  summaryItemQty: {
    fontSize: rs(13),
    fontWeight: '600',
    color: PRIMARY,
    minWidth: nz(30),
  },
  summaryItemName: {
    fontSize: rs(14),
    color: TEXT_PRIMARY,
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  
  // Bill Details
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: nzVertical(6),
  },
  billLabel: {
    fontSize: rs(13),
    color: TEXT_SECONDARY,
  },
  billValue: {
    fontSize: rs(13),
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    marginTop: nzVertical(8),
    paddingTop: nzVertical(10),
  },
  totalLabel: {
    fontSize: rs(16),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: rs(18),
    fontWeight: '700',
    color: PRIMARY,
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: nz(10),
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(12),
    fontSize: rs(14),
    color: TEXT_PRIMARY,
    backgroundColor: colors.surface,
    marginBottom: nzVertical(12),
  },
  textArea: {
    height: nzVertical(80),
  },
  rowFields: {
    flexDirection: 'row',
    gap: nz(8),
    marginBottom: nzVertical(12),
  },
  fieldHalf: {
    flex: 1,
  },
  
  // Payment Methods
  paymentGrid: {
    flexDirection: 'row',
    gap: nz(12),
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: nz(6),
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: nz(10),
    paddingVertical: nzVertical(10),
    backgroundColor: colors.surface,
  },
  paymentBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  paymentBtnText: {
    fontSize: rs(12),
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  paymentBtnTextActive: {
    color: colors.white,
  },
  
  // Cart Item
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(8),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  cartItemPrice: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
    marginTop: nzVertical(2),
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(12),
  },
  removeBtn: {
    padding: nz(8),
  },
  
  // Confirm Button
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
    marginTop: nzVertical(8),
    marginBottom: nzVertical(8),
  },
  confirmBtnDisabled: {
    backgroundColor: TEXT_LIGHT,
  },
  confirmBtnText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
  },
  
  // Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(24),
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: nz(20),
    padding: nz(28),
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    marginBottom: nzVertical(16),
  },
  successTitle: {
    fontSize: rs(22),
    fontWeight: '700',
    color: SUCCESS,
    marginBottom: nzVertical(6),
  },
  successSubtitle: {
    fontSize: rs(13),
    color: TEXT_SECONDARY,
    marginBottom: nzVertical(20),
  },
  successDetails: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: nz(12),
    padding: nz(16),
    width: '100%',
    marginBottom: nzVertical(20),
    gap: nzVertical(6),
  },
  successDetailText: {
    fontSize: rs(13),
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  successBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingHorizontal: nz(40),
    paddingVertical: nzVertical(12),
  },
  successBtnText: {
    fontSize: rs(15),
    fontWeight: '600',
    color: colors.white,
  },
});