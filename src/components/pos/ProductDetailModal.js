import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    Animated,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';
import DefaultImage from './DefaultImage';
import QuantityControl from './QuantityControl';
import VegDot from './VegDot';

const PRIMARY = colors.primary;
const SUCCESS = '#2E7D32';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#666666';
const TEXT_LIGHT = '#999999';

export default function ProductDetailModal({ 
  visible, 
  product, 
  quantity, 
  onClose, 
  onAdd,
  onIncrease,
  onDecrease 
}) {
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!product) return null;

  const displayPrice = product.isDiscountedByRestraurant && product.discountinPercentageByRestraurant > 0
    ? product.price * (1 - product.discountinPercentageByRestraurant / 100)
    : product.price;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + nzVertical(16) }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={nz(24)} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <Animated.Text style={[styles.modalTitle, { opacity: headerOpacity }]}>
              {product.name}
            </Animated.Text>
            <View style={{ width: nz(40) }} />
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            <View style={styles.imageContainer}>
              {!imageError && product.image ? (
                <Image 
                  source={{ uri: product.image }}
                  style={styles.productImage}
                  onError={() => setImageError(true)}
                  resizeMode="cover"
                />
              ) : (
                <DefaultImage size={nz(200)} />
              )}
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.titleRow}>
                <View style={styles.nameRow}>
                  <VegDot isVeg={product.isVeg} />
                  <Text style={styles.productName}>{product.name}</Text>
                </View>
                {product.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Popular</Text>
                  </View>
                )}
              </View>

              <Text style={styles.productDescription}>{product.description || 'No description available'}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{Math.round(displayPrice)}</Text>
                {product.isDiscountedByRestraurant && product.discountinPercentageByRestraurant > 0 && (
                  <>
                    <Text style={styles.originalPrice}>₹{product.price}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{product.discountinPercentageByRestraurant}% OFF</Text>
                    </View>
                  </>
                )}
              </View>

              {product.GST > 0 && (
                <Text style={styles.gstText}>GST: {product.GST}%</Text>
              )}

              <View style={styles.divider} />

              {/* Category Info */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{product.categoryName}</Text>
              </View>

              {product.rating && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rating</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={nz(16)} color="#FFB800" />
                    <Text style={styles.ratingText}>{product.rating}</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {quantity === 0 ? (
              <TouchableOpacity style={styles.addToCartBtn} onPress={onAdd} activeOpacity={0.8}>
                <Text style={styles.addToCartBtnText}>Add to Cart • ₹{Math.round(displayPrice)}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.quantityFooter}>
                <Text style={styles.quantityLabel}>Quantity</Text>
                <QuantityControl 
                  quantity={quantity}
                  onIncrease={onIncrease}
                  onDecrease={onDecrease}
                  size="large"
                />
                <Text style={styles.totalPrice}>Total: ₹{Math.round(displayPrice * quantity)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: nz(24),
    borderTopRightRadius: nz(24),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeBtn: {
    width: nz(40),
    height: nz(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: rs(18),
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: nzVertical(20),
    backgroundColor: '#FAFAFA',
  },
  productImage: {
    width: nz(200),
    height: nz(200),
    borderRadius: nz(16),
  },
  detailsContainer: {
    padding: nz(20),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: nzVertical(12),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productName: {
    fontSize: rs(20),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  popularBadge: {
    backgroundColor: PRIMARY,
    paddingHorizontal: nz(10),
    paddingVertical: nzVertical(4),
    borderRadius: nz(12),
  },
  popularBadgeText: {
    fontSize: rs(11),
    fontWeight: '600',
    color: colors.white,
  },
  productDescription: {
    fontSize: rs(14),
    color: TEXT_SECONDARY,
    lineHeight: nzVertical(20),
    marginBottom: nzVertical(16),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(10),
    marginBottom: nzVertical(8),
  },
  productPrice: {
    fontSize: rs(24),
    fontWeight: '700',
    color: PRIMARY,
  },
  originalPrice: {
    fontSize: rs(16),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: SUCCESS,
    paddingHorizontal: nz(8),
    paddingVertical: nzVertical(3),
    borderRadius: nz(8),
  },
  discountBadgeText: {
    fontSize: rs(11),
    fontWeight: '600',
    color: colors.white,
  },
  gstText: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
    marginBottom: nzVertical(16),
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: nzVertical(16),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(8),
  },
  infoLabel: {
    fontSize: rs(14),
    color: TEXT_SECONDARY,
  },
  infoValue: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(4),
  },
  ratingText: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  footer: {
    padding: nz(20),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addToCartBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
  },
  addToCartBtnText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
  },
  quantityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: rs(14),
    color: TEXT_SECONDARY,
  },
  totalPrice: {
    fontSize: rs(16),
    fontWeight: '600',
    color: PRIMARY,
  },
});