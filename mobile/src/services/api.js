import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Resolves the API origin, in priority order:
 *
 *   1. EXPO_PUBLIC_API_URL - the mobile equivalent of the webapp's
 *      VITE_API_URL. Set this for a physical device or a deployed API.
 *   2. `extra.apiUrl` in app.json, for per-build configuration.
 *   3. The Expo dev server's own host, so a phone on the same Wi-Fi reaches
 *      the dev machine automatically instead of its own localhost.
 *   4. Emulator loopback defaults.
 *
 * Hardcoding localhost used to mean the app only worked in a simulator on the
 * same machine; on a real device localhost is the phone itself.
 */
const resolveBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromConfig = Constants.expoConfig?.extra?.apiUrl;
  if (fromConfig) return String(fromConfig).replace(/\/$/, '');

  // hostUri looks like "192.168.1.50:8081" when Expo serves over the LAN.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    '';
  const host = hostUri.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5000`;
  }

  return Platform.select({
    ios: 'http://localhost:5000',
    android: 'http://10.0.2.2:5000',
    default: 'http://localhost:5000',
  });
};

const BASE_URL = resolveBaseUrl();

const getHeaders = async (isMultipart = false) => {
  const token = await AsyncStorage.getItem('token');
  const headers = {};
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // Some proxies consume Authorization for their own auth; the API accepts
    // this fallback too. Mirrors webapp/src/services/api.js.
    headers['X-Auth-Token'] = token;
  }
  
  return headers;
};

const handleResponse = async (response) => {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(text || 'Server error occurred');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
};

export const api = {
  get: async (endpoint) => {
    const headers = await getHeaders();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    return handleResponse(response);
  },

  post: async (endpoint, body) => {
    const headers = await getHeaders();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  postMultipart: async (endpoint, formData) => {
    const headers = await getHeaders(true);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(response);
  }
};
