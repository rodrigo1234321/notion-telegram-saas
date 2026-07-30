'use client';

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, MapPin, RefreshCw } from 'lucide-react';
import { Card } from './Card';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  city: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = (lat = -34.6037, lon = -58.3816, cityName = 'Buenos Aires') => {
    setLoading(true);
    setError(false);

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
      .then((res) => res.json())
      .then((data) => {
        if (data.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            weatherCode: data.current.weather_code,
            city: cityName,
          });
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Try HTML5 Geolocation API
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Tu Ubicación'),
        () => fetchWeather() // fallback to Buenos Aires
      );
    } else {
      fetchWeather();
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-7 h-7 text-amber-400 animate-spin-slow" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-7 h-7 text-sky-300" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-7 h-7 text-blue-400" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-7 h-7 text-indigo-200" />;
    if (code >= 95) return <CloudLightning className="w-7 h-7 text-yellow-400" />;
    return <Cloud className="w-7 h-7 text-sky-400" />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Despejado / Soleado';
    if (code === 1 || code === 2) return 'Parcialmente Nublado';
    if (code === 3) return 'Nublado';
    if (code >= 51 && code <= 67) return 'Lluvia / Llovizna';
    if (code >= 71 && code <= 77) return 'Nieve';
    if (code >= 95) return 'Tormenta Eléctrica';
    return 'Templado';
  };

  if (loading) {
    return (
      <Card className="p-3 bg-slate-900/80 border-slate-800 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3 w-20 bg-slate-800 rounded" />
            <div className="h-5 w-16 bg-slate-800 rounded" />
          </div>
          <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return null;
  }

  return (
    <Card className="p-3.5 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-sky-500/20 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-2xl bg-sky-500/10 border border-sky-500/20">
            {getWeatherIcon(weather.weatherCode)}
          </div>
          <div>
            <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>{weather.city}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-slate-100">{weather.temperature}°C</span>
              <span className="text-xs font-medium text-sky-300">{getWeatherDescription(weather.weatherCode)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] text-slate-400 pl-2 border-l border-slate-800">
          <div className="flex items-center space-x-1">
            <Droplets className="w-3 h-3 text-blue-400" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Wind className="w-3 h-3 text-teal-400" />
            <span>{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
