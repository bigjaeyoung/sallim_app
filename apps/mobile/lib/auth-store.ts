import { create } from 'zustand';
import type { AuthSession } from '@sallim/shared';
import { authApi } from './api.js';
import { clearTokens, loadTokens } from './secure-storage.js';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthSession['user'] | null;
  /** Run once on app startup to restore the session from SecureStore. */
  hydrate: () => Promise<void>;
  setSession: (s: AuthSession) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  hydrate: async (): Promise<void> => {
    const { access, refresh } = await loadTokens();
    if (!access || !refresh) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    // We have tokens — try refreshing to get current user info and prove the
    // refresh token is still valid. If it fails, log out.
    const session = await authApi.refresh();
    if (!session) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    set({ status: 'authenticated', user: session.user });
  },

  setSession: (s) => set({ status: 'authenticated', user: s.user }),

  signOut: async (): Promise<void> => {
    await clearTokens();
    set({ status: 'unauthenticated', user: null });
  },
}));
