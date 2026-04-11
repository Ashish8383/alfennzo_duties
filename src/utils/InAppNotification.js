// src/utils/InAppNotification.jsx
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    PixelRatio,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigateToHomeOngoingTab, navigateToHomePendingTab } from './navigationRef';
import { subscribeToNotifications } from './notificationService';

// ─── Responsive helpers (self-contained, no external import needed) ───────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BASE_W = 390; // iPhone 14 Pro reference width
const scale  = SCREEN_W / BASE_W;
const rz     = (size) => Math.round(PixelRatio.roundToNearestPixel(size * scale));
const rzV    = (size) => Math.round(PixelRatio.roundToNearestPixel(size * (SCREEN_H / 844)));
const rs     = (size) => Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scale, 1.3)));

const DISMISS_MS  = 4500;
const SLIDE_IN_MS = 360;
const SLIDE_OUT_MS = 260;

// ─── Theme per notification type ─────────────────────────────────────────────
function getTheme(type) {
  switch (type) {
    case 'success':
      return { icon: 'checkmark-circle-outline', accentColor: '#2E7D50', pillLabel: 'Ready' };
    case 'warning':
      return { icon: 'alert-circle-outline',     accentColor: '#E65100', pillLabel: 'Alert'  };
    case 'info':
      return { icon: 'information-circle-outline', accentColor: '#1565C0', pillLabel: 'Info' };
    case 'order':
    default:
      return { icon: 'receipt-outline',           accentColor: '#D4700A', pillLabel: 'New Order' };
  }
}

// ─── Single banner ────────────────────────────────────────────────────────────
function NotificationBanner({ notification, onDismiss }) {
  const insets     = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-rz(180))).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef(null);

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true,
        bounciness: 5, speed: 16,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: SLIDE_IN_MS,
        useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Drain progress bar
    Animated.timing(progress, {
      toValue: 0, duration: DISMISS_MS,
      useNativeDriver: false, easing: Easing.linear,
    }).start();

    // Auto-dismiss
    timerRef.current = setTimeout(() => slideOut(onDismiss), DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  const slideOut = useCallback((cb) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -rz(180), duration: SLIDE_OUT_MS,
        useNativeDriver: true, easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(opacity, {
        toValue: 0, duration: SLIDE_OUT_MS, useNativeDriver: true,
      }),
    ]).start(() => cb?.());
  }, []);

  const handleTap = () => {
    clearTimeout(timerRef.current);
    notification.tab === 1 ? navigateToHomeOngoingTab() : navigateToHomePendingTab();
    slideOut(onDismiss);
  };

  const handleClose = () => {
    clearTimeout(timerRef.current);
    slideOut(onDismiss);
  };

  const { icon, accentColor, pillLabel } = getTheme(notification.type);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  const bannerTop = (insets.top || 0) + rzV(10);

  return (
    <Animated.View style={[
      styles.banner,
      { top: bannerTop, opacity, transform: [{ translateY }] },
    ]}>
      {/* ── Tap area ── */}
      <TouchableOpacity activeOpacity={0.88} onPress={handleTap} style={styles.inner}>

        {/* Left colour bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={icon} size={rz(22)} color={accentColor} />
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {notification.title}
            </Text>
            <View style={[styles.pill, { backgroundColor: accentColor + '1A' }]}>
              <Text style={[styles.pillText, { color: accentColor }]}>{pillLabel}</Text>
            </View>
          </View>

          {/* Body */}
          <Text style={styles.bodyText} numberOfLines={2}>
            {notification.body}
          </Text>

          {/* Tap hint */}
          <Text style={styles.tapHint}>Tap to view →</Text>
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          hitSlop={{ top: rz(12), right: rz(12), bottom: rz(12), left: rz(12) }}
        >
          <Ionicons name="close" size={rz(15)} color="#BDBDBD" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Progress drain bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: accentColor }]} />
      </View>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InAppNotification() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    return subscribeToNotifications((payload) => {
      setQueue(prev => [...prev, payload]);
    });
  }, []);

  const dismiss = useCallback((id) => {
    setQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  if (queue.length === 0) return null;
  const current = queue[queue.length - 1]; // show only the newest

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <NotificationBanner
        key={current.id}
        notification={current}
        onDismiss={() => dismiss(current.id)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: rz(12),
    right: rz(12),
    backgroundColor: '#FFFFFF',
    borderRadius: rz(18),
    overflow: 'hidden',
    zIndex: 99999,
    // Shadow
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: rz(20),
    shadowOffset: { width: 0, height: rz(6) },
    elevation: 16,
    // Subtle border
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rz(14),
    paddingVertical: rzV(13),
    gap: rz(12),
  },
  accentBar: {
    width: rz(4),
    alignSelf: 'stretch',
    borderRadius: rz(4),
    minHeight: rzV(36),
    flexShrink: 0,
  },
  iconCircle: {
    width: rz(44),
    height: rz(44),
    borderRadius: rz(13),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: rzV(3),
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rz(7),
  },
  titleText: {
    fontSize: rs(14),
    fontWeight: '700',
    color: '#1A1A1A',
    flexShrink: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: 0.1,
  },
  pill: {
    paddingHorizontal: rz(8),
    paddingVertical: rzV(2),
    borderRadius: rz(20),
    flexShrink: 0,
  },
  pillText: {
    fontSize: rs(9),
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: rs(12),
    color: '#616161',
    lineHeight: rzV(17),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  tapHint: {
    fontSize: rs(10),
    color: '#C0C0C0',
    fontWeight: '500',
    marginTop: rzV(1),
  },
  closeBtn: {
    alignSelf: 'flex-start',
    paddingTop: rzV(2),
    flexShrink: 0,
  },
  progressTrack: {
    height: rzV(3),
    backgroundColor: '#F0F0F0',
  },
  progressFill: {
    height: rzV(3),
    borderRadius: rz(2),
  },
});