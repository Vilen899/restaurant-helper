import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoLockOptions {
  timeoutMinutes: number;
  enabled: boolean;
  onLock: () => void;
}

export function useAutoLock({ timeoutMinutes, enabled, onLock }: UseAutoLockOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (enabled && timeoutMinutes > 0) {
      timeoutRef.current = setTimeout(() => {
        onLock();
      }, timeoutMinutes * 60 * 1000);
    }
  }, [enabled, timeoutMinutes, onLock]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
}
