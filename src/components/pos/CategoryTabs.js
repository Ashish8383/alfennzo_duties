import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const TEXT_SECONDARY = '#666666';
const BORDER_COLOR = '#F0F0F0';

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory }) {
  console.log('Rendering CategoryTabs with categories:', categories);
  
  return (
    <View style={styles.categoryContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Category Tab */}
        <TouchableOpacity
          style={[styles.categoryTab, selectedCategory === 'all' && styles.categoryTabActive]}
          onPress={() => onSelectCategory('all')}
        >
          <View style={styles.categoryImagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
          <Text style={[styles.categoryTabText, selectedCategory === 'all' && styles.categoryTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        {/* Category Tabs with Images */}
        {categories.map(cat => {
          const hasImage = cat.categoryImage && cat.categoryImage !== null;
          
          return (
            <TouchableOpacity
              key={cat._id}
              style={[styles.categoryTab, selectedCategory === cat._id && styles.categoryTabActive]}
              onPress={() => onSelectCategory(cat._id)}
            >
              {hasImage ? (
                <Image 
                  source={{ uri: cat.categoryImage }} 
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.categoryImagePlaceholder, selectedCategory === cat._id && styles.placeholderActive]}>
                  <Text style={styles.placeholderEmoji}>
                    {getCategoryEmoji(cat.categoryName)}
                  </Text>
                </View>
              )}
              <Text 
                style={[styles.categoryTabText, selectedCategory === cat._id && styles.categoryTabTextActive]}
                numberOfLines={1}
              >
                {cat.categoryName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Helper function to assign emojis based on category name
function getCategoryEmoji(categoryName) {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('pizza')) return '🍕';
  if (name.includes('burger')) return '🍔';
  if (name.includes('fries')) return '🍟';
  if (name.includes('beverage') || name.includes('drink')) return '🥤';
  if (name.includes('popcorn')) return '🍿';
  if (name.includes('corn')) return '🌽';
  if (name.includes('pasta')) return '🍝';
  if (name.includes('sandwich')) return '🥪';
  if (name.includes('snacks')) return '🍱';
  if (name.includes('street')) return '🌮';
  if (name.includes('ice cream')) return '🍦';
  if (name.includes('gujarati')) return '🍛';
  if (name.includes('combo')) return '🎁';
  return '🍴';
}

const styles = StyleSheet.create({
  categoryContainer: {
    backgroundColor: colors.surface,
    paddingVertical: nzVertical(8),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  scrollContent: {
    paddingHorizontal: nz(8),
  },
  categoryTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: nz(8),
    paddingVertical: nzVertical(6),
    marginHorizontal: nz(4),
    borderRadius: nz(12),
    minWidth: nz(70),
  },
  categoryTabActive: {
    backgroundColor: PRIMARY + '10', // Light tint instead of solid for better image visibility
  },
  categoryImage: {
    width: nz(50),
    height: nz(50),
    borderRadius: nz(25),
    marginBottom: nzVertical(4),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryImagePlaceholder: {
    width: nz(50),
    height: nz(50),
    borderRadius: nz(25),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(4),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placeholderActive: {
    backgroundColor: PRIMARY + '20',
  },
  placeholderEmoji: {
    fontSize: rs(22),
  },
  categoryTabText: {
    fontSize: rs(11),
    fontWeight: '500',
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  categoryTabTextActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
});