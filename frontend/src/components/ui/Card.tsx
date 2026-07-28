import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export function Card({ children, className = '', title, icon }: CardProps) {
  return (
    <div className={`bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md ${className}`}>
      {title && (
        <div className="flex items-center space-x-2 mb-3 border-b border-slate-800 pb-2">
          {icon && <span className="text-sky-400">{icon}</span>}
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
