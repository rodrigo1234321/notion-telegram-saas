'use client';

import React from 'react';
import { triggerHaptic } from '@/lib/telegram';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', onClick, ...props }: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic('medium');
    if (onClick) onClick(e);
  };

  const variants = {
    primary: 'bg-[var(--tg-theme-button-color,#2563eb)] text-[var(--tg-theme-button-text-color,#ffffff)] hover:opacity-90 active:scale-95 shadow-md shadow-blue-600/20',
    secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95',
    outline: 'border border-slate-700 text-slate-300 hover:bg-slate-800/50 active:scale-95',
    danger: 'bg-red-600 text-white hover:bg-red-500 active:scale-95 shadow-md shadow-red-600/20',
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
