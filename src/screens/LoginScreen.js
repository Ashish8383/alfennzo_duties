// src/screens/LoginScreen.js
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../components/Input';
import OTPVerificationModal from '../components/OTPVerificationModal';
import useAuthStore from '../stores/authStore';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';
import useToast from '../utils/useToast';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const { login, verifyOTP, resendOTP, isLoading, error, clearError, tempEmail: storeTempEmail } = useAuthStore();
  const toast = useToast();

  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password]);

  // Check if OTP modal should be shown
  useEffect(() => {
    if (storeTempEmail) {
      setTempEmail(storeTempEmail);
      setShowOTPModal(true);
    }
  }, [storeTempEmail]);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      toast.showError('Validation Error', 'Please check your inputs');
      return;
    }

    const result = await login(email, password);

    if (result?.requiresOTP) {
      // OTP modal will show automatically via useEffect
      toast.showSuccess('OTP Sent', result.message || 'Verification code sent to your email');
    } else if (result?.success) {
      toast.showSuccess('Welcome!', `Hello ${email.split('@')[0]}`);
    } else if (result?.error) {
      toast.showError('Login Failed', result.error);
    }
  };

  const handleVerifyOTP = async (otp) => {
    const success = await verifyOTP(otp);

    if (success) {
      toast.showSuccess('Success', 'Login successful!');
      setShowOTPModal(false);
      setTempEmail('');
      // Navigation will be handled by root navigator
    } else {
      toast.showError('Verification Failed', error || 'Invalid OTP');
    }
  };

  const handleResendOTP = async () => {
    const success = await resendOTP(tempEmail);

    if (success) {
      toast.showSuccess('OTP Sent', 'New verification code sent to your email');
    } else {
      toast.showError('Failed', error || 'Could not resend OTP');
    }
  };

  const handleCloseOTPModal = () => {
    setShowOTPModal(false);
    setTempEmail('');
    clearError();
  };

  const handleForgotPassword = () => {
    toast.showError('Coming Soon', 'Forgot password feature will be available soon');
  };

  // --- NEW: Function to open URLs ---
  const openLink = (url) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
      toast.showError('Error', 'Could not open the link');
    });
  };
  // ---------------------------------

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Image - waiter.jpeg */}
            <View style={styles.imageContainer}>
              <Image
                source={require('../assets/images/waiter.jpeg')}
                style={styles.topImage}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={colors.textLight} />
              }
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              error={errors.password}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />
              }
              rightIcon={
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textLight}
                />
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            {/* Forgot Password Row - REMOVED Remember Me */}
            <View style={styles.rowContainer}>
              <TouchableOpacity
                onPress={handleForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && !isLoading && !showOTPModal && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Terms Text - ADDED Links */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, I accept the{' '}
                <Text 
                  style={styles.termsLink} 
                  onPress={() => openLink('https://www.alfennzo.com/terms-and-conditions')}>
                  Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text 
                  style={styles.termsLink} 
                  onPress={() => openLink('https://www.alfennzo.com/privacy-policy')}>
                  Privacy Policy
                </Text>
              </Text>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <OTPVerificationModal
        visible={showOTPModal}
        email={tempEmail}
        onClose={handleCloseOTPModal}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        isLoading={isLoading}
        error={error}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: rs(30)
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: nz(24),
    paddingTop: nzVertical(10),
    paddingBottom: nzVertical(30),
  },
  imageContainer: {
    width: '100%',
    height: nzVertical(isTablet ? 240 : 200),
    marginBottom: nzVertical(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  topImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    marginBottom: nzVertical(28),
  },
  title: {
    fontSize: rs(isTablet ? 38 : 30),
    fontWeight: '700',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: rs(14),
    color: colors.textLight,
    marginTop: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  // --- UPDATED STYLES: Removed checkbox styles, kept only row and forgot text ---
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Aligns the Forgot Password to the right
    alignItems: 'center',
    marginTop: nzVertical(4),
    marginBottom: nzVertical(28),
    width: '100%',
  },
  forgotText: {
    fontSize: rs(13),
    color: colors.primary,
    fontWeight: '600',
  },
  // --------------------------------------------------------------------------
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: nz(8),
    paddingHorizontal: nz(12),
    paddingVertical: nzVertical(10),
    marginBottom: nzVertical(16),
    gap: nz(8),
  },
  errorText: {
    fontSize: rs(12),
    color: colors.error,
    flex: 1,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: nz(12),
    marginBottom: nzVertical(20),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
    shadowColor: '#0B735F',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
  },
  termsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: nz(12),
  },
  termsText: {
    fontSize: rs(isTablet ? 13 : 11),
    color: colors.textLighter,
    textAlign: 'center',
    lineHeight: nzVertical(18),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: nzVertical(20),
  },
});