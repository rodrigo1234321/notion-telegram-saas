'use client';

import { useTelegramUser } from '@/hooks/useTelegramUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Trello, PieChart, CheckSquare, Sparkles, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useTelegramUser();

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>Productividad Inteligente</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            ¡Hola, {user?.first_name || 'Creador'}! 👋
          </h1>
          <p className="text-xs text-blue-100/90 mt-1 max-w-[260px]">
            Tu espacio Notion integrado con IA en Telegram.
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center space-x-3 p-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Hoy</p>
            <p className="text-sm font-bold text-slate-100">3 Eventos</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Racha</p>
            <p className="text-sm font-bold text-slate-100">5 Días 🔥</p>
          </div>
        </Card>
      </div>

      {/* Main Modules Access */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Módulos SaaS</h2>
        
        <Link href="/calendar">
          <Card className="hover:border-sky-500/50 transition-all cursor-pointer mb-3 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Agenda & Bloques</h3>
                  <p className="text-xs text-slate-400">Gestión horaria y eventos</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link href="/kanban">
          <Card className="hover:border-indigo-500/50 transition-all cursor-pointer mb-3 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                  <Trello className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Tablero Kanban</h3>
                  <p className="text-xs text-slate-400">Proyectos y tareas con prioridades</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link href="/finance">
          <Card className="hover:border-emerald-500/50 transition-all cursor-pointer mb-3 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Dashboard Financiero</h3>
                  <p className="text-xs text-slate-400">Ingresos, gastos y gráficos</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
