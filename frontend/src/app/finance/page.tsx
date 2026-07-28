'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FinanceCharts } from '@/components/charts/FinanceCharts';
import { PieChart, DollarSign, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { apiClient } from '@/lib/api_client';

interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}

const LOCAL_STORAGE_KEY = 'saas_finance_records';

export default function FinancePage() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentación');
  const [description, setDescription] = useState('');

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
        if (res.data?.data && res.data.data.length > 0) {
          const apiRecords = res.data.data.map((r: any) => ({
            id: r.id || String(Math.random()),
            type: r.type || 'expense',
            amount: Number(r.amount) || 0,
            category: r.category || 'General',
            description: r.description || ''
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

  const totalIncome = records.filter(r => r.type === 'income').reduce((acc, r) => acc + r.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    triggerHaptic('heavy');

    const newRecord: FinanceRecord = {
      id: Date.now().toString(),
      type,
      amount: numAmount,
      category,
      description
    };

    const updated = [newRecord, ...records];
    savePersistent(updated);

    setAmount('');
    setDescription('');
    setIsModalOpen(false);

    apiClient.post('/api/finance/records', {
      type,
      amount: numAmount,
      category,
      description
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span>Finanzas & Métricas</span>
          </h1>
          <p className="text-xs text-slate-400">Control presupuestario persistente</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="!py-1.5 !px-3 text-xs bg-emerald-600 hover:bg-emerald-500">
          <Plus className="w-4 h-4" />
          <span>Registro</span>
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center space-x-2 text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase">Ingresos</span>
          </div>
          <p className="text-lg font-extrabold text-slate-100">${totalIncome.toFixed(2)}</p>
        </Card>

        <Card className="p-3 bg-red-500/10 border-red-500/20">
          <div className="flex items-center space-x-2 text-red-400 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase">Gastos</span>
          </div>
          <p className="text-lg font-extrabold text-slate-100">${totalExpense.toFixed(2)}</p>
        </Card>
      </div>

      {/* Visual Analytics */}
      <Card title="Análisis Gráfico" icon={<DollarSign className="w-4 h-4" />}>
        <FinanceCharts />
      </Card>

      {/* Recent Transactions List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Últimos Movimientos</h3>
        {records.length === 0 ? (
          <p className="text-xs text-slate-500 italic px-1">Sin registros financieros guardados.</p>
        ) : (
          records.map((rec) => (
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Registro Financiero">
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
              <option value="Alimentación">Alimentación</option>
              <option value="Servicios">Servicios</option>
              <option value="Ocio">Ocio</option>
              <option value="Transporte">Transporte</option>
              <option value="Freelance">Freelance</option>
              <option value="Salario">Salario</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago de almuerzo"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500">
            Guardar Transacción
          </Button>
        </form>
      </Modal>
    </div>
  );
}
