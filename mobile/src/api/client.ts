import axios from 'axios';
// Using standard axios as defined in package.json
import * as SecureStore from 'expo-secure-store';

// Default base URL for Expo running locally. 
// For Android Emulator use http://10.0.2.2:8000
// For physical device, use your machine's local IP (e.g., http://192.168.1.5:8000)
import { Platform } from 'react-native';

const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = `http://${LOCALHOST}:8000/api/v1`;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error reading token from SecureStore', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
