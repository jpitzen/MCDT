'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';

interface UseIdleTimeoutOptions {
  onIdle?: () => void;
  onWarning?: (remainingSeconds: number) => void;
  enabled?: boolean;
}

interface IdleTimeoutState {
  isWarning: boolean;
  remainingSeconds: number;
  isIdle: boolean;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions = {}) {
  const { onIdle, onWarning, enabled = true } = options;
  const { isAuthenticated, logout } = useAuthStore();
  
  const [state, setState] = useState<IdleTimeoutState>({
    isWarning: false,
    remainingSeconds: 0,
    isIdle: false,
  });
  
  const [settings, setSettings] = useState({
    timeoutMinutes: 30,
    warningMinutes: 5,
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await adminApi.getSettings();
        setSettings({
          timeoutMinutes: data.session_timeout_minutes || 30,
          warningMinutes: data.session_warning_minutes || 5,
        });
      } catch (error) {
        console.debug('Failed to load session settings, using defaults');
      }
    };

    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    setState({ isWarning: false, remainingSeconds: 0, isIdle: true });
    onIdle?.();
    logout();
  }, [clearAllTimers, logout, onIdle]);

  const resetTimer = useCallback(() => {
    if (!enabled || !isAuthenticated) return;
    // Don't set timers if settings haven't loaded yet
    if (settings.timeoutMinutes <= 0) return;

    lastActivityRef.current = Date.now();
    clearAllTimers();
    
    setState({ isWarning: false, remainingSeconds: 0, isIdle: false });

    const timeoutMs = settings.timeoutMinutes * 60 * 1000;
    const warningMs = settings.warningMinutes * 60 * 1000;
    const warningStartMs = timeoutMs - warningMs;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      const warningSeconds = settings.warningMinutes * 60;
      setState(prev => ({ ...prev, isWarning: true, remainingSeconds: warningSeconds }));
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setState(prev => {
          const newRemaining = prev.remainingSeconds - 1;
          if (newRemaining <= 0) {
            handleLogout();
            return { ...prev, remainingSeconds: 0 };
          }
          onWarning?.(newRemaining);
          return { ...prev, remainingSeconds: newRemaining };
        });
      }, 1000);
    }, warningStartMs);

    // Set logout timer
    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [enabled, isAuthenticated, settings, clearAllTimers, handleLogout, onWarning]);

  // Activity event handler - debounced to avoid excessive resets
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleActivity = useCallback(() => {
    // Only reset if we're not in warning mode
    if (state.isWarning) return;
    
    // Debounce activity - only reset timer every 5 seconds max
    if (activityTimeoutRef.current) return;
    
    activityTimeoutRef.current = setTimeout(() => {
      activityTimeoutRef.current = null;
    }, 5000);
    
    resetTimer();
  }, [resetTimer, state.isWarning]);

  // Extend session (called from warning modal)
  const extendSession = useCallback(() => {
    setState({ isWarning: false, remainingSeconds: 0, isIdle: false });
    resetTimer();
  }, [resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      clearAllTimers();
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [enabled, isAuthenticated, handleActivity, resetTimer, clearAllTimers]);

  return {
    ...state,
    extendSession,
    resetTimer,
    settings,
  };
}

export default useIdleTimeout;
