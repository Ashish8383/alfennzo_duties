// src/hooks/useGlobalPermissions.js
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { checkLocationPermission, checkNotificationPermission } from '../utils/Permissions';

export const useGlobalPermissions = () => {
  const [permissions, setPermissions] = useState({
    location: false,
    notification: false,
  });
  const [loading, setLoading] = useState(true);

  const checkPermissions = async () => {
    const [locationGranted, notificationGranted] = await Promise.all([
      checkLocationPermission(),
      checkNotificationPermission(),
    ]);
    
    setPermissions({
      location: locationGranted,
      notification: notificationGranted,
    });
    setLoading(false);
  };

  // src/components/GlobalPermission.js — replace the AppState useEffect only

  useEffect(() => {
    if (!visible) return; // ✅ don't listen when modal is hidden

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Only re-check when user returns from Settings (could have granted there)
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });
    return () => subscription.remove();
  }, [visible]); // ✅ re-subscribe only when visibility changes

  return { permissions, loading, checkPermissions };
};