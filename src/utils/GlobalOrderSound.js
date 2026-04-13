// components/GlobalOrderSound.jsx
import { useEffect, useRef } from 'react';
import useUIStore from '../stores/uiStore';
import { startOrderSound, stopOrderSound, unloadOrderSound } from '../utils/soundManager';

export default function GlobalOrderSound() {
  // ✅ Only watch pendingOrders — ongoing orders don't trigger sound
  const pendingOrders = useUIStore(s => s.pendingOrders);
  const hasPending    = pendingOrders.length > 0;
  const prevHasPending = useRef(false);

  useEffect(() => {
    if (hasPending && !prevHasPending.current) {
      // Pending orders just appeared — start loop
      startOrderSound();
    } else if (!hasPending && prevHasPending.current) {
      // Pending orders cleared — stop loop
      stopOrderSound();
    }
    prevHasPending.current = hasPending;
  }, [hasPending]);

  // Cleanup on unmount (logout)
  useEffect(() => {
    return () => { unloadOrderSound(); };
  }, []);

  return null;
}