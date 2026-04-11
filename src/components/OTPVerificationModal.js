// src/components/OTPVerificationModal.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Keyboard,
    Modal,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import {
    CodeField,
    Cursor,
    useBlurOnFulfill,
    useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

export default function OTPVerificationModal({
  visible,
  email,
  onVerify,
  isLoading,
  error
}) {
  const CELL_COUNT = 6;

  const [value, setValue] = useState('');
  const isVerifyingRef = useRef(false);

  // 🔥 SHAKE
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  // 🔁 Reset
  useEffect(() => {
    if (visible) {
      setValue('');
      isVerifyingRef.current = false;
    }
  }, [visible]);

  // 🔥 AUTO VERIFY
  useEffect(() => {
    if (value.length === 6 && !isVerifyingRef.current) {
      isVerifyingRef.current = true;
      Keyboard.dismiss();
      onVerify(value);
    }
  }, [value]);

  // ❌ ERROR → SHAKE + RESET
  useEffect(() => {
    if (error) {
      triggerShake();
      setValue('');
      isVerifyingRef.current = false;
    }
  }, [error]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onShow={() => {
        setTimeout(() => {
          ref.current?.focus();
        }, 300);
      }}
    >
      <TouchableWithoutFeedback>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>

                {/* Icon */}
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={50} color={colors.primary} />
                </View>

                {/* Text */}
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the code sent to
                </Text>
                <Text style={styles.emailText}>{email}</Text>

                {/* OTP FIELD */}
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                  <CodeField
                    ref={ref}
                    {...props}
                    value={value}
                    onChangeText={setValue}
                    cellCount={CELL_COUNT}
                    rootStyle={styles.codeFieldRoot}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    renderCell={({ index, symbol, isFocused }) => (
                      <View
                        key={index}
                        style={[
                          styles.cell,
                          isFocused && styles.focusCell,
                          error && styles.errorCell
                        ]}
                        onLayout={getCellOnLayoutHandler(index)}
                      >
                        <Text style={styles.cellText}>
                          {symbol || (isFocused ? <Cursor /> : null)}
                        </Text>
                      </View>
                    )}
                  />
                </Animated.View>

                {/* Loading */}
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Verifying...</Text>
                  </View>
                )}

              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: nz(20),
  },
  modalContent: {
    padding: nz(24),
    alignItems: 'center',
  },
  iconContainer: {
    width: nz(80),
    height: nz(80),
    borderRadius: nz(40),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(16),
  },
  title: {
    fontSize: rs(22),
    fontWeight: '700',
    color: colors.black,
  },
  subtitle: {
    fontSize: rs(14),
    color: colors.textLight,
    marginTop: 5,
  },
  emailText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: nzVertical(20),
  },
  codeFieldRoot: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    width: nz(45),
    height: nz(55),
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCell: {
    borderColor: colors.primary,
  },
  errorCell: {
    borderColor: 'red',
  },
  cellText: {
    fontSize: rs(20),
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nzVertical(15),
  },
  loadingText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '600',
  },
});