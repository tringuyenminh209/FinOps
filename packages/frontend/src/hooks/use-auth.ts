'use client';

import { create } from 'zustand';
import { apiPost, apiGet, ApiError } from '@/lib/api';

interface User {
  id: string;
  orgId: string;
  role: 'admin' | 'member' | 'viewer';
  displayName: string | null;
  email?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  loginWithLine: (accessToken: string, orgId?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
  hydrate: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  orgName: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    user: User;
  };
}

interface MeResponse {
  success: boolean;
  data: User;
}

function persistTokens(token: string, refreshToken: string) {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  loginWithLine: async (accessToken, orgId) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<LoginResponse>('/auth/line-login', { accessToken, orgId });
      persistTokens(res.data.token, res.data.refreshToken);
      set({
        user: res.data.user,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<LoginResponse>('/auth/login', { email, password });
      persistTokens(res.data.token, res.data.refreshToken);
      set({
        user: res.data.user,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<LoginResponse>('/auth/register', data);
      persistTokens(res.data.token, res.data.refreshToken);
      set({
        user: res.data.user,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  refreshToken: async () => {
    const rt = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!rt) return false;
    try {
      const res = await apiPost<{ success: boolean; data: { token: string; refreshToken: string } }>(
        '/auth/refresh',
        { refreshToken: rt },
      );
      persistTokens(res.data.token, res.data.refreshToken);
      set({ token: res.data.token });
      return true;
    } catch {
      clearTokens();
      set({ user: null, token: null, isAuthenticated: false });
      return false;
    }
  },

  fetchMe: async () => {
    // Demo mode: dev only
    if (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      localStorage.getItem('token') === 'demo-token'
    ) {
      set({
        user: { id: 'demo', orgId: 'demo-org', role: 'admin', displayName: 'デモユーザー', email: 'demo@finops.jp' },
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }
    try {
      const res = await apiGet<MeResponse>('/auth/me');
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const refreshed = await get().refreshToken();
        if (refreshed) {
          try {
            const res = await apiGet<MeResponse>('/auth/me');
            set({ user: res.data, isAuthenticated: true, isLoading: false });
            return;
          } catch { /* fall through */ }
        }
      }
      clearTokens();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isLoading: true });
      get().fetchMe();
    } else {
      set({ isLoading: false });
    }
  },
}));
