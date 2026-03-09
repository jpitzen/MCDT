import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

/**
 * useIdleTimeout — logs the user out after a period of inactivity.
 *
 * @param {object}  options
 * @param {number}  options.timeoutMinutes   Total idle minutes before logout (default 30)
 * @param {number}  options.warningMinutes   Minutes before timeout to show warning (default 5)
 * @returns {{ showWarning: boolean, remainingSeconds: number, staySignedIn: () => void }}
 */
const useIdleTimeout = ({ timeoutMinutes = 30, warningMinutes = 5 } = {}) => {
  const { isAuthenticated, refreshToken, logout } = useAuth();
  const navigate = useNavigate();

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningMinutes * 60);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // If the warning is showing, dismiss it
    if (showWarning) {
      setShowWarning(false);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [showWarning]);

  // "Stay Signed In" handler
  const staySignedIn = useCallback(() => {
    resetActivity();
    // Refresh the access token proactively
    if (refreshToken) {
      refreshToken().catch(() => {});
    }
  }, [resetActivity, refreshToken]);

  // Perform logout and redirect
  const doIdleLogout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    logout();
    navigate('/login?reason=idle');
  }, [logout, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Attach activity listeners
    const handler = () => resetActivity();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

    // Check idle state every 15 seconds
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        // Time's up — log out
        doIdleLogout();
      } else if (elapsed >= timeoutMs - warningMs && !showWarning) {
        // Enter warning phase
        setShowWarning(true);
        setRemainingSeconds(Math.ceil((timeoutMs - elapsed) / 1000));

        // Start a per-second countdown
        countdownRef.current = setInterval(() => {
          const now = Date.now();
          const left = timeoutMs - (now - lastActivityRef.current);
          if (left <= 0) {
            doIdleLogout();
          } else {
            setRemainingSeconds(Math.ceil(left / 1000));
          }
        }, 1000);
      }
    }, 15_000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { showWarning, remainingSeconds, staySignedIn };
};

export default useIdleTimeout;
