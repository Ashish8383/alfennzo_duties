// App.js
import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import GlobalPermissionModal from './src/components/GlobalPermission';
import GlobalLocationTracker from './src/components/LocationTracker';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalOrderSound from './src/utils/GlobalOrderSound';
import InAppNotification from './src/utils/InAppNotification';
import { navigationRef } from './src/utils/navigationRef';
import {
  initBadgeManagement,
  requestNotificationPermissions,
  setupInAppNotificationListeners,
  setupNotificationChannel,
} from './src/utils/notification';
import { toastConfig } from './src/utils/toastConfig';

export default function App() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const isCheckingRef = useRef(false);
  const permissionsOkRef = useRef(false); 

  useEffect(() => {
    setupNotificationChannel();
    checkAndShowModal();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        !permissionsOkRef.current &&   
        !isCheckingRef.current
      ) {
        checkAndShowModal();
      }
    });
    return () => subscription.remove();
  }, []);

  const checkAndShowModal = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const granted = await requestNotificationPermissions();

      if (granted) {
        permissionsOkRef.current = true;   
        setShowPermissionModal(false);
      } else {
        setShowPermissionModal(true);
      }
      setInitialCheckDone(true);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    const cleanup = setupInAppNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = initBadgeManagement();
    return cleanup;
  }, []);

  if (!initialCheckDone) return null;

  return (
    <SafeAreaProvider>
      <GlobalOrderSound />
      <GlobalLocationTracker>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <Toast config={toastConfig} />
        </NavigationContainer>

        <GlobalPermissionModal
          visible={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          onPermissionsGranted={() => {
            permissionsOkRef.current = true;
            setShowPermissionModal(false);
          }}
        />
      </GlobalLocationTracker>
      <InAppNotification />
    </SafeAreaProvider>
  );
}