import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { AppRegistry } from 'react-native';
import App from './App';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false, 
    shouldShowList:   true,
    shouldPlaySound:  false, 
    shouldSetBadge:   true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
});

AppRegistry.registerComponent('main', () => App);