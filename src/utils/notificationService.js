// utils/notificationService.js
// A lightweight pub/sub for in-app notifications.
// Import `showInAppNotification` anywhere and call it to push a banner.

const listeners = new Set();

/**
 * Subscribe to notifications.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Push a notification banner.
 * @param {{ title: string, body: string, type?: 'order'|'info'|'success'|'warning', tab?: 0|1 }} notification
 */
export function showInAppNotification({ title, body, type = 'order', tab = 0 }) {
  const payload = { title, body, type, tab, id: Date.now() };
  listeners.forEach(cb => cb(payload));
}