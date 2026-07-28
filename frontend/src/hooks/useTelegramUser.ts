'use client';

import { useState, useEffect } from 'react';
import { TelegramUser, triggerHaptic } from '@/lib/telegram';

export function useTelegramUser() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();

      const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
      if (tgUser) {
        setUser(tgUser);
      }
    }
    setIsLoaded(true);
  }, []);

  return { user, isLoaded, triggerHaptic };
}