// components/Header.js
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

export default function Header({ title, showBack, onBack, rightIcon, onRightPress }) {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-back-outline" size={nz(isTablet ? 28 : 24)} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        
        <View style={styles.rightContainer}>
          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.rightButton}>
              <Icon name={rightIcon} size={nz(isTablet ? 28 : 24)} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(12),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: nzVertical(isTablet ? 64 : 56),
  },
  leftContainer: {
    width: nz(40),
  },
  backButton: {
    padding: nz(4),
  },
  title: {
    fontSize: rs(isTablet ? 20 : 18),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  rightContainer: {
    width: nz(40),
    alignItems: 'flex-end',
  },
  rightButton: {
    padding: nz(4),
  },
});