'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar as CalendarIcon, Clock, Plus, Tag } from 'lucide-react';

const mockEvents = [
  { id: '1', title: 'Reunión de Planificación SaaS', time: '10:00 AM - 11:00 AM', category: 'Trabajo' },
  { id: '2', title: 'Sesión de Vibe Coding Gemini', time: '02:00 PM - 04:00 PM', category: 'Desarrollo' },
  { id: '3', title: 'Revisión de Métricas Financieras', time: '05:30 PM - 06:00 PM', category: 'Finanzas' },
];

export default function CalendarPage() {
  const [events, setEvents] = useState(mockEvents);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
            <span>Agenda & Bloques</span>
          </h1>
          <p className="text-xs text-slate-400">Planifica tu día con time-blocking inteligente</p>
        </div>
        <Button variant="primary" className="!py-1.5 !px-3 text-xs">
          <Plus className="w-4 h-4" />
          <span>Nuevo</span>
        </Button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="hover:border-sky-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-100 text-sm">{event.title}</h3>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    {event.time}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-300">
                    <Tag className="w-3 h-3 text-sky-400" />
                    {event.category}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
