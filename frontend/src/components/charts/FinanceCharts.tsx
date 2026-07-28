'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';

export interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}

interface FinanceChartsProps {
  records: FinanceRecord[];
}

const PRESET_COLORS: Record<string, string> = {
  Alimentación: '#38bdf8', // sky-400
  Servicios: '#818cf8',    // indigo-400
  Ocio: '#f472b6',         // pink-400
  Transporte: '#34d399',   // emerald-400
  Vivienda: '#f97316',     // orange-500
  Salud: '#ef4444',        // red-500
  Educación: '#a855f7',    // purple-500
  Inversiones: '#10b981',  // emerald-500
  Suscripciones: '#ec4899',// pink-500
  Freelance: '#fbbf24',    // amber-400
  Salario: '#6366f1',      // indigo-500
  Otros: '#94a3b8',        // slate-400
};

const DYNAMIC_PALETTE = [
  '#38bdf8', '#34d399', '#f472b6', '#fbbf24', '#a855f7',
   '#f97316', '#ef4444', '#818cf8', '#2dd4bf', '#e879f9'
];

export function FinanceCharts({ records }: FinanceChartsProps) {
  // 1. Calculate Expenses by Category
  const expenseRecords = records.filter(r => r.type === 'expense');
  const categoryMap: Record<string, number> = {};
  
  expenseRecords.forEach(r => {
    categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
  });

  const totalExpenseSum = Object.values(categoryMap).reduce((a, b) => a + b, 0);

  const pieData = Object.keys(categoryMap).map((cat, idx) => {
    const assignedColor = PRESET_COLORS[cat] || DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length];
    return {
      name: cat,
      value: categoryMap[cat],
      color: assignedColor,
      percentage: totalExpenseSum > 0 ? ((categoryMap[cat] / totalExpenseSum) * 100).toFixed(1) : '0'
    };
  });

  // 2. Calculate Weekly / Comparative Bar Chart (Ingresos vs Gastos)
  const totalIncome = records.filter(r => r.type === 'income').reduce((acc, r) => acc + r.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);

  const barData = [
    { name: 'Totales', Ingresos: totalIncome, Gastos: totalExpense }
  ];

  return (
    <div className="space-y-6">
      {/* Category Pie / Donut Chart */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Distribución por Categorías
        </h4>
        
        {pieData.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">Registra un gasto para ver el gráfico de distribución.</p>
        ) : (
          <div className="space-y-3">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Monto']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Badges Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[90px]">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-100">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comparative Bar Chart (Ingresos vs Gastos) */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Comparativa Balance (Ingresos vs Gastos)
        </h4>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip
                formatter={(val: any) => [`$${Number(val).toFixed(2)}`, '']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Ingresos" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gastos" fill="#f87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
