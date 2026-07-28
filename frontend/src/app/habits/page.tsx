'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CheckSquare, Flame, Plus, Check, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface Habit {
  id: string;
  title: string;
  streak: number;
  completedToday: boolean;
}

const LOCAL_STORAGE_KEY = 'saas_habits_list';

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    // 1. Instant local memory load
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        setHabits(JSON.parse(cached));
      } catch {}
    }

    // 2. Sync with API
    apiClient.get('/api/habits/')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          const apiHabits = res.data.data.map((h: any) => ({
            id: h.id || String(Math.random()),
            title: h.title,
            streak: h.streak_count || 0,
            completedToday: false
          }));
          setHabits(apiHabits);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(apiHabits));
        }
      })
      .catch(() => {});
  }, []);

  const savePersistent = (newList: Habit[]) => {
    setHabits(newList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
  };

  const toggleHabit = (id: string) => {
    triggerHaptic('heavy');
    const updated = habits.map(h => {
      if (h.id === id) {
        const nextState = !h.completedToday;
        return {
          ...h,
          completedToday: nextState,
          streak: nextState ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    });
    savePersistent(updated);
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    const updated = habits.filter(h => h.id !== id);
    savePersistent(updated);
    apiClient.delete(`/api/habits/${id}`).catch(() => {});
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    triggerHaptic('heavy');
    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      streak: 0,
      completedToday: false
    };

    const updated = [...habits, newHabit];
    savePersistent(updated);

    setTitle('');
    setIsModalOpen(false);

    apiClient.post('/api/habits/', {
      title,
      target_frequency: 'daily'
    }).catch(() => {});
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <span>Matriz de Hábitos</span>
          </h1>
          <p className="text-xs text-slate-400">Construye constancia diaria con memoria persistente</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs bg-amber-600 hover:bg-amber-500">
          <Plus className="w-4 h-4" />
          <span>Hábito</span>
        </Button>
      </div>

      <div className="space-y-3">
        {habits.length === 0 ? (
          <p className="text-xs text-slate-500 italic px-1">Sin hábitos registrados aún.</p>
        ) : (
          habits.map((habit) => (
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
              <button onClick={() => handleDelete(habit.id)} className="text-slate-500 hover:text-red-400 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Hábito">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nombre del Hábito</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Tomar 2 litros de agua"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2 bg-amber-600 hover:bg-amber-500">
            Guardar Hábito
          </Button>
        </form>
      </Modal>
    </div>
  );
}
