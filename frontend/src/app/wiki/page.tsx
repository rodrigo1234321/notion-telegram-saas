'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Plus, Tag, FileText } from 'lucide-react';

const mockNotes = [
  {
    id: '1',
    title: '💡 Ideas para la Mini App Notion',
    tags: ['ideas', 'saas', 'notion'],
    preview: 'Sistema completo de productividad personal integrado en Telegram con Gemini AI...',
    updatedAt: 'Hace 2 horas'
  },
  {
    id: '2',
    title: '📚 Resumen de Arquitectura FastAPI',
    tags: ['backend', 'python', 'fastapi'],
    preview: 'Middleware de validación HMAC-SHA256 y controladores de endpoints...',
    updatedAt: 'Ayer'
  }
];

export default function WikiPage() {
  const [notes, setNotes] = useState(mockNotes);

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
        <Button variant="primary" className="!py-1.5 !px-3 text-xs bg-purple-600 hover:bg-purple-500">
          <Plus className="w-4 h-4" />
          <span>Nota</span>
        </Button>
      </div>

      <div className="space-y-3">
        {notes.map((note) => (
          <Card key={note.id} className="hover:border-purple-500/40 transition-all cursor-pointer">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" />
                  {note.title}
                </h3>
                <span className="text-[10px] text-slate-400">{note.updatedAt}</span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">{note.preview}</p>
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
    </div>
  );
}
