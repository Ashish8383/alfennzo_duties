// hooks/useHaptics.js
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const useHaptics = () => {
  
  // Light feedback - best for tabs and small buttons
  const tabClick = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptic error:', error);
      }
    }
  };

  // Medium feedback - for confirmations
  const mediumImpact = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptic error:', error);
      }
    }
  };

  // Heavy feedback - for major actions
  const heavyImpact = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic error:', error);
      }
    }
  };

  // Success feedback
  const success = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptic error:', error);
      }
    }
  };

  // Selection feedback - for pickers/selectors
  const selection = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        console.log('Haptic error:', error);
      }
    }
  };

  return {
    tabClick,
    mediumImpact,
    heavyImpact,
    success,
    selection,
  };
};