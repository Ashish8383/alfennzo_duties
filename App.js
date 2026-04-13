// App.js
import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import GlobalPermissionModal from './src/components/GlobalPermission';
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
  const [initialCheckDone, setInitialCheckDone]       = useState(false);

  const isCheckingRef     = useRef(false);
  const permissionsOkRef  = useRef(false); // ✅ once granted, never re-prompt

  // ── One-time setup ────────────────────────────────────────────────────────
  useEffect(() => {
    setupNotificationChannel();
    checkAndShowModal();
  }, []);

  // ── Only re-check on foreground IF permissions were previously denied ─────
  // If they were already granted, we never bother the user again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        !permissionsOkRef.current &&   // ✅ skip if already granted
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
        permissionsOkRef.current = true;   // ✅ lock — never show modal again
        setShowPermissionModal(false);
      } else {
        setShowPermissionModal(true);
      }
      setInitialCheckDone(true);
    } finally {
      isCheckingRef.current = false;
    }
  };

  // ── FCM listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = setupInAppNotificationListeners();
    return cleanup;
  }, []);

  // ── Badge management ──────────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = initBadgeManagement();
    return cleanup;
  }, []);

  if (!initialCheckDone) return null;

  return (
    <SafeAreaProvider>
      <GlobalOrderSound />
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
      <InAppNotification />
    </SafeAreaProvider>
  );
}