'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckSquare, Flame, Plus, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';

const initialHabits = [
  { id: '1', title: 'Meditar 10 minutos', streak: 5, completedToday: true },
  { id: '2', title: 'Hacer ejercicio 45m', streak: 3, completedToday: false },
  { id: '3', title: 'Leer 20 páginas de libro', streak: 12, completedToday: false },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState(initialHabits);

  const toggleHabit = (id: string) => {
    triggerHaptic('heavy');
    setHabits(habits.map(h => {
      if (h.id === id) {
        const nextState = !h.completedToday;
        return {
          ...h,
          completedToday: nextState,
          streak: nextState ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <span>Matriz de Hábitos</span>
          </h1>
          <p className="text-xs text-slate-400">Construye constancia diaria con vibración háptica</p>
        </div>
        <Button variant="primary" className="!py-1.5 !px-3 text-xs bg-amber-600 hover:bg-amber-500">
          <Plus className="w-4 h-4" />
          <span>Hábito</span>
        </Button>
      </div>

      <div className="space-y-3">
        {habits.map((habit) => (
          <Card key={habit.id} className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleHabit(habit.id)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  habit.completedToday
                    ? 'bg-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/30'
                    : 'border-2 border-slate-700 hover:border-slate-500'
                }`}
              >
                {habit.completedToday && <Check className="w-4 h-4 stroke-[3]" />}
              </button>
              <div>
                <p className={`text-sm font-semibold ${habit.completedToday ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                  {habit.title}
                </p>
                <div className="flex items-center space-x-1 text-[11px] text-amber-400 font-medium">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  <span>Racha de {habit.streak} días</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
