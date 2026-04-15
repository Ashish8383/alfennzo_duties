// src/screens/ForgotPasswordScreen.js
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../components/Input';
import useAuthStore from '../stores/authStore';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';
import useToast from '../utils/useToast';

// ─── OTP Input (react-native-confirmation-code-field) ─────────────────────────
const OTP_LENGTH = 6;

function OTPInput({ value, onChange }) {
  const ref = useBlurOnFulfill({ value, cellCount: OTP_LENGTH });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({ value, setValue: onChange });

  return (
    <CodeField
      ref={ref}
      {...props}
      value={value}
      onChangeText={onChange}
      cellCount={OTP_LENGTH}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      autoFocus
      renderCell={({ index, symbol, isFocused }) => (
        <View
          key={index}
          style={[otpSt.box, !!symbol && otpSt.boxFilled, isFocused && otpSt.boxFocused]}
          onLayout={getCellOnLayoutHandler(index)}
        >
          <Text style={otpSt.digit}>
            {symbol || (isFocused ? <Cursor /> : null)}
          </Text>
        </View>
      )}
    />
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <View style={styles.stepRow}>
      {[1, 2].map(s => (
        <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen({ navigation }) {
  const [step,        setStep]        = useState(1);        // 1 = email, 2 = otp + new password
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});
  const [isLoading,   setIsLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const { forgotPassword, verifyForgotOTP } = useAuthStore();
  const toast = useToast();

  // ── Countdown timer for resend ──
  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Step 1 validation ──
  const validateEmail = () => {
    const e = {};
    if (!email.trim())               e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Please enter a valid email';
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ── Step 2 validation ──
  const validateReset = () => {
    const e = {};
    if (otp.length !== 6)              e.otp = 'Enter the 6-digit OTP';
    if (!newPassword)                  e.newPassword = 'Password is required';
    else if (newPassword.length < 6)   e.newPassword = 'At least 6 characters';
    else if (!/[A-Z]/.test(newPassword)) e.newPassword = 'Must include an uppercase letter';
    else if (!/[0-9]/.test(newPassword)) e.newPassword = 'Must include a number';
    if (newPassword !== confirmPass)   e.confirmPass = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ── Send OTP ──
  const handleSendOTP = async () => {
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      if (result?.success) {
        toast.showSuccess('OTP Sent', 'Check your email for the verification code');
        setStep(2);
        startCooldown();
      } else {
        toast.showError('Failed', result?.error || 'Could not send OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      if (result?.success) {
        toast.showSuccess('OTP Resent', 'A new code was sent to your email');
        setOtp('');
        startCooldown();
      } else {
        toast.showError('Failed', result?.error || 'Could not resend OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify OTP + reset ──
  const handleReset = async () => {
    if (!validateReset()) return;
    setIsLoading(true);
    try {
      const result = await verifyForgotOTP(email.trim().toLowerCase(), otp, newPassword);
      if (result?.success) {
        toast.showSuccess('Password Reset!', 'You can now log in with your new password');
        navigation.replace('Login');
      } else {
        toast.showError('Failed', result?.error || 'Invalid OTP or request expired');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={nz(22)} color={colors.black} />
            </TouchableOpacity>

            {/* Image */}
            <View style={styles.imageContainer}>
              <Image
                source={require('../assets/images/password.png')}
                style={styles.topImage}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {step === 1 ? 'Forgot Password?' : 'Reset Password'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? 'Enter your email and we\'ll send you a verification code'
                  : `Enter the OTP sent to ${email}`}
              </Text>
            </View>

            {/* Step dots */}
            <StepDots step={step} />

            {/* ── STEP 1: Email ── */}
            {step === 1 && (
              <>
                <Input
                  label="Email Address"
                  value={email}
                  onChangeText={v => { setEmail(v); setErrors({}); }}
                  placeholder="Enter your email"
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textLight} />}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleSendOTP}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator color={colors.white} size="small" />
                    : <Text style={styles.primaryBtnText}>Send OTP</Text>}
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 2: OTP + New Password ── */}
            {step === 2 && (
              <>
                {/* OTP boxes */}
                <View style={styles.otpSection}>
                  <Text style={styles.fieldLabel}>Verification Code</Text>
                  <OTPInput value={otp} onChange={setOtp} />
                  {errors.otp ? <Text style={styles.fieldError}>{errors.otp}</Text> : null}
                </View>

                {/* Resend row */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendHint}>Didn't receive the code? </Text>
                  <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || isLoading} activeOpacity={0.7}>
                    <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* New password */}
                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); setErrors(e => ({ ...e, newPassword: undefined })); }}
                  placeholder="Enter new password"
                  secureTextEntry={!showNew}
                  error={errors.newPassword}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />}
                  rightIcon={<Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textLight} />}
                  onRightIconPress={() => setShowNew(v => !v)}
                />

                {/* Confirm password */}
                <Input
                  label="Confirm Password"
                  value={confirmPass}
                  onChangeText={v => { setConfirmPass(v); setErrors(e => ({ ...e, confirmPass: undefined })); }}
                  placeholder="Re-enter new password"
                  secureTextEntry={!showConfirm}
                  error={errors.confirmPass}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />}
                  rightIcon={<Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textLight} />}
                  onRightIconPress={() => setShowConfirm(v => !v)}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleReset}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator color={colors.white} size="small" />
                    : <Text style={styles.primaryBtnText}>Reset Password</Text>}
                </TouchableOpacity>
              </>
            )}

            {/* Back to login */}
            <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.replace('Login')} activeOpacity={0.7}>
              <Ionicons name="arrow-back-outline" size={nz(14)} color={colors.primary} />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>

            <View style={{ height: nzVertical(24) }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ─── OTP cell styles ──────────────────────────────────────────────────────────
const otpSt = StyleSheet.create({
  box: {
    width: nz(44),
    height: nz(52),
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(10),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  boxFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '08',
  },
  digit: {
    fontSize: rs(22),
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.white },
  flex:          { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: nz(24),
    paddingTop: nzVertical(10),
    paddingBottom: nzVertical(30),
  },

  backBtn: {
    width: nz(40),
    height: nz(40),
    borderRadius: nz(20),
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(8),
  },

  imageContainer: {
    width: '100%',
    height: nzVertical(isTablet ? 220 : 180),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nzVertical(16),
  },
  topImage: { width: '100%', height: '100%' },

  titleContainer: { marginBottom: nzVertical(8) },
  title: {
    fontSize: rs(isTablet ? 36 : 28),
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  subtitle: {
    fontSize: rs(13),
    color: colors.textLight,
    marginTop: nzVertical(6),
    lineHeight: nzVertical(20),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Step dots
  stepRow:        { flexDirection: 'row', gap: nz(6), marginVertical: nzVertical(16) },
  stepDot:        { width: nz(24), height: nz(4), borderRadius: nz(2), backgroundColor: '#E0E0E0' },
  stepDotActive:  { backgroundColor: colors.primary, width: nz(40) },

  // OTP section
  otpSection:  { marginBottom: nzVertical(4) },
  fieldLabel:  { fontSize: rs(12), fontWeight: '600', color: colors.textLight, marginBottom: nzVertical(8) },
  fieldError:  { fontSize: rs(11), color: colors.error, marginTop: nzVertical(4), marginLeft: nz(4) },

  // Resend
  resendRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: nzVertical(20) },
  resendHint:        { fontSize: rs(12), color: colors.textLight },
  resendLink:        { fontSize: rs(12), color: colors.primary, fontWeight: '700' },
  resendLinkDisabled:{ color: colors.textLighter },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: nz(12),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
    marginTop: nzVertical(8),
    marginBottom: nzVertical(20),
    shadowColor: '#0B735F',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Back to login
  backToLogin:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(6) },
  backToLoginText: { fontSize: rs(13), color: colors.primary, fontWeight: '600' },
});