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
  return "";
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