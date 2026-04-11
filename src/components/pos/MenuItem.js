import { useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';
import DefaultImage from './DefaultImage';
import QuantityControl from './QuantityControl';
import VegDot from './VegDot';

const PRIMARY = colors.primary;
const SUCCESS = '#2E7D32';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

export default function MenuItem({ item, quantity, onAdd, onIncrease, onDecrease, onPress }) {
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const displayPrice = item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0
    ? item.price * (1 - item.discountinPercentageByRestraurant / 100)
    : item.price;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    
    if (onPress) {
      onPress(item);
    }
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd();
  };

  return (
    <Animated.View style={[styles.itemCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} style={styles.itemCardInner} onPress={handlePress}>
        <View style={styles.itemImageContainer}>
          {!imageError && item.image ? (
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
          {item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{item.discountinPercentageByRestraurant}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <VegDot isVeg={item.isVeg} />
          </View>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description || 'Delicious food item'}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>₹{Math.round(displayPrice)}</Text>
            {item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0 && (
              <Text style={styles.originalPrice}>₹{item.price}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.itemAction}>
          {quantity === 0 ? (
            <TouchableOpacity 
              style={styles.addBtn} 
              onPress={handleAdd}
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

const styles = StyleSheet.create({
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
  discountBadge: {
    position: 'absolute',
    top: nzVertical(8),
    right: nz(8),
    backgroundColor: SUCCESS,
    paddingHorizontal: nz(6),
    paddingVertical: nzVertical(2),
    borderRadius: nz(8),
  },
  discountBadgeText: {
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(8),
  },
  itemPrice: {
    fontSize: rs(16),
    fontWeight: '700',
    color: PRIMARY,
  },
  originalPrice: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  itemAction: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: nzVertical(10),
  },
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
});