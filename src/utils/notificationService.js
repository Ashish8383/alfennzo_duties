const listeners = new Set();

export function subscribeToNotifications(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * @param {{ title: string, body: string, type?: 'order'|'info'|'success'|'warning', tab?: 0|1 }} notification
 */
export function showInAppNotification({ title, body, type = 'order', tab = 0 }) {
  const payload = { title, body, type, tab, id: Date.now() };
  listeners.forEach(cb => cb(payload));
}