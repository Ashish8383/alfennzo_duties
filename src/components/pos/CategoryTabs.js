import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const TEXT_SECONDARY = '#666666';
const BORDER_COLOR = '#F0F0F0';

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory }) {
  return (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.categoryTab, selectedCategory === 'all' && styles.categoryTabActive]}
          onPress={() => onSelectCategory('all')}
        >
          <Text style={[styles.categoryTabText, selectedCategory === 'all' && styles.categoryTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat._id}
            style={[styles.categoryTab, selectedCategory === cat._id && styles.categoryTabActive]}
            onPress={() => onSelectCategory(cat._id)}
          >
            <Text style={[styles.categoryTabText, selectedCategory === cat._id && styles.categoryTabTextActive]}>
              {cat.categoryName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryContainer: {
    backgroundColor: colors.surface,
    paddingVertical: nzVertical(8),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  categoryTab: {
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
    marginHorizontal: nz(4),
    borderRadius: nz(20),
    backgroundColor: '#F5F5F5',
  },
  categoryTabActive: {
    backgroundColor: PRIMARY,
  },
  categoryTabText: {
    fontSize: rs(13),
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  categoryTabTextActive: {
    color: colors.white,
  },
});