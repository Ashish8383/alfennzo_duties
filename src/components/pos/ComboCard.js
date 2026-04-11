// components/pos/ComboCard.js
import { Ionicons } from '@expo/vector-icons';
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

const ComboCard = ({ combo, quantity, onAdd, onIncrease, onDecrease, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const displayPrice = combo.isDiscountedByRestraurant && combo.discountinPercentageByRestraurant > 0
    ? combo.price * (1 - combo.discountinPercentageByRestraurant / 100)
    : combo.price;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress(combo);
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd();
  };

  return (
    <Animated.View style={[styles.comboCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} style={styles.comboCardInner} onPress={handlePress}>
        <View style={styles.imageContainer}>
          {!imageError && combo.image ? (
            <Image 
              source={{ uri: combo.image }}
              style={styles.comboImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <DefaultImage size={nz(100)} />
          )}
          
          <View style={styles.comboBadge}>
            <Ionicons name="gift-outline" size={nz(10)} color={colors.white} />
            <Text style={styles.comboBadgeText}>COMBO</Text>
          </View>
          
          {combo.comboItemCount && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{combo.comboItemCount} items</Text>
            </View>
          )}
          
          {combo.isDiscountedByRestraurant && combo.discountinPercentageByRestraurant > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{combo.discountinPercentageByRestraurant}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <VegDot isVeg={combo.isVeg} />
          </View>
          <Text style={styles.comboName} numberOfLines={1}>{combo.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.comboPrice}>₹{Math.round(displayPrice)}</Text>
            {combo.isDiscountedByRestraurant && combo.discountinPercentageByRestraurant > 0 && (
              <Text style={styles.originalPrice}>₹{combo.price}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.actionContainer}>
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
};

const styles = StyleSheet.create({
  comboCard: {
    backgroundColor: colors.surface,
    borderRadius: nz(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
    marginBottom: nzVertical(4),
  },
  comboCardInner: {
    padding: nz(10),
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: nzVertical(8),
    position: 'relative',
  },
  comboImage: {
    width: '100%',
    height: nz(100),
    borderRadius: nz(12),
    backgroundColor: '#F5F5F5',
  },
  comboBadge: {
    position: 'absolute',
    top: nzVertical(6),
    left: nz(6),
    backgroundColor: PRIMARY,
    paddingHorizontal: nz(6),
    paddingVertical: nzVertical(2),
    borderRadius: nz(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(3),
  },
  comboBadgeText: {
    fontSize: rs(8),
    fontWeight: '600',
    color: colors.white,
  },
  itemCountBadge: {
    position: 'absolute',
    bottom: -nzVertical(6),
    right: nz(6),
    backgroundColor: '#FF8C00',
    paddingHorizontal: nz(6),
    paddingVertical: nzVertical(2),
    borderRadius: nz(10),
  },
  itemCountText: {
    fontSize: rs(8),
    fontWeight: '600',
    color: colors.white,
  },
  discountBadge: {
    position: 'absolute',
    top: nzVertical(30),
    left: nz(6),
    backgroundColor: SUCCESS,
    paddingHorizontal: nz(6),
    paddingVertical: nzVertical(2),
    borderRadius: nz(8),
  },
  discountBadgeText: {
    fontSize: rs(8),
    fontWeight: '600',
    color: colors.white,
  },
  infoContainer: {
    marginTop: nzVertical(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nzVertical(4),
  },
  comboName: {
    fontSize: rs(13),
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(4),
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(6),
    flexWrap: 'wrap',
  },
  comboPrice: {
    fontSize: rs(14),
    fontWeight: '700',
    color: PRIMARY,
  },
  originalPrice: {
    fontSize: rs(11),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: nzVertical(8),
    marginTop: nzVertical(6),
  },
  addBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(6),
    borderRadius: nz(8),
    width: '100%',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: rs(12),
    fontWeight: '600',
    color: colors.white,
  },
});

export default ComboCard;