// screens/ProfileScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Linking as RNLinking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../stores/authStore';
import colors from '../utils/colors';
import { checkLocationPermission, checkNotificationPermission } from '../utils/Permissions';
import { nz, nzVertical, rs } from '../utils/responsive';

const HEADER_BG = '#FFFFFF';
const TERMS_URL = 'https://www.alfennzo.com/qr/terms-condition';
const PRIVACY_URL = 'https://www.alfennzo.com/qr/privacy-policy';
const SUPPORT_PHONE = '+919319702754';
const SUPPORT_EMAIL = 'support@alfennzo.com';

const MENU_ITEMS = [
  { key: 'permissions', label: 'Permissions', icon: 'key-outline' },
  { key: 'shifts', label: 'Shift History', icon: 'time-outline' },
  { key: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
  { key: 'support', label: 'Contact Support', icon: 'chatbubble-ellipses-outline' },
  { key: 'terms', label: 'Terms & Conditions', icon: 'document-text-outline' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse DD/MM/YYYY to Date object */
const parseDOB = (dobString) => {
  if (!dobString) return new Date(2000, 0, 1);
  const parts = dobString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date(2000, 0, 1);
};

/** Normalise DD/MM/YYYY  ↔  display string */
const formatDOBDisplay = (raw) => {
  if (!raw) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/** Auto-insert slashes as user types DOB */
const maskDOB = (text) => {
  const digits = text.replace(/\D/g, '');
  let masked = '';
  for (let i = 0; i < Math.min(digits.length, 8); i++) {
    if (i === 2 || i === 4) masked += '/';
    masked += digits[i];
  }
  return masked;
};

/** Open URL in browser */
const openURL = async (url) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this link');
    }
  } catch (error) {
    Alert.alert('Error', 'Something went wrong');
  }
};

// ─── Edit Profile Popup Modal ─────────────────────────────────────────────────
function EditProfilePopup({ visible, user, onClose, onSave, isSaving }) {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setFullName(user?.fullName || user?.name || '');
      setDateOfBirth(formatDOBDisplay(user?.dateOfBirth));
      setPhone(user?.phone ? String(user.phone) : '');
      setErrors({});

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 8,
          speed: 14,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = 'Name is required';
    if (phone && !/^\d{10}$/.test(phone.trim())) e.phone = 'Enter a valid 10-digit number';
    if (dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth))
      e.dateOfBirth = 'Use DD/MM/YYYY format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  const handleConfirm = (selectedDate) => {
    setDatePickerVisibility(false);
    if (selectedDate) {
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const yyyy = selectedDate.getFullYear();
      setDateOfBirth(`${dd}/${mm}/${yyyy}`);
      setErrors((e) => ({ ...e, dateOfBirth: undefined }));
    }
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView
          style={popupStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />

          <Animated.View style={[popupStyles.popup, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={popupStyles.popupHeader}>
              <Text style={popupStyles.popupTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose} disabled={isSaving} style={popupStyles.closeBtn}>
                <Ionicons name="close" size={nz(22)} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={popupStyles.divider} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={popupStyles.scrollContent}
            >
              {/* Full Name */}
              <View style={popupStyles.fieldGroup}>
                <Text style={popupStyles.label}>Full Name <Text style={popupStyles.required}>*</Text></Text>
                <View style={[popupStyles.inputWrap, errors.fullName && popupStyles.inputError]}>
                  <Ionicons name="person-outline" size={nz(18)} color={colors.textLighter} style={popupStyles.inputIcon} />
                  <TextInput
                    style={popupStyles.input}
                    value={fullName}
                    onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: undefined })); }}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textLighter}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {errors.fullName && <Text style={popupStyles.errorText}>{errors.fullName}</Text>}
              </View>

              {/* Date of Birth */}
              <View style={popupStyles.fieldGroup}>
                <Text style={popupStyles.label}>Date of Birth</Text>
                <View style={[popupStyles.inputWrap, errors.dateOfBirth && popupStyles.inputError]}>
                  <TouchableOpacity onPress={() => setDatePickerVisibility(true)} style={popupStyles.calendarIconBtn}>
                    <Ionicons name="calendar-outline" size={nz(18)} color={colors.textLighter} />
                  </TouchableOpacity>
                  <TextInput
                    style={popupStyles.input}
                    value={dateOfBirth}
                    onChangeText={(t) => {
                      setDateOfBirth(maskDOB(t));
                      setErrors((e) => ({ ...e, dateOfBirth: undefined }));
                    }}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.textLighter}
                    keyboardType="numeric"
                    maxLength={10}
                    returnKeyType="next"
                  />
                  {dateOfBirth.length > 0 && (
                    <TouchableOpacity onPress={() => setDateOfBirth('')} style={popupStyles.clearIconBtn}>
                      <Ionicons name="close-circle" size={nz(16)} color={colors.textLighter} />
                    </TouchableOpacity>
                  )}
                </View>
                {errors.dateOfBirth
                  ? <Text style={popupStyles.errorText}>{errors.dateOfBirth}</Text>
                  : <Text style={popupStyles.hint}>Optional — format: DD/MM/YYYY</Text>}
              </View>

              {/* Phone */}
              <View style={popupStyles.fieldGroup}>
                <Text style={popupStyles.label}>Phone Number</Text>
                <View style={[popupStyles.inputWrap, errors.phone && popupStyles.inputError]}>
                  <Ionicons name="call-outline" size={nz(18)} color={colors.textLighter} style={popupStyles.inputIcon} />
                  <TextInput
                    style={popupStyles.input}
                    value={phone}
                    onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setErrors((e) => ({ ...e, phone: undefined })); }}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textLighter}
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>
                {errors.phone && <Text style={popupStyles.errorText}>{errors.phone}</Text>}
              </View>
            </ScrollView>

            <View style={popupStyles.btnRow}>
              <TouchableOpacity style={popupStyles.cancelBtn} onPress={onClose} disabled={isSaving} activeOpacity={0.7}>
                <Text style={popupStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[popupStyles.saveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={popupStyles.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Date Picker Modal */}
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            date={dateOfBirth ? parseDOB(dateOfBirth) : new Date(2000, 0, 1)}
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Contact Support Modal ────────────────────────────────────────────────────
function ContactSupportModal({ visible, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 8,
          speed: 14,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleCall = () => {
    const phoneUrl = `tel:${SUPPORT_PHONE}`;
    RNLinking.openURL(phoneUrl).catch(() => {
      Alert.alert('Error', 'Unable to make call');
    });
  };

  const handleEmail = () => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}`;
    RNLinking.openURL(emailUrl).catch(() => {
      Alert.alert('Error', 'Unable to open email');
    });
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `whatsapp://send?phone=${SUPPORT_PHONE.replace('+', '')}`;
    RNLinking.openURL(whatsappUrl).catch(() => {
      Alert.alert('WhatsApp not installed', 'Would you like to call instead?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: handleCall },
      ]);
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={contactStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        
        <Animated.View style={[contactStyles.modal, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={contactStyles.header}>
            <Text style={contactStyles.title}>Contact Support</Text>
            <TouchableOpacity onPress={onClose} style={contactStyles.closeBtn}>
              <Ionicons name="close" size={nz(22)} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={contactStyles.divider} />

          <View style={contactStyles.content}>
            <Text style={contactStyles.subtitle}>How would you like to reach us?</Text>

            <TouchableOpacity style={contactStyles.option} onPress={handleCall} activeOpacity={0.7}>
              <View style={[contactStyles.optionIcon, { backgroundColor: '#4CD964' }]}>
                <Ionicons name="call" size={nz(22)} color={colors.white} />
              </View>
              <View style={contactStyles.optionContent}>
                <Text style={contactStyles.optionTitle}>Call Us</Text>
                <Text style={contactStyles.optionSubtitle}>{SUPPORT_PHONE}</Text>
              </View>
              <Ionicons name="chevron-forward" size={nz(18)} color={colors.textLighter} />
            </TouchableOpacity>

            <TouchableOpacity style={contactStyles.option} onPress={handleWhatsApp} activeOpacity={0.7}>
              <View style={[contactStyles.optionIcon, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={nz(22)} color={colors.white} />
              </View>
              <View style={contactStyles.optionContent}>
                <Text style={contactStyles.optionTitle}>WhatsApp</Text>
                <Text style={contactStyles.optionSubtitle}>Chat with us on WhatsApp</Text>
              </View>
              <Ionicons name="chevron-forward" size={nz(18)} color={colors.textLighter} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({ item, onPress, isLast }) {
  return (
    <>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.55}>
        <View style={styles.menuLeft}>
          <View style={styles.menuIconWrap}>
            <Ionicons name={item.icon} size={nz(20)} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>{item.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={nz(18)} color={colors.textLighter} />
      </TouchableOpacity>
      {!isLast && <View style={styles.menuDivider} />}
    </>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, fetchProfile, updateUserProfile } = useAuthStore();
  const navigation = useNavigation();

  const [profileLoading, setProfileLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ location: false, notification: false });

  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setProfileLoading(true);
    await fetchProfile();
    setProfileLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
      const unsubscribe = navigation.addListener('permissionsUpdated', checkPermissions);
      return unsubscribe;
    }, [navigation])
  );

  const checkPermissions = async () => {
    const locationStatus = await checkLocationPermission();
    const notificationStatus = await checkNotificationPermission();
    setPermissionStatus({ location: locationStatus, notification: notificationStatus });
  };

  const handleSaveProfile = async (data) => {
    setIsSaving(true);
    const result = await updateUserProfile(data);
    setIsSaving(false);
    if (result?.success) {
      setEditModalVisible(false);
      Alert.alert('Success', result.message || 'Profile updated successfully');
    } else {
      Alert.alert('Update Failed', result?.error || 'Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          const result = await logout();
          if (result?.blocked) {
            Alert.alert(
              'Cannot Logout',
              result.message,
              [{ text: 'OK', style: 'destructive' }]
            );
          }
        },
      },
    ]);
  };

  const handleMenuItemPress = (itemKey) => {
    switch (itemKey) {
      case 'shifts':
        navigation.navigate('ShiftHistory');
        break;
      case 'permissions':
        navigation.navigate('PermissionStatus');
        break;
      case 'privacy':
        openURL(PRIVACY_URL);
        break;
      case 'support':
        setContactModalVisible(true);
        break;
      case 'terms':
        openURL(TERMS_URL);
        break;
      default:
        break;
    }
  };

  const displayName = user?.fullName || user?.name || 'Waiter';
  const phoneNumber = user?.phone ? String(user.phone) : '—';
  const hasMissing = !permissionStatus.location || !permissionStatus.notification;

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor={HEADER_BG} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: HEADER_BG }]} edges={['top', 'left', 'right']}>

        <View style={[styles.header, { backgroundColor: HEADER_BG }]}>
          <Text style={styles.headerTitle}>Profile</Text>
          {profileLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.headerLoader} />
          )}
        </View>

        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) }]}
            showsVerticalScrollIndicator={false}
          >
            {hasMissing && (
              <TouchableOpacity style={styles.warningBanner} onPress={() => navigation.navigate('PermissionStatus')}>
                <Ionicons name="warning" size={20} color={colors.warning} />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Permissions Required</Text>
                  <Text style={styles.warningMessage}>
                    {!permissionStatus.location && !permissionStatus.notification
                      ? 'Location & Notification access needed'
                      : !permissionStatus.location
                        ? 'Location access needed'
                        : 'Notification access needed'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}

            <View style={styles.avatarCard}>
              <View style={styles.avatarCircle}>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </View>

              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName} numberOfLines={1}>{displayName}</Text>
                {user?.email ? (
                  <View style={[styles.phoneRow, { marginTop: nzVertical(2) }]}>
                    <Ionicons name="mail-outline" size={nz(14)} color={colors.textLight} style={{ marginRight: nz(4) }} />
                    <Text style={styles.avatarPhone} numberOfLines={1}>{user.email}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.editIconBtn}
                onPress={() => setEditModalVisible(true)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <View style={styles.editIconWrap}>
                  <Ionicons name="pencil" size={nz(15)} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.menuCard}>
              {MENU_ITEMS.map((item, idx) => (
                <MenuItem
                  key={item.key}
                  item={item}
                  onPress={() => handleMenuItemPress(item.key)}
                  isLast={idx === MENU_ITEMS.length - 1}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
              <View style={styles.logoutIconWrap}>
                <Ionicons name="log-out-outline" size={nz(20)} color="#E53935" />
              </View>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>

      <EditProfilePopup
        visible={editModalVisible}
        user={user}
        onClose={() => !isSaving && setEditModalVisible(false)}
        onSave={handleSaveProfile}
        isSaving={isSaving}
      />

      <ContactSupportModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
      />
    </>
  );
}

// ─── Contact Support Modal Styles ─────────────────────────────────────────────
const contactStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(20),
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: nz(20),
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(20),
    paddingBottom: nzVertical(12),
  },
  title: {
    fontSize: rs(18),
    fontWeight: '700',
    color: colors.black,
  },
  closeBtn: {
    padding: nz(4),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: nzVertical(16),
    marginHorizontal: nz(20),
  },
  content: {
    paddingHorizontal: nz(20),
    paddingBottom: nzVertical(20),
  },
  subtitle: {
    fontSize: rs(14),
    color: colors.textLight,
    marginBottom: nzVertical(20),
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nzVertical(12),
    paddingHorizontal: nz(12),
    backgroundColor: '#F8F9FA',
    borderRadius: nz(12),
    marginBottom: nzVertical(10),
  },
  optionIcon: {
    width: nz(44),
    height: nz(44),
    borderRadius: nz(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(12),
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: rs(15),
    fontWeight: '600',
    color: colors.black,
    marginBottom: nzVertical(2),
  },
  optionSubtitle: {
    fontSize: rs(12),
    color: colors.textLight,
  },
});

// ─── Popup Modal Styles ───────────────────────────────────────────────────────
const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(20),
  },
  popup: {
    backgroundColor: colors.white,
    borderRadius: nz(20),
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(20),
    paddingBottom: nzVertical(12),
  },
  popupTitle: {
    fontSize: rs(18),
    fontWeight: '700',
    color: colors.black,
  },
  closeBtn: {
    padding: nz(4),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: nzVertical(16),
    marginHorizontal: nz(20),
  },
  scrollContent: {
    paddingHorizontal: nz(20),
    paddingBottom: nzVertical(20),
  },
  fieldGroup: {
    marginBottom: nzVertical(18),
  },
  label: {
    fontSize: rs(13),
    fontWeight: '600',
    color: colors.text,
    marginBottom: nzVertical(8),
  },
  required: {
    color: '#E53935',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(12),
    paddingHorizontal: nz(12),
    height: nzVertical(50),
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: '#E53935',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: nz(10),
  },
  calendarIconBtn: {
    marginRight: nz(10),
    padding: nz(4),
  },
  clearIconBtn: {
    padding: nz(4),
  },
  input: {
    flex: 1,
    fontSize: rs(14),
    color: colors.black,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: rs(11),
    color: '#E53935',
    marginTop: nzVertical(4),
    marginLeft: nz(2),
  },
  hint: {
    fontSize: rs(11),
    color: colors.textLighter,
    marginTop: nzVertical(4),
    marginLeft: nz(2),
  },
  btnRow: {
    flexDirection: 'row',
    gap: nz(12),
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(8),
    paddingBottom: nzVertical(20),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: nz(12),
    paddingVertical: nzVertical(14),
    alignItems: 'center',
  },
  cancelText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.textLight,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: nz(12),
    paddingVertical: nzVertical(14),
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveText: {
    fontSize: rs(14),
    fontWeight: '700',
    color: colors.white,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingTop: nzVertical(8),
    paddingBottom: nzVertical(14),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: rs(18),
    fontWeight: '700',
    color: colors.black,
  },
  headerLoader: {
    position: 'absolute',
    right: nz(16),
  },
  body: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: nz(16),
    paddingTop: nzVertical(20),
    gap: nzVertical(14),
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (colors.warning || '#FB8C00') + '20',
    padding: nz(12),
    borderRadius: nz(12),
    gap: nz(12),
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.warning || '#FB8C00',
    marginBottom: nzVertical(2),
  },
  warningMessage: { fontSize: rs(12), color: colors.textLight },
  avatarCard: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    padding: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: nz(62),
    height: nz(62),
    borderRadius: nz(31),
    backgroundColor: '#F5A623',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: nz(14),
  },
  avatarHead: {
    width: nz(24), height: nz(24), borderRadius: nz(12),
    backgroundColor: '#5C3D11', marginBottom: nz(2),
  },
  avatarBody: {
    width: nz(40), height: nz(28), borderRadius: nz(20),
    backgroundColor: '#5C3D11',
  },
  avatarInfo: { flex: 1 },
  avatarName: {
    fontSize: rs(17),
    fontWeight: '700',
    color: colors.black,
    marginBottom: nzVertical(4),
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPhone: { fontSize: rs(13), color: colors.textLight },
  editIconBtn: { marginLeft: nz(8) },
  editIconWrap: {
    width: nz(34),
    height: nz(34),
    borderRadius: nz(17),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  statsRow: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nzVertical(16),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: rs(15), fontWeight: '700', color: colors.black, marginBottom: nzVertical(2) },
  statLabel: { fontSize: rs(11), color: colors.textLighter },
  statDivider: { width: 1, height: nzVertical(32), backgroundColor: colors.border },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    paddingHorizontal: nz(16),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(15),
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: nz(12) },
  menuIconWrap: {
    width: nz(36), height: nz(36), borderRadius: nz(10),
    backgroundColor: colors.primary + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: rs(14), color: colors.black, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: nz(48) },
  logoutBtn: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    padding: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(12),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: nzVertical(20),
  },
  logoutIconWrap: {
    width: nz(36), height: nz(36), borderRadius: nz(10),
    backgroundColor: '#FFEBEE',
    justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { fontSize: rs(15), fontWeight: '700', color: '#E53935' },
});