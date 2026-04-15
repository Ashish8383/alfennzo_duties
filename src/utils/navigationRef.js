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
  if (navigationRef.current?.isReady()) {
    navigationRef.current.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            routes: [
              {
                name: 'Home',
                params: { initialTab: 0 },
              },
            ],
          },
        },
      ],
    });
  }
}

export function navigateToHomeOngoingTab() {
  if (navigationRef.current?.isReady()) {
    navigationRef.current.reset({
      index: 1,
      routes: [
        {
          name: 'Main',
          state: {
            routes: [
              {
                name: 'Home',
                params: { initialTab: 1 },
              },
            ],
          },
        },
      ],
    });
  }
}

export function navigateToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  }
}