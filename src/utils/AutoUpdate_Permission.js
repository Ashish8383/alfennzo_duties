// src/utils/apiHelpers.js
import api from './api';

export const updateFCMToken = async (fcmToken) => {
  try {
    if (!fcmToken) return false;
    
    const response = await api.post('/waiter/updateFCMToken', {
      fcmToken: fcmToken
    });
    
    if (response.data?.status === true) {
      console.log('✅ FCM Token updated successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to update FCM token:', error?.response?.data?.message || error.message);
    return false;
  }
};

export const updateLocation = async (latitude, longitude) => {
  try {
    if (!latitude || !longitude) return false;
    
    const response = await api.post('/waiter/updateLocation', {
      latitude: latitude,
      longitude: longitude
    });
    
    if (response.data?.status === true) {
      console.log('✅ Location updated successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to update location:', error?.response?.data?.message || error.message);
    return false;
  }
};