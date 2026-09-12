import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  district?: string;
  primaryCrop?: string;
  farmSize?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: {
    name: string;
    email?: string;
    phone?: string;
    district?: string;
    primaryCrop?: string;
    farmSize?: string;
  }) => Promise<User>;
  clearError: () => void;
}

const PROFILE_EXTRA_KEY = 'farmer_profile_extra';

async function getStoredExtraProfile(): Promise<Partial<User>> {
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_EXTRA_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {};
}

async function saveStoredExtraProfile(extra: Partial<User>) {
  try {
    await SecureStore.setItemAsync(PROFILE_EXTRA_KEY, JSON.stringify(extra));
  } catch (_) {}
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitializing: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token } = response.data;

      await SecureStore.setItemAsync('auth_token', access_token);
      set({ token: access_token });

      // Fetch user profile
      const userResponse = await apiClient.get('/auth/me');
      const extra = await getStoredExtraProfile();
      set({
        user: { ...userResponse.data, ...extra },
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMsg = 'Failed to login';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorMsg = Array.isArray(detail) ? detail[0].msg : detail;
      } else if (error.message) {
        errorMsg = error.message;
      }

      set({
        error: errorMsg,
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (name, email, password) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/auth/register', { name, email, password });
      const { access_token } = response.data;

      await SecureStore.setItemAsync('auth_token', access_token);
      set({ token: access_token });

      // Fetch user profile
      const userResponse = await apiClient.get('/auth/me');
      const extra = await getStoredExtraProfile();
      set({
        user: { ...userResponse.data, ...extra },
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      let errorMsg = 'Failed to register';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorMsg = Array.isArray(detail) ? detail[0].msg : detail;
      } else if (error.message) {
        errorMsg = error.message;
      }

      set({
        error: errorMsg,
        isLoading: false,
      });
      throw error;
    }
  },

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });

      // Call backend update endpoint
      const response = await apiClient.put('/auth/me', {
        name: data.name.trim(),
        email: data.email?.trim(),
      });

      // Save additional farmer meta to SecureStore
      const extra: Partial<User> = {
        phone: data.phone?.trim(),
        district: data.district?.trim(),
        primaryCrop: data.primaryCrop?.trim(),
        farmSize: data.farmSize?.trim(),
      };
      await saveStoredExtraProfile(extra);

      const updatedUser: User = {
        ...(get().user || {}),
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        ...extra,
      };

      set({ user: updatedUser, isLoading: false });
      return updatedUser;
    } catch (error: any) {
      console.error('Update profile error:', error);
      let errorMsg = 'Failed to update profile';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorMsg = Array.isArray(detail) ? detail[0].msg : detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      set({ user: null, token: null, error: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  checkAuth: async () => {
    try {
      set({ isInitializing: true });
      const token = await SecureStore.getItemAsync('auth_token');

      if (!token) {
        set({ isInitializing: false, user: null, token: null });
        return;
      }

      set({ token });

      // Fetch user data
      const response = await apiClient.get('/auth/me');
      const extra = await getStoredExtraProfile();
      set({
        user: { ...response.data, ...extra },
        isInitializing: false,
      });
    } catch (error) {
      // Token invalid or expired
      await SecureStore.deleteItemAsync('auth_token');
      set({ user: null, token: null, isInitializing: false });
    }
  },
}));
