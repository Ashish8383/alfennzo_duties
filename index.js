import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { AppRegistry } from 'react-native';
import App from './App';

// Foreground display config
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false, // in-app banner handles foreground
    shouldShowList:   true,
    shouldPlaySound:  false, // expo-av handles foreground sound
    shouldSetBadge:   true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Background/killed: Android auto-displays FCM notification via channel
// We only need this registered — no scheduling needed
setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  console.log('[FCM Background] Received:', remoteMessage?.data);
  // Nothing to do — Android displays it automatically using the channel
  // Channel has custom sound set, so it plays notification.mp3 automatically
});

AppRegistry.registerComponent('main', () => App);