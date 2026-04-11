// src/utils/Permissions.js
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

export const checkLocationPermission = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Location permission check error:', error);
    return false;
  }
};

export const checkNotificationPermission = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Notification permission check error:', error);
    return false;
  }
};

export const checkDeviceLocationEnabled = async () => {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  } catch (error) {
    console.error('Check device location error:', error);
    return false;
  }
};

export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Location permission request error:', error);
    return false;
  }
};

export const requestNotificationPermission = async () => {
  try {
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
    console.error('Notification permission request error:', error);
    return false;
  }
};

export const openAppSettings = () => {
  Linking.openSettings();
};

export const openLocationSettings = () => {
  Linking.openSettings();
};