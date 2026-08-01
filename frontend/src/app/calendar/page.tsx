'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Calendar as CalendarIcon, Clock, Plus, Tag, Trash2, CalendarX, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
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

const LOCAL_STORAGE_KEY = 'saas_calendar_events';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  
  // Time Picker State (Exact Time String "HH:MM")
  const [timePicker, setTimePicker] = useState<string>('09:00');
  const [category, setCategory] = useState('Trabajo');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);

  // Month & Day Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Persistent Memory Load
  useEffect(() => {
    // 1. Instant local memory load
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        setEvents(JSON.parse(cached));
      } catch {}
    }

    // 2. Sync with API
    apiClient.get('/api/calendar/events')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          const apiEvents = res.data.data.map((e: any) => ({
            id: e.id || String(Math.random()),
            title: e.title,
            time: e.start_time ? new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM',
            category: e.category || 'General',
            start_time: e.start_time,
            reminder_minutes_before: e.reminder_minutes_before
          }));
          setEvents(apiEvents);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(apiEvents));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Save persistent state
  const savePersistent = (newList: CalendarEvent[]) => {
    setEvents(newList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !timePicker) return;
    triggerHaptic('heavy');

    const [hours, minutes] = timePicker.split(':').map(Number);
    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, hours, minutes);
    const startIso = eventDate.toISOString();
    const formattedDisplayTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title,
      time: formattedDisplayTime,
      category,
      start_time: startIso,
      reminder_minutes_before: reminderMinutes
    };

    const updated = [newEvent, ...events];
    savePersistent(updated);

    setTitle('');
    setTimePicker('09:00');
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
    const updated = events.filter(e => e.id !== id);
    savePersistent(updated);
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

  const quickTimes = ['09:00', '12:00', '15:00', '18:00', '20:00'];

  // Filter events for currently selected day or display all if no match
  const selectedDayEvents = events.filter(ev => {
    if (!ev.start_time) return true;
    const evDate = new Date(ev.start_time);
    return (
      evDate.getDate() === selectedDay &&
      evDate.getMonth() === month &&
      evDate.getFullYear() === year
    );
  });

  const displayEvents = selectedDayEvents.length > 0 ? selectedDayEvents : events;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
            <span>Agenda & Notificaciones</span>
          </h1>
          <p className="text-xs text-slate-400">Time-blocking exacto con avisos de Telegram</p>
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

            const hasEvents = events.some(ev => {
              if (!ev.start_time) return false;
              const d = new Date(ev.start_time);
              return d.getDate() === dayNum && d.getMonth() === month && d.getFullYear() === year;
            });

            return (
              <button
                key={dayNum}
                onClick={() => { triggerHaptic('light'); setSelectedDay(dayNum); }}
                className={`h-8 rounded-xl relative flex items-center justify-center text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold scale-105'
                    : isToday
                    ? 'border border-sky-400 text-sky-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {dayNum}
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sky-400" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Events List — Always show all events sorted by date so nothing is hidden */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Todos los Eventos Agendados ({events.length})
          </h2>
          {selectedDayEvents.length > 0 && (
            <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/50">
              {selectedDayEvents.length} el día {selectedDay}
            </span>
          )}
        </div>

        {events.length === 0 && !isLoading ? (
          <Card className="text-center py-6 px-4 border-dashed border-slate-800">
            <CalendarX className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Sin eventos agendados</h3>
            <p className="text-[11px] text-slate-400 mb-2">Pedile al bot por Telegram o presiona "Nuevo"</p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="mx-auto !text-xs mt-2">
              + Agendar Evento
            </Button>
          </Card>
        ) : (
          events
            .slice()
            .sort((a, b) => {
              if (!a.start_time) return 1;
              if (!b.start_time) return -1;
              return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            })
            .map((event) => {
              const evDate = event.start_time ? new Date(event.start_time) : null;
              const dateStr = evDate
                ? `${evDate.getDate()} de ${monthNames[evDate.getMonth()]} ${evDate.getFullYear()}`
                : `${selectedDay} de ${monthNames[month]}`;

              const isSelectedDayMatch = evDate && evDate.getDate() === selectedDay && evDate.getMonth() === month && evDate.getFullYear() === year;

              return (
                <Card
                  key={event.id}
                  className={`transition-all ${
                    isSelectedDayMatch
                      ? 'border-sky-500/80 bg-slate-900/90 shadow-md shadow-sky-500/10'
                      : 'hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100 text-sm">{event.title}</h3>
                        {isSelectedDayMatch && (
                          <span className="text-[9px] bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded font-bold">DÍA SELECCIONADO</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-sky-400">
                          <Clock className="w-3.5 h-3.5" />
                          {dateStr} — {event.time}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-300">
                          <Tag className="w-3 h-3 text-sky-400" />
                          {event.category}
                        </span>
                      </div>
                      {event.reminder_minutes_before !== undefined && (
                        <p className="text-[10px] text-amber-400 flex items-center gap-1 pt-0.5 font-medium">
                          <Bell className="w-3 h-3 fill-amber-400" />
                          Recordatorio activado: {event.reminder_minutes_before === 0 ? 'A la hora exacta' : `${event.reminder_minutes_before} min antes`}
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleDelete(event.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })
        )}
      </div>

      {/* Modal: Agendar Nuevo Evento */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Agendar Evento para el ${selectedDay} de ${monthNames[month]}`}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>📅 Fecha seleccionada:</span>
            <strong className="text-sky-400">{selectedDay} de {monthNames[month]} {year}</strong>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Título del Evento</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Reunión de trabajo, Cita médica"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Exact Time Picker with Preset Buttons */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Hora Exacta</label>
            <div className="space-y-2">
              <input
                type="time"
                required
                value={timePicker}
                onChange={(e) => setTimePicker(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-sky-400 focus:outline-none focus:border-sky-500"
              />
              <div className="flex gap-1.5 flex-wrap">
                {quickTimes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { triggerHaptic('light'); setTimePicker(t); }}
                    className={`px-2 py-1 text-[11px] rounded-lg border font-mono transition-colors ${
                      timePicker === t
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
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
              <option value="Medicamento">Medicamento</option>
              <option value="Finanzas">Finanzas</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Notificación en Telegram</label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value={0}>⏰ A la hora exacta</option>
              <option value={15}>🔔 15 minutos antes</option>
              <option value={30}>🔔 30 minutos antes</option>
              <option value={60}>🔔 1 hora antes</option>
            </select>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2">
            Guardar Evento & Activar Notificación
          </Button>
        </form>
      </Modal>
    </div>
  );
}
