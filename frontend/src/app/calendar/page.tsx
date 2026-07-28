'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Calendar as CalendarIcon, Clock, Plus, Tag, Trash2, CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  category: string;
  start_time?: string;
  reminder_minutes_before?: number;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('Trabajo');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  useEffect(() => {
    apiClient.get('/api/calendar/events')
      .then(res => {
        if (res.data?.data) {
          setEvents(res.data.data.map((e: any) => ({
            id: e.id || String(Math.random()),
            title: e.title,
            time: e.start_time ? new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            category: e.category || 'General',
            start_time: e.start_time,
            reminder_minutes_before: e.reminder_minutes_before
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

    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    const startIso = eventDate.toISOString();

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title,
      time: time || '12:00 PM',
      category,
      start_time: startIso,
      reminder_minutes_before: reminderMinutes
    };
    setEvents([newEvent, ...events]);
    setTitle('');
    setTime('');
    setIsModalOpen(false);

    apiClient.post('/api/calendar/events', {
      title,
      start_time: startIso,
      end_time: startIso,
      category,
      reminder_minutes_before: reminderMinutes
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    setEvents(events.filter(e => e.id !== id));
    apiClient.delete(`/api/calendar/events/${id}`).catch(() => {});
  };

  // Monthly Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const prevMonth = () => {
    triggerHaptic('light');
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  };

  const nextMonth = () => {
    triggerHaptic('light');
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
            <span>Agenda & Grilla Mensual</span>
          </h1>
          <p className="text-xs text-slate-400">Navega por meses y gestiona recordatorios</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs">
          <Plus className="w-4 h-4" />
          <span>Nuevo</span>
        </Button>
      </div>

      {/* Monthly Navigation Header */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-slate-100">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500 mb-1">
          <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            const isSelected = dayNum === selectedDay;
            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <button
                key={dayNum}
                onClick={() => { triggerHaptic('light'); setSelectedDay(dayNum); }}
                className={`h-8 rounded-xl flex items-center justify-center text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold scale-105'
                    : isToday
                    ? 'border border-sky-400 text-sky-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Events for Selected Day */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Eventos para el {selectedDay} de {monthNames[month]}
        </h2>

        {events.length === 0 && !isLoading ? (
          <Card className="text-center py-6 px-4 border-dashed border-slate-800">
            <CalendarX className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Sin eventos para esta fecha</h3>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="mx-auto !text-xs mt-2">
              + Agendar Evento
            </Button>
          </Card>
        ) : (
          events.map((event) => (
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
                  {event.reminder_minutes_before && (
                    <p className="text-[10px] text-amber-400">
                      🔔 Recordatorio: {event.reminder_minutes_before}m antes
                    </p>
                  )}
                </div>
                <button onClick={() => handleDelete(event.id)} className="text-slate-500 hover:text-red-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Agendar Nuevo Evento */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Agendar Evento (${selectedDay} de ${monthNames[month]})`}>
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
          <div>
            <label className="text-xs text-slate-400 block mb-1">Recordatorio en Telegram</label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value={0}>Al momento del evento</option>
              <option value={15}>15 minutos antes</option>
              <option value={30}>30 minutos antes</option>
              <option value={60}>1 hora antes</option>
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
