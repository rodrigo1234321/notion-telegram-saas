'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const dataPie = [
  { name: 'Alimentación', value: 450, color: '#38bdf8' },
  { name: 'Servicios', value: 200, color: '#818cf8' },
  { name: 'Ocio', value: 150, color: '#f472b6' },
  { name: 'Transporte', value: 100, color: '#34d399' },
];

const dataBar = [
  { day: 'Lun', ingresos: 200, gastos: 45 },
  { day: 'Mar', ingresos: 150, gastos: 80 },
  { day: 'Mié', ingresos: 300, gastos: 120 },
  { day: 'Jue', ingresos: 0, gastos: 60 },
  { day: 'Vie', ingresos: 450, gastos: 210 },
  { day: 'Sáb', ingresos: 0, gastos: 90 },
  { day: 'Dom', ingresos: 0, gastos: 30 },
];

export function FinanceCharts() {
  return (
    <div className="space-y-6">
      <div className="h-48 w-full">
        <h4 className="text-xs font-semibold text-slate-400 mb-2">Distribución de Gastos (Mes)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dataPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}>
              {dataPie.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="h-48 w-full">
        <h4 className="text-xs font-semibold text-slate-400 mb-2">Flujo Semanal (Ingresos vs Gastos)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataBar} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
            <Bar dataKey="ingresos" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
