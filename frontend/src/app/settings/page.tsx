'use client';

import { useState, useEffect } from 'react';
import { useTelegramUser } from '@/hooks/useTelegramUser';
import { apiClient } from '@/lib/api_client';
import { triggerHaptic } from '@/lib/telegram';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MapPin, Palette, Type, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

type ThemeChoice = 'auto' | 'light' | 'dark';
type ScaleChoice = 'sm' | 'md' | 'lg';

export default function SettingsPage() {
  const { user } = useTelegramUser();
  const [theme, setTheme] = useState<ThemeChoice>('auto');
  const [fontScale, setFontScale] = useState<ScaleChoice>('md');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage first
    const savedTheme = localStorage.getItem('app_theme') as ThemeChoice | null;
    const savedScale = localStorage.getItem('app_font_scale') as ScaleChoice | null;
    const savedCity = localStorage.getItem('app_city');
    if (savedTheme) setTheme(savedTheme);
    if (savedScale) setFontScale(savedScale);
    if (savedCity) setCity(savedCity);

    // Apply immediately
    applyTheme(savedTheme || 'auto');
    applyFontScale(savedScale || 'md');

    // Try to get location from browser
    if (!savedCity && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            // Reverse geocode with Open-Meteo
            const resp = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${latitude}&longitude=${longitude}&count=1&language=es&format=json`
            );
            if (resp.ok) {
              const data = await resp.json();
              if (data.results?.length) {
                setCity(data.results[0].name);
              }
            }
          } catch {
            // Ignore reverse geocode errors
          }
        },
        () => {
          // Geolocation denied — do nothing
        }
      );
    }
  }, []);

  function applyTheme(t: ThemeChoice) {
    const root = document.documentElement;
    if (t === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', t);
    }
  }

  function applyFontScale(s: ScaleChoice) {
    const root = document.documentElement;
    root.setAttribute('data-scale', s);
  }

  function handleThemeChange(t: ThemeChoice) {
    setTheme(t);
    localStorage.setItem('app_theme', t);
    applyTheme(t);
    triggerHaptic('light');
  }

  function handleScaleChange(s: ScaleChoice) {
    setFontScale(s);
    localStorage.setItem('app_font_scale', s);
    applyFontScale(s);
    triggerHaptic('light');
  }

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      await apiClient.patch('/api/users/preferences', {
        city: city || undefined,
      });
      localStorage.setItem('app_city', city);
      setSaved(true);
      triggerHaptic('medium');
    } catch (err) {
      console.error('Failed to save preferences', err);
    } finally {
      setLoading(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const themes: { value: ThemeChoice; label: string; icon: string }[] = [
    { value: 'auto', label: 'Auto', icon: '📱' },
    { value: 'light', label: 'Claro', icon: '☀️' },
    { value: 'dark', label: 'Oscuro', icon: '🌙' },
  ];

  const scales: { value: ScaleChoice; label: string; desc: string }[] = [
    { value: 'sm', label: 'Chico', desc: 'A' },
    { value: 'md', label: 'Medio', desc: 'A' },
    { value: 'lg', label: 'Grande', desc: 'A' },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <h1 className="text-lg font-bold text-slate-100">Ajustes</h1>
      </div>

      {/* Theme */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-slate-200">Tema</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                theme === t.value
                  ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span className="text-lg mb-1">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Font Scale */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <Type className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-bold text-slate-200">Tamaño de Texto</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {scales.map((s) => (
            <button
              key={s.value}
              onClick={() => handleScaleChange(s.value)}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                fontScale === s.value
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span
                className={`font-bold mb-1 ${
                  s.value === 'sm' ? 'text-sm' : s.value === 'md' ? 'text-base' : 'text-xl'
                }`}
              >
                {s.desc}
              </span>
              <span className="text-xs font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Location */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-200">Ubicación</h2>
        </div>
        <p className="text-xs text-slate-400">
          Para el resumen matutino con clima. Tu ubicación se usa solo para calcular el clima de tu zona.
        </p>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ej: Buenos Aires"
          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  const { latitude, longitude } = pos.coords;
                  try {
                    const resp = await fetch(
                      `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${latitude}&longitude=${longitude}&count=1&language=es&format=json`
                    );
                    if (resp.ok) {
                      const data = await resp.json();
                      if (data.results?.length) {
                        setCity(data.results[0].name);
      triggerHaptic('medium');
                      }
                    }
                  } catch {
                    alert('No se pudo determinar la ciudad. Ingresala manualmente.');
                  }
                },
                () => {
                  alert('Permiso de ubicación denegado. Ingresá tu ciudad manualmente.');
                }
              );
            }
          }}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          📍 Detectar mi ubicación automáticamente
        </button>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={loading}
        variant="primary"
        className="w-full"
      >
        {saved ? (
          <span className="flex items-center justify-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Guardado</span>
          </span>
        ) : loading ? (
          'Guardando...'
        ) : (
          'Guardar Ajustes'
        )}
      </Button>
    </div>
  );
}
