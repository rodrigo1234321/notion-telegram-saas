'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Trello, Plus, AlertCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface KanbanTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
}

const initialTasks: KanbanTask[] = [
  { id: '1', title: 'Diseñar Landing Page', status: 'todo', priority: 'alta' },
  { id: '2', title: 'Integrar Gemini Function Calling', status: 'in_progress', priority: 'urgente' },
  { id: '3', title: 'Configurar Supabase RLS', status: 'done', priority: 'media' },
];

export default function KanbanPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');

  useEffect(() => {
    apiClient.get('/api/kanban/tasks')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          setTasks(res.data.data.map((t: any) => ({
            id: t.id || String(Math.random()),
            title: t.title,
            status: t.status || 'todo',
            priority: t.priority || 'media'
          })));
        }
      })
      .catch(() => {});
  }, []);

  const moveTask = (id: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    triggerHaptic('medium');
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    triggerHaptic('heavy');
    const newTask: KanbanTask = {
      id: Date.now().toString(),
      title,
      status: 'todo',
      priority
    };
    setTasks([newTask, ...tasks]);
    setTitle('');
    setIsModalOpen(false);

    apiClient.post('/api/kanban/tasks', {
      title,
      status: 'todo',
      priority
    }).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Trello className="w-5 h-5 text-indigo-400" />
            <span>Tablero Kanban</span>
          </h1>
          <p className="text-xs text-slate-400">Organiza tus proyectos y pendientes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs">
          <Plus className="w-4 h-4" />
          <span>Tarea</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Column: Por Hacer */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pendiente ({tasks.filter(t => t.status === 'todo').length})</span>
          </h2>
          {tasks.filter(t => t.status === 'todo').map((task) => (
            <Card key={task.id} className="space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-200">{task.title}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium capitalize">
                    {task.priority}
                  </span>
                  <button onClick={() => handleDelete(task.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => moveTask(task.id, 'in_progress')}
                  className="text-[10px] text-sky-400 hover:underline font-medium"
                >
                  Mover a En Proceso →
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Column: En Proceso */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>En Proceso ({tasks.filter(t => t.status === 'in_progress').length})</span>
          </h2>
          {tasks.filter(t => t.status === 'in_progress').map((task) => (
            <Card key={task.id} className="space-y-2 border-sky-500/30">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-200">{task.title}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 font-medium capitalize">
                    {task.priority}
                  </span>
                  <button onClick={() => handleDelete(task.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => moveTask(task.id, 'done')}
                  className="text-[10px] text-emerald-400 hover:underline font-medium"
                >
                  Mover a Completado ✓
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Column: Completado */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completado ({tasks.filter(t => t.status === 'done').length})</span>
          </h2>
          {tasks.filter(t => t.status === 'done').map((task) => (
            <Card key={task.id} className="opacity-75 flex justify-between items-center">
              <p className="text-sm line-through text-slate-400">{task.title}</p>
              <button onClick={() => handleDelete(task.id)} className="text-slate-500 hover:text-red-400 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Card>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Tarea">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Título de la Tarea</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Implementar sistema de pagos"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Prioridad</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500">
            Guardar Tarea
          </Button>
        </form>
      </Modal>
    </div>
  );
}
