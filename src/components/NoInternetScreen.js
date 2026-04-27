import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

export default function NoInternetScreen() {
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const hideTimer = useRef(null);
  const wasOfflineRef = useRef(false);   // ✅ track if user actually went offline
  const isFirstCheckRef = useRef(true);  // ✅ skip the initial mount trigger

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;

      if (!connected) {
        // Going offline
        if (isFirstCheckRef.current) {
          // App opened while already offline — show screen but no banner later
          isFirstCheckRef.current = false;
        }
        wasOfflineRef.current = true;
        setIsConnected(false);
        setShowBanner(false);
        if (hideTimer.current) clearTimeout(hideTimer.current);
      } else {
        isFirstCheckRef.current = false;

        if (wasOfflineRef.current) {
          // ✅ Only show "Back online" if we were actually offline before
          setShowBanner(true);
          hideTimer.current = setTimeout(() => {
            setShowBanner(false);
          }, 3000);
        }

        wasOfflineRef.current = false;
        setIsConnected(true);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Animate banner slide in/out
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showBanner ? 0 : -(100 + insets.top),
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showBanner, insets.top]);

  // Offline full-screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

        <View style={styles.iconWrapper}>
          <View style={styles.wifiBase} />
          <View style={styles.wifiSlash} />
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          Please check your Wi-Fi or mobile data and try again.
        </Text>

        <View style={styles.dotsRow}>
          <PulseDot delay={0} />
          <PulseDot delay={300} />
          <PulseDot delay={600} />
        </View>
      </View>
    );
  }

  // Back online banner (only renders when showBanner is true)
  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + nzVertical(6), // ✅ push below status bar
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.bannerDot} />
      <Text style={styles.bannerText}>Back online</Text>
    </Animated.View>
  );
}

function PulseDot({ delay }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  // ── Full-screen offline view ──────────────────────────────
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: colors.white,        // ✅ white bg
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: nz(32),
  },
  iconWrapper: {
    width: nz(80),
    height: nz(80),
    borderRadius: nz(40),
    backgroundColor: colors.background,   // ✅ light grey circle
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: nzVertical(28),
  },
  wifiBase: {
    width: nz(36),
    height: nz(36),
    borderWidth: nz(4),
    borderColor: colors.primary,          // ✅ brand green
    borderRadius: nz(18),
    opacity: 0.4,
  },
  wifiSlash: {
    position: 'absolute',
    width: nz(50),
    height: nz(3),
    backgroundColor: colors.error,        // ✅ red slash
    borderRadius: nz(2),
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    fontSize: rs(22),
    fontWeight: '700',
    color: colors.text,                   // ✅ dark text on white bg
    marginBottom: nzVertical(12),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: rs(15),
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: nzVertical(22),
    marginBottom: nzVertical(40),
  },
  dotsRow: {
    flexDirection: 'row',
    gap: nz(10),
  },
  dot: {
    width: nz(10),
    height: nz(10),
    borderRadius: nz(5),
    backgroundColor: colors.primary,      // ✅ green dots
  },

  // ── "Back online" top banner ──────────────────────────────
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#327732',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: nzVertical(10),
    gap: nz(8),
  },
  bannerDot: {
    width: nz(8),
    height: nz(8),
    borderRadius: nz(4),
    backgroundColor: colors.white,
  },
  bannerText: {
    color: colors.white,
    fontSize: rs(14),
    fontWeight: '600',
  },
});