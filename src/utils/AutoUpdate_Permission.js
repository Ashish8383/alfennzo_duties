// src/utils/apiHelpers.js
import api from './api';

export const updateFCMToken = async (fcmToken) => {
  try {
    if (!fcmToken) return false;
    
    const response = await api.post('/waiter/updateFCMToken', {
      fcmToken: fcmToken
    });
    
    if (response.data?.status === true) {
      return true;
    }
    return false;
  } catch (error) {
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
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};