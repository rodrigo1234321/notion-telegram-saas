'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BookOpen, Plus, FileText, Search, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface WikiNote {
  id: string;
  title: string;
  tags: string[];
  content: string;
  updatedAt: string;
}

const initialNotes: WikiNote[] = [
  {
    id: '1',
    title: '💡 Ideas para la Mini App Notion',
    tags: ['ideas', 'saas', 'notion'],
    content: 'Sistema completo de productividad personal integrado en Telegram con Gemini AI, RLS en Supabase y soporte para temas dinámicos.',
    updatedAt: 'Hace 2 horas'
  },
  {
    id: '2',
    title: '📚 Resumen de Arquitectura FastAPI',
    tags: ['backend', 'python', 'fastapi'],
    content: 'Middleware de validación HMAC-SHA256 y controladores de endpoints para calendar, kanban, finance, habits y wiki.',
    updatedAt: 'Ayer'
  }
];

export default function WikiPage() {
  const [notes, setNotes] = useState<WikiNote[]>(initialNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<WikiNote | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    apiClient.get('/api/wiki/notes')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          setNotes(res.data.data.map((n: any) => ({
            id: n.id || String(Math.random()),
            title: n.title,
            tags: n.tags || ['general'],
            content: n.content_json?.content?.[0]?.text || 'Nota sin contenido.',
            updatedAt: 'Reciente'
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    triggerHaptic('heavy');
    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const newNote: WikiNote = {
      id: Date.now().toString(),
      title,
      tags: parsedTags.length > 0 ? parsedTags : ['general'],
      content,
      updatedAt: 'Ahora'
    };
    setNotes([newNote, ...notes]);
    setTitle('');
    setContent('');
    setTagsInput('');
    setIsModalOpen(false);

    apiClient.post('/api/wiki/notes', {
      title,
      tags: parsedTags,
      content_json: { type: 'doc', content: [{ type: 'paragraph', text: content }] }
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    setNotes(notes.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Wiki & Notas Notion</span>
          </h1>
          <p className="text-xs text-slate-400">Bloc de notas limpio con etiquetas y búsqueda</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs bg-purple-600 hover:bg-purple-500">
          <Plus className="w-4 h-4" />
          <span>Nota</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar notas por título o etiqueta..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="space-y-3">
        {filteredNotes.map((note) => (
          <Card
            key={note.id}
            className="hover:border-purple-500/40 transition-all cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3
                  onClick={() => { triggerHaptic('light'); setSelectedNote(note); }}
                  className="font-semibold text-slate-100 text-sm flex items-center gap-1.5 hover:text-purple-300"
                >
                  <FileText className="w-4 h-4 text-purple-400" />
                  {note.title}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400">{note.updatedAt}</span>
                  <button onClick={() => handleDelete(note.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p
                onClick={() => { triggerHaptic('light'); setSelectedNote(note); }}
                className="text-xs text-slate-300 line-clamp-2"
              >
                {note.content}
              </p>
              <div className="flex gap-1.5 pt-1">
                {note.tags.map((tag) => (
                  <span key={tag} className="text-[9px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-md font-mono">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: View Note */}
      <Modal isOpen={!!selectedNote} onClose={() => setSelectedNote(null)} title={selectedNote?.title || 'Detalle de Nota'}>
        <div className="space-y-3 text-xs text-slate-200">
          <p className="leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
            {selectedNote?.content}
          </p>
          <div className="flex gap-1.5">
            {selectedNote?.tags.map((t) => (
              <span key={t} className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-md font-mono">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal: Create Note */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Nota">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Título de la Nota</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Resumen de reunión"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Contenido</label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tus notas en formato Notion..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Etiquetas (separadas por coma)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ideas, saas, trabajo"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2 bg-purple-600 hover:bg-purple-500">
            Guardar Nota
          </Button>
        </form>
      </Modal>
    </div>
  );
}
