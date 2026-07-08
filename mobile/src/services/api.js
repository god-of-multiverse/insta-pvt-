import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Android emulator, 10.0.2.2 points to host's localhost.
// For physical devices, you should change this to your machine's local IP address (e.g., 192.168.1.50)
const BASE_URL = Platform.select({
  ios: 'http://localhost:5000',
  android: 'http://10.0.2.2:5000',
  default: 'http://localhost:5000'
});

const getHeaders = async (isMultipart = false) => {
  const token = await AsyncStorage.getItem('token');
  const headers = {};
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
