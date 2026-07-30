'use client';

import { useState, useEffect } from 'react';
import { useTelegramUser } from '@/hooks/useTelegramUser';
import { Card } from '@/components/ui/Card';
import { WeatherWidget } from '@/components/ui/WeatherWidget';
import { Calendar, Trello, PieChart, CheckSquare, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useTelegramUser();
  const [todayEventsCount, setTodayEventsCount] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  useEffect(() => {
    // Read real persistent memory stats
    const cachedEvents = localStorage.getItem('saas_calendar_events');
    if (cachedEvents) {
      try {
        const evList = JSON.parse(cachedEvents);
        setTodayEventsCount(evList.length);
      } catch {}
    }

    const cachedHabits = localStorage.getItem('saas_habits_list');
    if (cachedHabits) {
      try {
        const habList = JSON.parse(cachedHabits);
        const max = habList.reduce((m: number, h: any) => Math.max(m, h.streak || 0), 0);
        setMaxStreak(max);
      } catch {}
    }
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>Productividad Inteligente</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            ¡Hola, {user?.first_name || 'Usuario'}! 👋
          </h1>
          <p className="text-xs text-blue-100/90 mt-1 max-w-[260px]">
            Tu espacio Notion completo con IA en Telegram.
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Live Weather Widget */}
      <WeatherWidget />

      {/* Dynamic Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center space-x-3 p-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Eventos Guardados</p>
            <p className="text-sm font-bold text-slate-100">{todayEventsCount} Eventos</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Racha Hábitos</p>
            <p className="text-sm font-bold text-slate-100">{maxStreak} Días 🔥</p>
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
                  <h3 className="text-sm font-bold text-slate-100">Agenda & Recordatorios</h3>
                  <p className="text-xs text-slate-400">Time-blocking exacto con notificaciones</p>
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
                  <p className="text-xs text-slate-400">Ingresos, gastos y gráficos mes a mes</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link href="/passwords">
          <Card className="hover:border-purple-500/50 transition-all cursor-pointer mb-3 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Bóveda de Contraseñas</h3>
                  <p className="text-xs text-slate-400">Almacenamiento seguro de claves</p>
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
