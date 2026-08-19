import { create } from 'zustand';
import { getJson, postJson } from '../../services/api-client';
import { tokenStorage } from '../../services/token-storage';
import type { AuthResponse, AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (displayName: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  login: async (email, password) => {
    const response = await postJson<AuthResponse>('/auth/login', { email, password }, true);
    tokenStorage.setTokens(response.accessToken, response.refreshToken);
    set({ user: response.user, initialized: true });
    return response.user;
  },
  register: async (displayName, email, password) => {
    const response = await postJson<AuthResponse>('/auth/register', { displayName, email, password }, true);
    tokenStorage.setTokens(response.accessToken, response.refreshToken);
    set({ user: response.user, initialized: true });
    return response.user;
  },
  logout: async () => {
    try { await postJson('/auth/logout'); } finally {
      tokenStorage.clear();
      set({ user: null, initialized: true });
    }
  },
  hydrate: async () => {
    if (get().initialized) return;
    if (!tokenStorage.getAccessToken()) return void set({ initialized: true });
    try {
      const profile = await getJson<AuthUser>('/users/me');
      set({ user: profile, initialized: true });
    } catch {
      tokenStorage.clear();
      set({ user: null, initialized: true });
    }
  },
}));

