'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Calendar as CalendarIcon, Clock, Plus, Tag, Trash2, CalendarX } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  category: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('Trabajo');

  useEffect(() => {
    apiClient.get('/api/calendar/events')
      .then(res => {
        if (res.data?.data) {
          setEvents(res.data.data.map((e: any) => ({
            id: e.id || String(Math.random()),
            title: e.title,
            time: e.start_time ? new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            category: e.category || 'General'
          })));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    triggerHaptic('heavy');
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title,
      time: time || '12:00 PM',
      category
    };
    setEvents([newEvent, ...events]);
    setTitle('');
    setTime('');
    setIsModalOpen(false);

    apiClient.post('/api/calendar/events', {
      title,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      category
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    setEvents(events.filter(e => e.id !== id));
  };

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
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs">
          <Plus className="w-4 h-4" />
          <span>Nuevo</span>
        </Button>
      </div>

      {events.length === 0 && !isLoading ? (
        <Card className="text-center py-8 px-4 border-dashed border-slate-800">
          <CalendarX className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Sin eventos agendados</h3>
          <p className="text-xs text-slate-500 mb-4">Toca el botón superior para crear tu primer evento.</p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline" className="mx-auto !text-xs">
            + Agendar Evento
          </Button>
        </Card>
      ) : (
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
                <button onClick={() => handleDelete(event.id)} className="text-slate-500 hover:text-red-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agendar Nuevo Evento">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Título del Evento</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Reunión con cliente"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Horario</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Ej: 04:00 PM - 05:00 PM"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="Trabajo">Trabajo</option>
              <option value="Desarrollo">Desarrollo</option>
              <option value="Personal">Personal</option>
              <option value="Finanzas">Finanzas</option>
            </select>
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2">
            Guardar Evento
          </Button>
        </form>
      </Modal>
    </div>
  );
}
