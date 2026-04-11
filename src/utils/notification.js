// src/utils/notifications.js
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { navigate } from './navigationRef';
import { showInAppNotification } from './notificationService';

let soundInstance = null;

// ─── Permission helpers ───────────────────────────────────────────────────────
const isNotificationPermitted = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

const resetBadgeCount = async () => {
  try {
    await Notifications.setBadgeCountAsync(0);
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Failed to reset badge:', error);
  }
};

export const requestNotificationPermissions = async () => {
  try {
    if (!Device.isDevice) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
    });

    return status === 'granted';
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

// ─── Sound ────────────────────────────────────────────────────────────────────
export const playCustomSound = async () => {
  const permitted = await isNotificationPermitted();
  if (!permitted) return;

  try {
    if (soundInstance) {
      await soundInstance.stopAsync();
      await soundInstance.unloadAsync();
      soundInstance = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/notification.mp3'),
      { shouldPlay: false, volume: 1.0 }
    );

    soundInstance = sound;
    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        soundInstance = null;
      }
    });
  } catch (error) {
    console.error('Play sound error:', error);
  }
};

// ─── Notification handler (must stay synchronous — no async calls inside) ────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,  // suppressed — InAppNotification takes over
    shouldShowList:   true,   // still appears in tray when backgrounded
    shouldPlaySound:  false,  // suppressed — GlobalOrderSound loop covers this
    shouldSetBadge:   true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// ─── Channel setup (Android) ──────────────────────────────────────────────────
export const setupNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.deleteNotificationChannelAsync('high_importance_channel').catch(() => {});
    await Notifications.deleteNotificationChannelAsync('order_notifications').catch(() => {});
    await Notifications.deleteNotificationChannelAsync('urgent_notifications').catch(() => {});

    await Notifications.setNotificationChannelAsync('high_importance_channel', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'notification.mp3',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8C42',
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('order_notifications', {
      name: 'Order Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'notification.mp3',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8C42',
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('urgent_notifications', {
      name: 'Urgent Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'notification.mp3',
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#FF0000',
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    console.error('Channel setup error:', error);
  }
};

// ─── FCM token ────────────────────────────────────────────────────────────────
export const getFCMToken = async () => {
  try {
    if (!Device.isDevice) return null;
    const permitted = await isNotificationPermitted();
    if (!permitted) return null;
    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log('FCM Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('FCM token error:', error);
    return null;
  }
};

// ─── Event types that route to the Ongoing Order tab ─────────────────────────
// Add any future event types here that should open tab 1 (Ongoing).
const ONGOING_TAB_EVENTS = new Set([
  'ORDER_READY_FOR_DELIVERY',
  'ORDER_DELIVERED_CONFIRMED',
  'WAITER_ACCEPTED',
]);

// ─── Parse FCM payload → InAppNotification shape ─────────────────────────────
//
// FCM payload your backend should send:
// {
//   notification: { title: "Order Ready!", body: "Table 4 order is ready to deliver." },
//   data: { eventType: "ORDER_READY_FOR_DELIVERY" }
// }
//
// Tab routing:
//   ORDER_READY_FOR_DELIVERY  → tab 1 (Ongoing Order)
//   WAITER_ACCEPTED           → tab 1 (Ongoing Order)
//   ORDER_DELIVERED_CONFIRMED → tab 1 (Ongoing Order)
//   anything else             → tab 0 (Pending Order)
//
// Banner accent:
//   ORDER_READY_FOR_DELIVERY  → 'success' (green)
//   anything else             → 'order'   (amber)
//
function parseNotificationPayload(notification) {
  const content   = notification?.request?.content ?? {};
  const data      = content.data ?? {};

  const title     = content.title || data.title || 'New Notification';
  const body      = content.body  || data.body  || '';

  // Accept eventType from data.eventType OR legacy data.type
  const eventType = data.eventType || data.type || '';

  // Route to Ongoing tab for delivery-related events, Pending tab for everything else
  const tab = ONGOING_TAB_EVENTS.has(eventType) ? 1 : 0;

  // Banner accent colour
  const type = eventType === 'ORDER_READY_FOR_DELIVERY' ? 'success' : 'order';

  console.log('[FCM] eventType:', eventType, '→ tab:', tab, 'type:', type);

  return { title, body, type, tab };
}

// ─── FCM → InAppNotification bridge ──────────────────────────────────────────
let foregroundListener = null;
let tapListener        = null;

/**
 * Call ONCE in App.js useEffect.
 * Returns a cleanup function.
 */
export const setupInAppNotificationListeners = () => {
  // ── Foreground: app is open, notification arrives ────────────────────────
  foregroundListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[FCM] 🔔 Foreground notification received');
    console.log('[FCM] content:', JSON.stringify(notification.request.content, null, 2));

    const payload = parseNotificationPayload(notification);
    showInAppNotification(payload); // → InAppNotification banner
  });

  // ── Tap: user taps OS notification (background / killed state) ───────────
  tapListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[FCM] 👆 Notification tapped');

    const { tab } = parseNotificationPayload(response.notification);

    // Navigate to Home and open the correct tab
    navigate('Home', { initialTab: tab });
    resetBadgeCount();
  });

  return () => {
    foregroundListener?.remove();
    tapListener?.remove();
    foregroundListener = null;
    tapListener        = null;
  };
};

// ─── Badge management ─────────────────────────────────────────────────────────
let appStateSubscription  = null;
let badgeResponseListener = null;

export const setupBadgeManagement = () => {
  resetBadgeCount();

  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') resetBadgeCount();
  });

  badgeResponseListener = Notifications.addNotificationResponseReceivedListener(() => {
    resetBadgeCount();
  });
};

export const cleanupBadgeManagement = () => {
  if (appStateSubscription)  { appStateSubscription.remove();  appStateSubscription  = null; }
  if (badgeResponseListener) { badgeResponseListener.remove(); badgeResponseListener = null; }
};

export const initBadgeManagement = () => {
  setupBadgeManagement();
  return cleanupBadgeManagement;
};

// ─── Legacy exports ───────────────────────────────────────────────────────────
export const addNotificationListener = (callback) =>
  Notifications.addNotificationReceivedListener(callback);

export const addNotificationResponseListener = (callback) =>
  Notifications.addNotificationResponseReceivedListener(callback);