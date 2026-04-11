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

  useEffect(() => {
    // Initial check
    checkPermissions();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, []);

  return { permissions, loading, checkPermissions };
};