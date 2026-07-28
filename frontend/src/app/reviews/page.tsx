'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MapPin, Plus, Trash2, Star, Navigation } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface Review {
  id: string;
  place_name: string;
  latitude: number;
  longitude: number;
  rating: number;
  comment: string;
}

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816]; // Buenos Aires

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [userPos, setUserPos] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Get user position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }

    // Load reviews
    apiClient.get('/api/reviews/')
      .then(res => {
        if (res.data?.data) setReviews(res.data.data);
      })
      .catch(() => {})
      .finally(() => { setIsLoading(false); setMapReady(true); });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName) return;
    triggerHaptic('heavy');

    try {
      const res = await apiClient.post('/api/reviews/', {
        place_name: placeName,
        latitude: userPos[0],
        longitude: userPos[1],
        rating,
        comment,
      });
      if (res.data?.data) {
        setReviews([res.data.data, ...reviews]);
      }
    } catch (err) {
      console.error('Failed to create review', err);
    }
    setPlaceName('');
    setRating(5);
    setComment('');
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    triggerHaptic('rigid');
    try {
      await apiClient.delete(`/api/reviews/${id}`);
      setReviews(reviews.filter(r => r.id !== id));
      setSelectedReview(null);
    } catch (err) {
      console.error('Failed to delete review', err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            <span>Reseñas Locales</span>
          </h1>
          <p className="text-xs text-slate-400">Tus lugares guardados en el mapa</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs">
          <Plus className="w-4 h-4" />
          <span>Nueva</span>
        </Button>
      </div>

      {/* Map */}
      {mapReady && (
        <Card className="overflow-hidden !p-0" style={{ height: 280 }}>
          {typeof window !== 'undefined' && (
            <MapContainer
              center={userPos}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {reviews.map((rev) => (
                <Marker
                  key={rev.id}
                  position={[rev.latitude, rev.longitude]}
                  eventHandlers={{ click: () => setSelectedReview(rev) }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{rev.place_name}</strong>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      {rev.comment && <p className="text-xs mt-1 text-gray-600">{rev.comment}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </Card>
      )}

      {/* Selected Review Detail */}
      {selectedReview && (
        <Card className="border-sky-500/30">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-100 text-sm">{selectedReview.place_name}</h3>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < selectedReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                ))}
              </div>
              {selectedReview.comment && (
                <p className="text-xs text-slate-400">{selectedReview.comment}</p>
              )}
              <p className="text-[10px] text-slate-500">
                📍 {selectedReview.latitude.toFixed(4)}, {selectedReview.longitude.toFixed(4)}
              </p>
            </div>
            <button onClick={() => handleDelete(selectedReview.id)} className="text-slate-500 hover:text-red-400 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Todas tus reseñas ({reviews.length})
          </h3>
          {reviews.map((rev) => (
            <Card
              key={rev.id}
              className={`hover:border-sky-500/40 transition-all cursor-pointer ${
                selectedReview?.id === rev.id ? 'border-sky-500/40' : ''
              }`}
              onClick={() => setSelectedReview(rev)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100 text-sm">{rev.place_name}</h3>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                    ))}
                  </div>
                  {rev.comment && <p className="text-xs text-slate-400 line-clamp-2">{rev.comment}</p>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(rev.id); }}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {reviews.length === 0 && !isLoading && (
        <Card className="text-center py-8 border-dashed border-slate-700">
          <Navigation className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Sin reseñas aún</h3>
          <p className="text-xs text-slate-500 mb-4">Guarda tus lugares favoritos con reseñas y ubicación.</p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline" className="mx-auto !text-xs">
            + Agregar Reseña
          </Button>
        </Card>
      )}

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Reseña">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nombre del Lugar</label>
            <input
              type="text"
              required
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Ej: Café Tortoni"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Calificación</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1"
                >
                  <Star className={`w-6 h-6 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Excelente lugar, muy copado..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            Se usará tu ubicación actual para el pin del mapa
          </p>
          <Button type="submit" variant="primary" className="w-full mt-2">
            Guardar Reseña
          </Button>
        </form>
      </Modal>
    </div>
  );
}
