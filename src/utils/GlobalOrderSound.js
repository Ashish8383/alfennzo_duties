// components/GlobalOrderSound.jsx
// Mount this ONCE at your App root (inside providers, outside any navigator).
// It watches the UIStore and plays/stops the loop sound automatically.

import { useEffect, useRef } from 'react';
import useUIStore from '../stores/uiStore';
import { startOrderSound, stopOrderSound, unloadOrderSound } from '../utils/soundManager';

export default function GlobalOrderSound() {
  const pendingOrders  = useUIStore(s => s.pendingOrders);
  const acceptedOrders = useUIStore(s => s.acceptedOrders);
  const hasOrders = pendingOrders.length > 0 || acceptedOrders.length > 0;
  const prevHasOrders = useRef(false);

  useEffect(() => {
    if (hasOrders && !prevHasOrders.current) {
      // Orders just appeared — start sound
      startOrderSound();
    } else if (!hasOrders && prevHasOrders.current) {
      // All orders gone — stop sound
      stopOrderSound();
    }
    prevHasOrders.current = hasOrders;
  }, [hasOrders]);

  // Cleanup on unmount (e.g. logout)
  useEffect(() => {
    return () => {
      unloadOrderSound();
    };
  }, []);

  return null; // No UI
}