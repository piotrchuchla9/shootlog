import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  tier: string;
  shooterAlias?: string;
  ipscNumber?: string;
  pzssNumber?: string;
  region?: string;
  notifySignup?: boolean;
  notifyResults?: boolean;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isRestoring: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoggedIn: false,
  isRestoring: true,

  setAuth: async (user, accessToken, refreshToken) => {
    await storage.set('accessToken', accessToken);
    await storage.set('refreshToken', refreshToken);
    set({ user, isLoggedIn: true });
  },

  updateUser: (user) => set({ user }),

  logout: async () => {
    await storage.del('accessToken');
    await storage.del('refreshToken');
    set({ user: null, isLoggedIn: false });
  },

  restoreSession: async () => {
    try {
      const token = await storage.get('accessToken');
      if (!token) return;
      const { data } = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: data, isLoggedIn: true });
    } catch {
      // Token expired or invalid — stay logged out
    } finally {
      set({ isRestoring: false });
    }
  },
}));
