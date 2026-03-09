import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types';
import { authApi, getStoredToken, removeStoredToken } from '@/lib/api';

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const authToken = await authApi.login(username, password);
          const user = await authApi.getCurrentUser();
          set({
            user,
            token: authToken.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        // Prevent multiple simultaneous logout calls
        const state = get();
        if (!state.isAuthenticated && !state.token) {
          return; // Already logged out
        }
        
        // Clear state first to prevent loops
        removeStoredToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        try {
          await authApi.logout();
        } catch {
          // Ignore errors on logout - user is already logged out locally
        }
      },

      checkAuth: async () => {
        const token = getStoredToken();
        if (!token) {
          set({ isAuthenticated: false, isLoading: false, user: null, token: null });
          return;
        }

        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          removeStoredToken();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listen for logout events from API interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}
