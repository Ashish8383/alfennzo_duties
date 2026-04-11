// src/components/GlobalPermissionModal.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    AppState,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { checkLocationPermission, checkNotificationPermission, requestLocationPermission, requestNotificationPermission } from '../utils/Permissions';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

const GlobalPermissionModal = ({ visible, onClose, onPermissionsGranted }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [permissions, setPermissions] = useState({
    location: false,
    notification: false,
  });
  const [loading, setLoading] = useState({
    location: false,
    notification: false,
  });

  // Check permissions status
  const checkPermissions = async () => {
    const locationStatus = await checkLocationPermission();
    const notificationStatus = await checkNotificationPermission();
    
    setPermissions({
      location: locationStatus,
      notification: notificationStatus,
    });

    // If both permissions are granted, close modal
    if (locationStatus && notificationStatus) {
      if (onPermissionsGranted) onPermissionsGranted();
      setTimeout(() => onClose(), 500);
    }
  };

  // Check permissions when modal becomes visible
  useEffect(() => {
    if (visible) {
      checkPermissions();
    }
  }, [visible]);

  // Listen for app state changes (when user returns from settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && visible) {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [visible]);

  // Animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleAllowLocation = async () => {
    setLoading(prev => ({ ...prev, location: true }));
    const granted = await requestLocationPermission();
    if (granted) {
      await checkPermissions();
    }
    setLoading(prev => ({ ...prev, location: false }));
  };

  const handleAllowNotification = async () => {
    setLoading(prev => ({ ...prev, notification: true }));
    const granted = await requestNotificationPermission();
    if (granted) {
      await checkPermissions();
    }
    setLoading(prev => ({ ...prev, notification: false }));
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // Don't show modal if both permissions are granted
  if (permissions.location && permissions.notification && visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY }] }
          ]}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.title}>Permissions Required</Text>
          <Text style={styles.description}>
            Please allow the following permissions to continue
          </Text>

          {/* Location Permission - Show only if not granted */}
          {!permissions.location && (
            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Ionicons name="location" size={24} color={colors.primary} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>Location Access</Text>
                <Text style={styles.permissionDesc}>
                  Track delivery routes & verify restaurant presence
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.allowButton}
                onPress={handleAllowLocation}
                disabled={loading.location}
              >
                <Text style={styles.allowButtonText}>
                  {loading.location ? '...' : 'Allow'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notification Permission - Show only if not granted */}
          {!permissions.notification && (
            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Ionicons name="notifications" size={24} color={colors.primary} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>Notification Access</Text>
                <Text style={styles.permissionDesc}>
                  Receive order updates & important alerts
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.allowButton}
                onPress={handleAllowNotification}
                disabled={loading.notification}
              >
                <Text style={styles.allowButtonText}>
                  {loading.notification ? '...' : 'Allow'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: nz(24),
    borderTopRightRadius: nz(24),
    padding: nz(24),
    paddingBottom: nzVertical(32),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: nzVertical(16),
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: rs(22),
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
    marginBottom: nzVertical(8),
  },
  description: {
    fontSize: rs(14),
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: nzVertical(24),
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: nz(12),
    padding: nz(12),
    marginBottom: nzVertical(12),
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(12),
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: rs(14),
    fontWeight: '600',
    color: colors.black,
    marginBottom: nzVertical(2),
  },
  permissionDesc: {
    fontSize: rs(11),
    color: colors.textLight,
  },
  allowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(6),
    borderRadius: nz(20),
  },
  allowButtonText: {
    color: colors.white,
    fontSize: rs(13),
    fontWeight: '600',
  },
  closeButton: {
    marginTop: nzVertical(16),
    alignItems: 'center',
    paddingVertical: nzVertical(10),
  },
  closeButtonText: {
    fontSize: rs(14),
    color: colors.primary,
    fontWeight: '600',
  },
});

export default GlobalPermissionModal;