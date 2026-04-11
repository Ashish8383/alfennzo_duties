// components/pos/ComboSection.js
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';
import ComboCard from './ComboCard';

const { width: SW } = Dimensions.get('window');
const PRIMARY    = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_LIGHT   = '#999999';

// Two-column grid, same column width as regular MenuItem grid
const HORIZONTAL_PADDING = nz(12); // matches scrollContent paddingHorizontal in POSScreen
const GAP                = nz(12); // gap between columns
const CARD_WIDTH         = (SW - HORIZONTAL_PADDING * 2 - GAP) / 2;

const ComboSection = ({
  combos,
  getCartItem,
  onAdd,
  onIncrease,
  onDecrease,
  onComboPress,
}) => {
  if (!combos || combos.length === 0) return null;

  // Build rows of 2
  const rows = [];
  for (let i = 0; i < combos.length; i += 2) {
    rows.push(combos.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="gift-outline" size={nz(20)} color={PRIMARY} />
          <Text style={styles.title}>Special Combos</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{combos.length} deals</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Best value bundles for you</Text>
      </View>

      {/* 2-column grid */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map(item => {
            const cartItem = getCartItem(item.id);
            const quantity = cartItem?.quantity || 0;
            const comboWithType = { ...item, itemType: 'combo' };
            return (
              <View key={item.id} style={styles.cell}>
                <ComboCard
                  combo={comboWithType}
                  quantity={quantity}
                  onAdd={() => onAdd(comboWithType)}
                  onIncrease={() => onIncrease(item.id)}
                  onDecrease={() => onDecrease(item.id)}
                  onPress={onComboPress}
                />
              </View>
            );
          })}
          {/* placeholder to keep grid aligned when odd number */}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: nzVertical(4),
  },
  header: {
    marginBottom: nzVertical(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(8),
    marginBottom: nzVertical(2),
  },
  title: {
    fontSize: rs(17),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  countBadge: {
    backgroundColor: PRIMARY + '18',
    borderRadius: nz(10),
    paddingHorizontal: nz(8),
    paddingVertical: nzVertical(2),
  },
  countText: {
    fontSize: rs(11),
    fontWeight: '600',
    color: PRIMARY,
  },
  subtitle: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: nzVertical(12),
  },
  cell: {
    width: CARD_WIDTH,
  },
});

export default ComboSection;