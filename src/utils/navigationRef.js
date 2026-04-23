// src/utils/navigationRef.js
import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function navigateToHomePendingTab() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
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
      })
    );
  }
}

export function navigateToHomeOngoingTab() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0, 
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
      })
    );
  }
}

export function navigateToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
}