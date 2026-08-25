import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
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
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitializing: true, // Initially true while checking auth
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
      set({ user: userResponse.data, isLoading: false });
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
        isLoading: false 
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
      set({ user: userResponse.data, isLoading: false });
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
        isLoading: false 
      });
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
      
      // Try to fetch user data
      const response = await apiClient.get('/auth/me');
      set({ user: response.data, isInitializing: false });
    } catch (error) {
      // Token invalid or expired
      await SecureStore.deleteItemAsync('auth_token');
      set({ user: null, token: null, isInitializing: false });
    }
  },
}));
