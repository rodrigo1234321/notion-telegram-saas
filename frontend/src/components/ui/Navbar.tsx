'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Trello, PieChart, CheckSquare, BookOpen } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';

const navItems = [
  { name: 'Inicio', href: '/', icon: LayoutDashboard },
  { name: 'Agenda', href: '/calendar', icon: Calendar },
  { name: 'Kanban', href: '/kanban', icon: Trello },
  { name: 'Finanzas', href: '/finance', icon: PieChart },
  { name: 'Hábitos', href: '/habits', icon: CheckSquare },
  { name: 'Wiki', href: '/wiki', icon: BookOpen },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border-t border-slate-800 backdrop-blur-lg px-2 py-1">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-sky-400 bg-sky-500/10 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
