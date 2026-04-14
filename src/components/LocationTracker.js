// src/components/GlobalLocationTracker.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    AppState,
    Linking,
    Modal,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { checkDeviceLocationEnabled } from '../utils/Permissions';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

const GlobalLocationTracker = ({ children }) => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Check device location status
  const checkLocationStatus = async () => {
    const enabled = await checkDeviceLocationEnabled();
    setIsLocationEnabled(enabled);
    
    if (!enabled) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkLocationStatus();

    // Check every 3 seconds for location status change
    const interval = setInterval(() => {
      checkLocationStatus();
    }, 3000);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkLocationStatus();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // Animation
  useEffect(() => {
    if (showModal) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [showModal]);

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <>
      {children}
      
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowModal(false)}
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
                <Ionicons name="location-off" size={40} color={colors.error} />
              </View>
            </View>

            <Text style={styles.title}>Location Services Disabled</Text>
            <Text style={styles.description}>
              Your device location is turned off. Please enable location to continue tracking deliveries and verify your presence at restaurants.
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </>
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
    backgroundColor: colors.error + '15',
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
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: nzVertical(14),
    borderRadius: nz(12),
    gap: nz(8),
  },
  settingsButtonText: {
    color: colors.white,
    fontSize: rs(16),
    fontWeight: '600',
  },
  closeButton: {
    marginTop: nzVertical(12),
    alignItems: 'center',
    paddingVertical: nzVertical(10),
  },
  closeButtonText: {
    fontSize: rs(14),
    color: colors.textLight,
  },
});

export default GlobalLocationTracker;