import axios from 'axios';
import { getTelegramInitData } from './telegram';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://notion-telegram-saas.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const initData = getTelegramInitData();
  if (initData) {
    config.headers['Telegram-Init-Data'] = initData;
    config.headers['Authorization'] = `tma ${initData}`;
  }
  return config;
});
