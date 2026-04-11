import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

export default function FloatingCart({ itemsCount, total, onPress, bottomInset }) {
  if (itemsCount === 0) return null;

  return (
    <Animated.View style={[styles.floatingCart, { bottom: bottomInset + nzVertical(16) }]}>
      <View style={styles.floatingCartLeft}>
        <Text style={styles.floatingCartCount}>{itemsCount} items</Text>
        <Text style={styles.floatingCartTotal}>₹{Math.round(total)}</Text>
      </View>
      <TouchableOpacity 
        style={styles.floatingCartBtn}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingCartBtnText}>Proceed</Text>
        <Ionicons name="arrow-forward" size={nz(18)} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
});