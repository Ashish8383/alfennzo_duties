import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_LIGHT = '#999999';

const MenuSectionHeader = ({ title, itemCount }) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Ionicons name="restaurant-outline" size={nz(20)} color={PRIMARY} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {itemCount > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{itemCount} items</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
    backgroundColor: colors.surface,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(8),
  },
  title: {
    fontSize: rs(16),
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: nz(10),
    paddingVertical: nzVertical(4),
    borderRadius: nz(12),
  },
  countText: {
    fontSize: rs(11),
    color: TEXT_LIGHT,
  },
});

export default MenuSectionHeader;