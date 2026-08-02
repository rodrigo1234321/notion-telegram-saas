'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FinanceCharts } from '@/components/charts/FinanceCharts';
import { PieChart, DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Wallet, Award, Percent, FolderPlus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  record_date?: string;
  date?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = 'saas_finance_records';

const DEFAULT_CATEGORIES = [
  'Alimentación',
  'Servicios',
  'Ocio',
  'Transporte',
  'Vivienda',
  'Salud',
  'Educación',
  'Inversiones',
  'Suscripciones',
  'Freelance',
  'Salario',
  'Otros',
  'CUSTOM_OPTION'
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function FinancePage() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentación');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');

  // Month & Year Filter State
  const [filterDate, setFilterDate] = useState(new Date());

  useEffect(() => {
    // 1. Instant local memory load
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        setRecords(JSON.parse(cached));
      } catch {}
    }

    // 2. Sync with API
    apiClient.get('/api/finance/records')
      .then(res => {
        const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (Array.isArray(rawList)) {
          const apiRecords = rawList.map((r: any) => ({
            id: r.id ? String(r.id) : String(Math.random()),
            type: (r.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
            amount: Number(r.amount) || 0,
            category: r.category || 'General',
            description: r.description || '',
            record_date: r.record_date || r.date || r.created_at || new Date().toISOString(),
            date: r.date || r.record_date || r.created_at || new Date().toISOString()
          }));
          setRecords(apiRecords);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(apiRecords));
        }
      })
      .catch(() => {});
  }, []);

  const savePersistent = (newList: FinanceRecord[]) => {
    setRecords(newList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
  };

  // Month Filter Logic
  const selectedYear = filterDate.getFullYear();
  const selectedMonth = filterDate.getMonth();

  const prevMonth = () => {
    triggerHaptic('light');
    setFilterDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const nextMonth = () => {
    triggerHaptic('light');
    setFilterDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  // Filter records for the currently selected month
  const monthlyRecords = records.filter(r => {
    let rawDate = r.record_date || r.date || r.created_at;
    if (!rawDate && r.id && !isNaN(Number(r.id))) {
      rawDate = new Date(Number(r.id)).toISOString();
    }
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Advanced Financial Calculations for selected month
  const totalIncome = monthlyRecords.filter(r => r.type === 'income').reduce((acc, r) => acc + r.amount, 0);
  const totalExpense = monthlyRecords.filter(r => r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const savingsRate = totalIncome > 0
    ? Math.max(0, ((netBalance / totalIncome) * 100)).toFixed(1)
    : '0';

  // Find top expense category for selected month
  const expenseMap: Record<string, number> = {};
  monthlyRecords.filter(r => r.type === 'expense').forEach(r => {
    expenseMap[r.category] = (expenseMap[r.category] || 0) + r.amount;
  });
  const topExpenseCategory = Object.keys(expenseMap).reduce((a, b) => expenseMap[a] > expenseMap[b] ? a : b, 'Ninguna');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    triggerHaptic('heavy');

    const finalCategory = category === 'CUSTOM_OPTION' ? (customCategory.trim() || 'Personalizada') : category;
    const recordDateIso = new Date(selectedYear, selectedMonth, new Date().getDate()).toISOString().split('T')[0];

    const tempId = Date.now().toString();
    const newRecord: FinanceRecord = {
      id: tempId,
      type,
      amount: numAmount,
      category: finalCategory,
      description,
      record_date: recordDateIso,
      date: recordDateIso
    };

    const updated = [newRecord, ...records];
    savePersistent(updated);

    setAmount('');
    setDescription('');
    setCustomCategory('');
    setCategory('Alimentación');
    setIsModalOpen(false);

    apiClient.post('/api/finance/records', {
      type,
      amount: numAmount,
      category: finalCategory,
      description,
      record_date: recordDateIso,
      date: recordDateIso
    }).then(res => {
      const savedData = res.data?.data || (res.data && res.data.id ? res.data : null);
      if (savedData && savedData.id) {
        setRecords(prev => {
          const newList = prev.map(r => r.id === tempId ? { ...r, id: String(savedData.id) } : r);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
          return newList;
        });
      }
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    triggerHaptic('rigid');
    const updated = records.filter(r => r.id !== id);
    savePersistent(updated);
    apiClient.delete(`/api/finance/records/${id}`).catch(() => {});
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span>Finanzas Mensuales</span>
          </h1>
          <p className="text-xs text-slate-400">Control de gastos e ingresos por mes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs bg-emerald-600 hover:bg-emerald-500">
          <Plus className="w-4 h-4" />
          <span>Registro</span>
        </Button>
      </div>

      {/* Month Navigation Selector */}
      <Card className="p-3 bg-slate-900/90 border-slate-800">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 font-extrabold text-sm text-emerald-400">
            <CalendarIcon className="w-4 h-4" />
            <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
          </div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {/* Main KPI Summary Cards for Selected Month */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center space-x-2 text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase">Ingresos {MONTH_NAMES[selectedMonth]}</span>
          </div>
          <p className="text-lg font-extrabold text-slate-100">${totalIncome.toFixed(2)}</p>
        </Card>

        <Card className="p-3 bg-red-500/10 border-red-500/20">
          <div className="flex items-center space-x-2 text-red-400 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase">Gastos {MONTH_NAMES[selectedMonth]}</span>
          </div>
          <p className="text-lg font-extrabold text-slate-100">${totalExpense.toFixed(2)}</p>
        </Card>
      </div>

      {/* Advanced Statistics Grid for Selected Month */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 text-center space-y-0.5 border-slate-800">
          <div className="flex justify-center text-sky-400 mb-0.5">
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-[9px] uppercase font-semibold text-slate-400">Balance Neto</p>
          <p className={`text-xs font-extrabold ${netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${netBalance.toFixed(2)}
          </p>
        </Card>

        <Card className="p-2.5 text-center space-y-0.5 border-slate-800">
          <div className="flex justify-center text-amber-400 mb-0.5">
            <Percent className="w-4 h-4" />
          </div>
          <p className="text-[9px] uppercase font-semibold text-slate-400">Tasa Ahorro</p>
          <p className="text-xs font-extrabold text-amber-400">{savingsRate}%</p>
        </Card>

        <Card className="p-2.5 text-center space-y-0.5 border-slate-800">
          <div className="flex justify-center text-purple-400 mb-0.5">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-[9px] uppercase font-semibold text-slate-400">Mayor Gasto</p>
          <p className="text-[11px] font-extrabold text-purple-300 truncate">
            {monthlyRecords.filter(r => r.type === 'expense').length > 0 ? topExpenseCategory : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Dynamic Visual Analytics */}
      <Card title={`Análisis Gráfico (${MONTH_NAMES[selectedMonth]} ${selectedYear})`} icon={<DollarSign className="w-4 h-4 text-emerald-400" />}>
        <FinanceCharts records={monthlyRecords} />
      </Card>

      {/* Transactions List for Selected Month */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Movimientos de {MONTH_NAMES[selectedMonth]} ({monthlyRecords.length})
        </h3>
        {monthlyRecords.length === 0 ? (
          <p className="text-xs text-slate-500 italic px-1 py-2">No hay movimientos registrados en {MONTH_NAMES[selectedMonth]}.</p>
        ) : (
          monthlyRecords.map((rec) => (
            <Card key={rec.id} className="flex items-center justify-between p-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${rec.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <p className="text-xs font-semibold text-slate-200">{rec.description || rec.category}</p>
                </div>
                <p className="text-[10px] text-slate-400 pl-4">{rec.category}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold ${rec.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {rec.type === 'income' ? '+' : '-'}${rec.amount.toFixed(2)}
                </span>
                <button onClick={() => handleDelete(rec.id)} className="text-slate-500 hover:text-red-400 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Nuevo Registro */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Nuevo Registro (${MONTH_NAMES[selectedMonth]})`}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex gap-2 p-1 bg-slate-900 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${type === 'expense' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${type === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Ingreso
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'CUSTOM_OPTION' ? '+ Crear Nueva Categoría...' : c}
                </option>
              ))}
            </select>
          </div>

          {category === 'CUSTOM_OPTION' && (
            <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/30 space-y-1">
              <label className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <FolderPlus className="w-3.5 h-3.5" />
                Nombre de tu Nueva Categoría
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Ej: Cripto, Regalos, Mascotas..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago de almuerzo o trabajo"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500">
            Guardar en {MONTH_NAMES[selectedMonth]}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
