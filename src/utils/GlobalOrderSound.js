// components/GlobalOrderSound.jsx
import { useEffect, useRef } from 'react';
import useUIStore from '../stores/uiStore';
import { startOrderSound, stopOrderSound, unloadOrderSound } from '../utils/soundManager';

export default function GlobalOrderSound() {
  const pendingOrders = useUIStore(s => s.pendingOrders);
  const hasPending    = pendingOrders.length > 0;
  const prevHasPending = useRef(false);

  useEffect(() => {
    if (hasPending && !prevHasPending.current) {
      startOrderSound();
    } else if (!hasPending && prevHasPending.current) {
      stopOrderSound();
    }
    prevHasPending.current = hasPending;
  }, [hasPending]);

  useEffect(() => {
    return () => { unloadOrderSound(); };
  }, []);

  return null;
}