import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status !== 401) return Promise.reject(error);

    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) return Promise.reject(error);

    try {
      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken }
      );
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(error.config);
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      return Promise.reject(error);
    }
  }
);
