import axios from 'axios';
// Using standard axios as defined in package.json
import * as SecureStore from 'expo-secure-store';

// IMPORTANT: If you are testing on a physical phone using Expo Go, 
// 'localhost' will NOT work because it points to the phone itself.
// You MUST replace 'localhost' below with your computer's local Wi-Fi IP address!
// Example: const LOCALHOST = '192.168.1.15';
import Constants from 'expo-constants';

// Live production backend on Render
export const CLOUD_API_URL = 'https://smart-farming-assistant-backend-oncx.onrender.com/api/v1';

// Dynamically get the host running the Metro bundler if testing locally
function getApiUrl() {
  // Use deployed cloud backend for both production builds and device testing
  return CLOUD_API_URL;
}

export const API_URL = getApiUrl();

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
