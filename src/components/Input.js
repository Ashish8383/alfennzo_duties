import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

 const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  error,
  rightIcon,
  onRightIconPress,
  leftIcon,
  multiline,
  numberOfLines,
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputContainer, error && styles.inputError]}>

        {/* LEFT ICON */}
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLighter}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
        />

        {/* RIGHT ICON */}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: nzVertical(16),
    width: '100%',
  },

  label: {
    fontSize: rs(isTablet ? 15 : 14),
    fontWeight: '500',
    color: colors.text,
    marginBottom: nzVertical(6),
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: nz(12),
    backgroundColor: colors.surface,
    paddingHorizontal: nz(12),
    minHeight: nzVertical(52),
  },

  input: {
    flex: 1,
    fontSize: rs(15),
    color: colors.text,
    paddingVertical: nzVertical(12),
  },

  multilineInput: {
    textAlignVertical: 'top',
  },

  leftIcon: {
    marginRight: nz(8),
  },

  rightIcon: {
    marginLeft: nz(8),
  },

  inputError: {
    borderColor: colors.error,
  },

  errorText: {
    fontSize: rs(11),
    color: colors.error,
    marginTop: nzVertical(4),
    marginLeft: nz(4),
  },
});

export default Input;