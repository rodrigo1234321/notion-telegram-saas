'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, ShieldCheck, Lock, Unlock, Delete, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface PasswordRecord {
  id: string;
  service_name: string;
  username: string;
  password_value: string;
  category: string;
  notes?: string;
}

const LOCAL_STORAGE_KEY = 'saas_passwords_vault';
const PIN_STORAGE_KEY = 'saas_vault_pin';

export default function PasswordsPage() {
  const [passwords, setPasswords] = useState<PasswordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Security PIN Lock State
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [inputPin, setInputPin] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinError, setPinError] = useState<boolean>(false);
  const [isSettingNewPin, setIsSettingNewPin] = useState<boolean>(false);

  // Form State
  const [serviceName, setServiceName] = useState('');
  const [username, setUsername] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [category, setCategory] = useState('Personal');
  const [notes, setNotes] = useState('');

  // Persistent Memory Load & PIN Initialization
  useEffect(() => {
    // Read saved PIN from localStorage
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (storedPin && storedPin.length === 4) {
      setSavedPin(storedPin);
      setIsUnlocked(false);
    } else {
      setIsSettingNewPin(true);
    }

    // 1. Instant local memory load
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        setPasswords(JSON.parse(cached));
      } catch {}
    }

    // 2. Sync with API
    apiClient.get('/api/passwords/')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          const apiList = res.data.data.map((p: any) => ({
            id: p.id || String(Math.random()),
            service_name: p.service_name || p.service || 'Servicio',
            username: p.username || '',
            password_value: p.password_value || p.password || '',
            category: p.category || 'General',
            notes: p.notes || ''
          }));
          setPasswords(apiList);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(apiList));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Handle Numeric Keypad Presses
  const handleNumKeyPress = (num: string) => {
    if (inputPin.length >= 4) return;
    triggerHaptic('light');
    const updatedPin = inputPin + num;
    setInputPin(updatedPin);
    setPinError(false);

    if (updatedPin.length === 4) {
      if (isSettingNewPin) {
        // Setup new PIN
        localStorage.setItem(PIN_STORAGE_KEY, updatedPin);
        setSavedPin(updatedPin);
        setIsSettingNewPin(false);
        setIsUnlocked(true);
        setInputPin('');
        triggerHaptic('heavy');
      } else if (savedPin && updatedPin === savedPin) {
        // Correct PIN entered
        setIsUnlocked(true);
        setInputPin('');
        triggerHaptic('heavy');
      } else {
        // Incorrect PIN
        triggerHaptic('rigid');
        setPinError(true);
        setTimeout(() => {
          setInputPin('');
          setPinError(false);
        }, 800);
      }
    }
  };

  const handleBackspace = () => {
    if (inputPin.length > 0) {
      triggerHaptic('light');
      setInputPin(prev => prev.slice(0, -1));
    }
  };

  const handleClearPin = () => {
    triggerHaptic('medium');
    setInputPin('');
  };

  const handleLockVault = () => {
    triggerHaptic('medium');
    setIsUnlocked(false);
    setShowPasswordMap({});
  };

  const handleResetPin = () => {
    if (confirm('¿Deseas restablecer tu PIN de seguridad de 4 dígitos?')) {
      localStorage.removeItem(PIN_STORAGE_KEY);
      setSavedPin(null);
      setIsUnlocked(false);
      setIsSettingNewPin(true);
      setInputPin('');
    }
  };

  // Save persistent state
  const savePersistent = (newList: PasswordRecord[]) => {
    setPasswords(newList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !passwordValue) return;
    triggerHaptic('heavy');

    const newRecord: PasswordRecord = {
      id: Date.now().toString(),
      service_name: serviceName,
      username,
      password_value: passwordValue,
      category,
      notes
    };

    const updated = [newRecord, ...passwords];
    savePersistent(updated);

    setServiceName('');
    setUsername('');
    setPasswordValue('');
    setNotes('');
    setIsModalOpen(false);

    apiClient.post('/api/passwords/', {
      service_name: serviceName,
      username,
      password_value: passwordValue,
      category,
      notes
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    const updated = passwords.filter(p => p.id !== id);
    savePersistent(updated);
    apiClient.delete(`/api/passwords/${id}`).catch(() => {});
  };

  const toggleVisibility = (id: string) => {
    triggerHaptic('light');
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    triggerHaptic('medium');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // -------------------------------------------------------------
  // PIN LOCK OVERLAY SCREEN (When Bóveda is locked)
  // -------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="space-y-6 animate-fadeIn py-6 max-w-sm mx-auto">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-100">
            {isSettingNewPin ? 'Crea tu PIN de 4 Dígitos' : 'Bóveda de Claves Protegida'}
          </h2>
          <p className="text-xs text-slate-400 max-w-[260px] mx-auto">
            {isSettingNewPin
              ? 'Ingresa 4 números para proteger el acceso a tus contraseñas.'
              : 'Ingresa tu PIN de 4 dígitos para desbloquear tus contraseñas.'}
          </p>
        </div>

        {/* 4-Digit Indicator Circles */}
        <div className="flex justify-center items-center space-x-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = inputPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pinError
                    ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                    : isFilled
                    ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {pinError && (
          <p className="text-center text-xs font-semibold text-red-400 animate-bounce">
            ⚠️ PIN Incorrecto. Intenta de nuevo.
          </p>
        )}

        {/* Interactive Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 px-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleNumKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-900 border border-slate-800 text-lg font-bold text-slate-100 hover:bg-slate-800 active:scale-95 transition-all shadow-md"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClearPin}
            className="h-14 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-xs font-bold text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
          >
            Limpiar
          </button>
          <button
            onClick={() => handleNumKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-900 border border-slate-800 text-lg font-bold text-slate-100 hover:bg-slate-800 active:scale-95 transition-all shadow-md"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-center text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {!isSettingNewPin && (
          <div className="text-center pt-2">
            <button onClick={handleResetPin} className="text-[11px] text-slate-500 hover:text-emerald-400 transition-colors">
              ¿Olvidaste tu PIN? Restablecer PIN
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // UNLOCKED VAULT VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Bóveda de Contraseñas</span>
          </h1>
          <p className="text-xs text-slate-400">Protegido con PIN de 4 dígitos</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLockVault}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
            title="Bloquear Bóveda"
          >
            <Lock className="w-4 h-4" />
          </button>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs bg-emerald-600 hover:bg-emerald-500">
            <Plus className="w-4 h-4" />
            <span>Nueva Clave</span>
          </Button>
        </div>
      </div>

      {/* Security Status Banner */}
      <Card className="p-3 bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Unlock className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-100">Bóveda Desbloqueada</h3>
            <p className="text-[10px] text-slate-400">Acceso activo seguro. Presiona el candado superior para bloquear.</p>
          </div>
        </div>
        <button onClick={handleResetPin} className="text-[10px] text-emerald-400 font-semibold underline">
          Cambiar PIN
        </button>
      </Card>

      {/* Password Cards List */}
      <div className="space-y-3">
        {passwords.length === 0 && !isLoading ? (
          <Card className="text-center py-8 px-4 border-dashed border-slate-800">
            <Key className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Bóveda Vacía</h3>
            <p className="text-xs text-slate-500 mb-4">Guarda tu primera contraseña presionando el botón superior.</p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="mx-auto !text-xs">
              + Agregar Contraseña
            </Button>
          </Card>
        ) : (
          passwords.map((item) => {
            const isVisible = !!showPasswordMap[item.id];
            const isCopied = copiedId === item.id;

            return (
              <Card key={item.id} className="hover:border-emerald-500/40 transition-all p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{item.service_name}</h3>
                    {item.username && (
                      <p className="text-xs text-slate-400">{item.username}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                      {item.category}
                    </span>
                    <button onClick={() => handleDelete(item.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Password Field with Copy & Toggle */}
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2 mt-1">
                  <span className="font-mono text-xs text-slate-200 tracking-wider">
                    {isVisible ? item.password_value : '••••••••••••'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
                      title="Ver/Ocultar"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(item.password_value, item.id)}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Copiar contraseña"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-[10px] text-slate-500 italic">{item.notes}</p>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Create Password Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Guardar Nueva Contraseña">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nombre del Servicio / App</label>
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Ej: Netflix, Gmail, Wi-Fi Casa"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Usuario / Email (Opcional)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: usuario@gmail.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Contraseña</label>
            <input
              type="text"
              required
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="Escribe la clave aquí..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="Personal">Personal</option>
              <option value="Trabajo">Trabajo</option>
              <option value="Streaming">Streaming</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Redes">Redes Sociales</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Notas (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pregunta de seguridad o PIN"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500">
            Guardar en Bóveda
          </Button>
        </form>
      </Modal>
    </div>
  );
}
