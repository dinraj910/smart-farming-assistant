import axios from 'axios';
// Using standard axios as defined in package.json
import * as SecureStore from 'expo-secure-store';

// IMPORTANT: If you are testing on a physical phone using Expo Go, 
// 'localhost' will NOT work because it points to the phone itself.
// You MUST replace 'localhost' below with your computer's local Wi-Fi IP address!
// Example: const LOCALHOST = '192.168.1.15';
import Constants from 'expo-constants';

// Dynamically get the host running the Metro bundler (same machine as our backend).
// This works for physical devices, emulators, and Expo Go automatically.
function getApiUrl() {
  // In Expo Go / dev builds, the debuggerHost points to the Metro server on your machine.
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]; // strip the port from Metro's host
    return `http://${host}:8000/api/v1`;
  }
  // Fallback for production builds
  return 'http://localhost:8000/api/v1';
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
