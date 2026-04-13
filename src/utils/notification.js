import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { navigate } from './navigationRef';
import { showInAppNotification } from './notificationService';

let soundInstance = null;

// ─── Permissions ──────────────────────────────────────────────────────────────
export const requestNotificationPermissions = async () => {
  try {
    const messaging  = getMessaging();
    const authStatus = await requestPermission(messaging, {
      alert: true, badge: true, sound: true, criticalAlert: true,
    });

    const firebaseGranted =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true, allowCriticalAlerts: true },
    });

    return firebaseGranted && status === 'granted';
  } catch (error) {
    console.error('[Permissions] Error:', error);
    return false;
  }
};

// ─── Android channels — must match backend channelId values exactly ───────────
export const setupNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    const channelConfig = {
      importance:          Notifications.AndroidImportance.MAX,
      sound:               'notification', // matches res/raw/notification.mp3
      enableVibrate:       true,
      enableLights:        true,
      bypassDnd:           true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    };

    await Promise.all([
      Notifications.setNotificationChannelAsync('high_importance_channel', {
        ...channelConfig,
        name:             'Default Notifications',
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#FF8C42',
      }),
      Notifications.setNotificationChannelAsync('order_notifications', {
        ...channelConfig,
        name:             'Order Notifications',
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#FF8C42',
      }),
      Notifications.setNotificationChannelAsync('urgent_notifications', {
        ...channelConfig,
        name:             'Urgent Notifications',
        vibrationPattern: [0, 500, 500, 500],
        lightColor:       '#FF0000',
      }),
    ]);

    console.log('✅ Notification channels ready');
  } catch (error) {
    console.error('[Channel] Error:', error);
  }
};

// ─── FCM Token ────────────────────────────────────────────────────────────────
export const getFCMToken = async () => {
  try {
    const token = await getToken(getMessaging());
    console.log('[FCM] Token:', token);
    return token;
  } catch (error) {
    console.error('[FCM] Token error:', error);
    return null;
  }
};

// ─── Foreground sound (expo-av) ───────────────────────────────────────────────
export const playCustomSound = async () => {
  try {
    if (soundInstance) {
      await soundInstance.stopAsync();
      await soundInstance.unloadAsync();
      soundInstance = null;
    }
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS:    true,
      staysActiveInBackground: true,
    });
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/notification.mp3'),
      { shouldPlay: false, volume: 1.0 }
    );
    soundInstance = sound;
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) { sound.unloadAsync(); soundInstance = null; }
    });
  } catch (error) {
    console.error('[Sound] Error:', error);
  }
};

// ─── Badge ────────────────────────────────────────────────────────────────────
export const resetBadgeCount = async () => {
  try {
    await Notifications.setBadgeCountAsync(0);
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('[Badge] Error:', error);
  }
};

// ─── Routing ──────────────────────────────────────────────────────────────────
const ONGOING_TAB_EVENTS = new Set([
  'ORDER_READY_FOR_DELIVERY',
  'ORDER_DELIVERED_CONFIRMED',
  'WAITER_ACCEPTED',
]);

const parseRemoteMessage = (remoteMessage) => {
  const notification = remoteMessage?.notification ?? {};
  const data         = remoteMessage?.data         ?? {};
  const title        = notification.title || data.title || 'New Notification';
  const body         = notification.body  || data.body  || '';
  const eventType    = data.eventType     || data.type  || '';
  const tab          = ONGOING_TAB_EVENTS.has(eventType) ? 1 : 0;
  const type         = eventType === 'ORDER_READY_FOR_DELIVERY' ? 'success' : 'order';
  return { title, body, type, tab, eventType };
};

// ─── Listeners — call once in App.js ─────────────────────────────────────────
export const setupInAppNotificationListeners = () => {
  const messaging = getMessaging();

  // 1. Foreground: show in-app banner + play sound
  //    Do NOT schedule a local notification — avoids duplicate
  const unsubscribeFCM = onMessage(messaging, async (remoteMessage) => {
    console.log('[FCM] 🔔 Foreground');
    const payload = parseRemoteMessage(remoteMessage);
    showInAppNotification(payload);
    await playCustomSound();
  });

  // 2. Background tap → navigate to correct tab
  onNotificationOpenedApp(messaging, (remoteMessage) => {
    if (!remoteMessage) return;
    console.log('[FCM] 👆 Background tap');
    const { tab } = parseRemoteMessage(remoteMessage);
    navigate('Home', { initialTab: tab });
    resetBadgeCount();
  });

  // 3. Killed state tap → navigate after mount
  getInitialNotification(messaging).then((remoteMessage) => {
    if (!remoteMessage) return;
    console.log('[FCM] 🚀 Killed state tap');
    const { tab } = parseRemoteMessage(remoteMessage);
    setTimeout(() => { navigate('Home', { initialTab: tab }); resetBadgeCount(); }, 500);
  });

  // 4. Token refresh
  const unsubscribeToken = onTokenRefresh(messaging, (newToken) => {
    console.log('[FCM] 🔄 Token refreshed:', newToken);
    // TODO: api.updateFcmToken(newToken)
  });

  return () => {
    unsubscribeFCM();
    unsubscribeToken();
  };
};

// ─── Badge management ─────────────────────────────────────────────────────────
let appStateSubscription = null;

export const initBadgeManagement = () => {
  resetBadgeCount();
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') resetBadgeCount();
  });
  return () => { appStateSubscription?.remove(); appStateSubscription = null; };
};