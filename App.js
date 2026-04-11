// App.js
import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import GlobalPermissionModal from './src/components/GlobalPermission';
import GlobalLocationTracker from './src/components/LocationTracker';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalOrderSound from './src/utils/GlobalOrderSound';
import InAppNotification from './src/utils/InAppNotification';
import { navigationRef } from './src/utils/navigationRef';
import { setupInAppNotificationListeners } from './src/utils/notification';
import { checkLocationPermission, checkNotificationPermission } from './src/utils/Permissions';
import { toastConfig } from './src/utils/toastConfig';

export default function App() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    checkAndShowModal();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') checkAndShowModal();
    });
    return () => subscription.remove();
  }, []);

  // ── THIS WAS MISSING ──────────────────────────────────────────────────────
  // Registers the FCM foreground listener that calls showInAppNotification().
  // Without this, notifications arrive at OS level but the in-app banner
  // never fires because nothing is subscribed to addNotificationReceivedListener.
  useEffect(() => {
    const cleanup = setupInAppNotificationListeners();
    return cleanup; // removes listeners on unmount
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const checkAndShowModal = async () => {
    const locationGranted     = await checkLocationPermission();
    const notificationGranted = await checkNotificationPermission();
    setShowPermissionModal(!locationGranted || !notificationGranted);
    setInitialCheckDone(true);
  };

  const handlePermissionsGranted = () => checkAndShowModal();
  const handleCloseModal = () => setShowPermissionModal(false);

  if (!initialCheckDone) return null;

  return (
    <SafeAreaProvider>
      {/* 🔊 Plays ordercoming.mp3 in a loop whenever orders exist */}
      <GlobalOrderSound />

      <GlobalLocationTracker>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <Toast config={toastConfig} />
        </NavigationContainer>

        <GlobalPermissionModal
          visible={showPermissionModal}
          onClose={handleCloseModal}
          onPermissionsGranted={handlePermissionsGranted}
        />
      </GlobalLocationTracker>

      {/* 🔔 In-app notification banner — renders above everything, tap navigates */}
      <InAppNotification />
    </SafeAreaProvider>
  );
}