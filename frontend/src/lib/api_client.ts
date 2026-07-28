import axios from 'axios';
import { getTelegramInitData } from './telegram';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const initData = getTelegramInitData();
  if (initData) {
    config.headers['Telegram-Init-Data'] = initData;
    config.headers['Authorization'] = `tma ${initData}`;
  }
  return config;
});
