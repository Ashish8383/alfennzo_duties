import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';
import DefaultImage from './DefaultImage';
import QuantityControl from './QuantityControl'; // ✅ IMPORT
import VegDot from './VegDot';

const PRIMARY = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';

export default function MenuItem({
  item,
  onPress,
  quantity = 0,
  onAdd,
  onIncrease,
  onDecrease,
}) {
  const [imageError, setImageError] = useState(false);

  const displayPrice =
    item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0
      ? item.price * (1 - item.discountinPercentageByRestraurant / 100)
      : item.price;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      {/* Image */}
      {!imageError && item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          onError={() => setImageError(true)}
        />
      ) : (
        <DefaultImage size={nz(70)} />
      )}

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <VegDot isVeg={item.isVeg} />
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        <Text style={styles.price}>₹{Math.round(displayPrice)}</Text>
      </View>

      {/* ✅ RIGHT SIDE */}
      <View style={styles.action}>
        {quantity === 0 ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={(e) => {
              e.stopPropagation(); // IMPORTANT
              onAdd();
            }}
          >
            <Text style={styles.addText}>ADD</Text>
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
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nzVertical(10),
    paddingHorizontal: nz(16),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  image: {
    width: nz(70),
    height: nz(70),
    borderRadius: nz(10),
    backgroundColor: '#F5F5F5',
  },

  info: {
    flex: 1,
    marginLeft: nz(12),
    justifyContent: 'center',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nzVertical(4),
  },

  name: {
    fontSize: rs(14),
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
  },

  price: {
    fontSize: rs(15),
    fontWeight: '700',
    color: PRIMARY,
  },
  action: {
  justifyContent: 'center',
  alignItems: 'center',
  minWidth: nz(80),
},

addBtn: {
  borderWidth: 1.5,
  borderColor: PRIMARY,
  paddingHorizontal: nz(14),
  paddingVertical: nzVertical(6),
  borderRadius: nz(8),
},

addText: {
  color: PRIMARY,
  fontWeight: '700',
  fontSize: rs(12),
},
});