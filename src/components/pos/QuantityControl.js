import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const PRIMARY_LIGHT = '#E8F5F2';
const TEXT_LIGHT = '#999999';
const TEXT_PRIMARY = '#1A1A1A';
const BORDER_COLOR = '#F0F0F0';

export default function QuantityControl({ quantity, onIncrease, onDecrease, size = 'medium' }) {
  const btnSize = size === 'small' ? nz(24) : nz(28);
  const iconSize = size === 'small' ? nz(14) : nz(16);
  
  return (
    <View style={styles.qtyContainer}>
      <TouchableOpacity 
        style={[styles.qtyBtn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, quantity === 0 && styles.qtyBtnDisabled]} 
        onPress={(e) => {
          e.stopPropagation();
          onDecrease();
        }}
        disabled={quantity === 0}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={iconSize} color={quantity === 0 ? TEXT_LIGHT : PRIMARY} />
      </TouchableOpacity>
      <Text style={[styles.qtyText, size === 'small' && { fontSize: rs(12) }]}>{quantity}</Text>
      <TouchableOpacity 
        style={[styles.qtyBtn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]} 
        onPress={(e) => {
          e.stopPropagation();
          onIncrease();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={iconSize} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: nz(12),
    width: '100%',
  },
  qtyBtn: {
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
});