'use client';

import { useMemo } from 'react';

interface Event {
  id: string;
  title: string;
  start_time: string;
  category: string;
}

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  events: Event[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CATEGORY_COLORS: Record<string, string> = {
  trabajo: 'bg-sky-500',
  personal: 'bg-purple-500',
  medicamento: 'bg-rose-500',
  cita: 'bg-amber-500',
  evento: 'bg-emerald-500',
  general: 'bg-slate-500',
};

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MonthGrid({ year, month, events, selectedDate, onSelectDate }: MonthGridProps) {
  const { weeks, eventMap } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday-indexed start (0=Mon, 6=Sun)
    let startIdx = (firstDay.getDay() + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startIdx; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    // Map events by date
    const eventMap: Record<string, Event[]> = {};
    events.forEach((ev) => {
      try {
        const d = new Date(ev.start_time);
        const key = toISODate(d);
        if (!eventMap[key]) eventMap[key] = [];
        eventMap[key].push(ev);
      } catch {}
    });

    return { weeks, eventMap };
  }, [year, month, events]);

  const today = toISODate(new Date());

  return (
    <div className="space-y-1">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-slate-100">
          {MONTHS_ES[month]} {year}
        </h2>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_ES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks Grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-0.5">
          {week.map((day, di) => {
            if (day === null) return <div key={di} />;

            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventMap[iso] || [];
            const isToday = iso === today;
            const isSelected = iso === selectedDate;

            return (
              <button
                key={di}
                onClick={() => onSelectDate(iso)}
                className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-sky-500/20 border border-sky-500/40'
                    : isToday
                    ? 'bg-slate-700/30 border border-slate-600/30'
                    : 'hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    isToday ? 'text-sky-400 font-bold' : isSelected ? 'text-sky-300' : 'text-slate-300'
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          CATEGORY_COLORS[ev.category?.toLowerCase()] || CATEGORY_COLORS.general
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
