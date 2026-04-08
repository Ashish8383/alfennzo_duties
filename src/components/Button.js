// components/Input.js
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;
  const inputSecureText = isPassword ? !showPassword : false;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={[
            styles.input,
            multiline && { height: nzVertical(numberOfLines * 24) },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLighter}
          secureTextEntry={inputSecureText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <View style={styles.eyeIconWrapper}>
              {showPassword ? (
                <View style={styles.eyeOpen}>
                  <View style={styles.eyeBall} />
                </View>
              ) : (
                <View style={styles.eyeClosed}>
                  <View style={styles.eyeSlash} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: nzVertical(18),
  },
  label: {
    fontSize: rs(isTablet ? 16 : 14),
    fontWeight: '500',
    color: colors.text,
    marginBottom: nzVertical(6),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(12),
    backgroundColor: colors.white,
    paddingHorizontal: nz(14),
    minHeight: nzVertical(isTablet ? 52 : 48),
  },
  input: {
    flex: 1,
    fontSize: rs(isTablet ? 16 : 15),
    color: colors.text,
    paddingVertical: nzVertical(12),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: rs(11),
    color: colors.error,
    marginTop: nzVertical(3),
    marginLeft: nz(4),
  },
  eyeButton: {
    padding: nz(6),
  },
  eyeIconWrapper: {
    width: nz(22),
    height: nz(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeOpen: {
    width: nz(18),
    height: nz(14),
    borderRadius: nz(9),
    borderWidth: 1.5,
    borderColor: colors.textLight,
    position: 'relative',
    backgroundColor: colors.white,
  },
  eyeBall: {
    width: nz(5),
    height: nz(5),
    borderRadius: nz(2.5),
    backgroundColor: colors.textLight,
    position: 'absolute',
    top: 3.5,
    left: 5.5,
  },
  eyeClosed: {
    width: nz(18),
    height: nz(14),
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeSlash: {
    width: nz(20),
    height: nz(2),
    backgroundColor: colors.textLight,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
});

export default Input;