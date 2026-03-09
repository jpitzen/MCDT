import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adEnabled, setAdEnabled] = useState(false);
  const refreshTimerRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────

  const decodeAndSetUser = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      setUser({
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        authProvider: decoded.authProvider || 'local',
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        ...decoded,
      });
      return decoded;
    } catch {
      return null;
    }
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const isTokenExpired = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return false;
      // Consider expired if less than 30 seconds remain
      return decoded.exp * 1000 < Date.now() + 30000;
    } catch {
      return true;
    }
  }, []);

  // Schedule a refresh 5 minutes before access token expiry
  const scheduleRefresh = useCallback((token) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return;
      const msUntilExpiry = decoded.exp * 1000 - Date.now();
      const refreshIn = Math.max(msUntilExpiry - 5 * 60 * 1000, 10000); // at least 10 s
      refreshTimerRef.current = setTimeout(async () => {
        try {
          await doRefreshToken();
        } catch {
          // Refresh failed — user will be logged out on next 401
        }
      }, refreshIn);
    } catch {
      // ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public methods ─────────────────────────────────────

  const checkAdStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/ldap-status');
      const data = res.data?.data || res.data;
      setAdEnabled(!!data.configured);
      return data;
    } catch {
      setAdEnabled(false);
      return { configured: false };
    }
  }, []);

  const loginLocal = useCallback(async (email, password) => {
    const res = await api.auth.login(email, password);
    const data = res.data?.data || res.data;
    if (!data.token) throw new Error('No token received');
    localStorage.setItem('authToken', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    decodeAndSetUser(data.token);
    scheduleRefresh(data.token);
    return data;
  }, [decodeAndSetUser, scheduleRefresh]);

  const loginAd = useCallback(async (username, password) => {
    const res = await api.post('/auth/ad-login', { username, password });
    const data = res.data?.data || res.data;
    if (!data.token) throw new Error('No token received');
    localStorage.setItem('authToken', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    decodeAndSetUser(data.token);
    scheduleRefresh(data.token);
    return data;
  }, [decodeAndSetUser, scheduleRefresh]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const doRefreshToken = useCallback(async () => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) throw new Error('No refresh token');
    const res = await api.post('/auth/refresh', { refreshToken: storedRefresh });
    const data = res.data?.data || res.data;
    if (!data.token) throw new Error('Refresh failed');
    localStorage.setItem('authToken', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    decodeAndSetUser(data.token);
    scheduleRefresh(data.token);
    return data;
  }, [decodeAndSetUser, scheduleRefresh]);

  const hasRole = useCallback((role) => user?.role === role, [user]);
  const hasAnyRole = useCallback((roles) => roles.includes(user?.role), [user]);

  // ── Initialisation on mount ────────────────────────────

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('authToken');

      if (token) {
        if (isTokenExpired(token)) {
          // Try refresh
          try {
            await doRefreshToken();
          } catch {
            clearAuth();
          }
        } else {
          decodeAndSetUser(token);
          scheduleRefresh(token);
        }
      }

      // Always check AD status (login page needs it even when unauthenticated)
      await checkAdStatus();
      setIsLoading(false);
    };

    init();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    loading: isLoading, // backwards compat
    adEnabled,
    login: (token) => {
      // Legacy compat — if called with a raw token string
      localStorage.setItem('authToken', token);
      decodeAndSetUser(token);
      scheduleRefresh(token);
    },
    loginLocal,
    loginAd,
    logout,
    refreshToken: doRefreshToken,
    checkAdStatus,
    hasRole,
    hasAnyRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
