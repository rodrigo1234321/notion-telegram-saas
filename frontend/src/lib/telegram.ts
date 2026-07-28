'use client';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function getTelegramInitData(): string {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return "query_id=AAH123&user=%7B%22id%22%3A5634360549%2C%22first_name%22%3A%22Usuario%22%2C%22username%22%3A%22dev_user%22%7D&auth_date=1693264973&hash=mock_hash";
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    try {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
    } catch (e) {
      console.log('Haptic feedback:', type);
    }
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: TelegramUser;
        };
        expand: () => void;
        ready: () => void;
        HapticFeedback?: {
          impactOccurred: (style: string) => void;
        };
      };
    };
  }
}
