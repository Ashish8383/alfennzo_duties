import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

const SearchBar = ({ value, onChangeText, onClear, placeholder = 'Search items...' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={nz(20)} color={TEXT_LIGHT} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={TEXT_LIGHT}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={nz(18)} color={TEXT_LIGHT} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: nz(12),
    paddingHorizontal: nz(12),
    paddingVertical: nzVertical(4),
  },
  input: {
    flex: 1,
    fontSize: rs(14),
    color: TEXT_PRIMARY,
    paddingVertical: nzVertical(10),
    paddingHorizontal: nz(8),
  },
});

export default SearchBar;