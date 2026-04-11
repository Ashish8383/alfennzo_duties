// utils/navigationRef.js
// Mount this at your root App.js: <NavigationContainer ref={navigationRef}>
import { createRef } from 'react';

export const navigationRef = createRef();

export function navigate(name, params) {
  if (navigationRef.current?.isReady()) {
    navigationRef.current.navigate(name, params);
  }
}

export function navigateToHomePendingTab() {
  navigate('Home', { initialTab: 0 });
}

export function navigateToHomeOngoingTab() {
  navigate('Home', { initialTab: 1 });
}