'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface SavingsRingProps {
  saved: number;
  total: number;
}

export function SavingsRing({ saved, total }: SavingsRingProps) {
  const pct = total > 0 ? Math.round((saved / total) * 100) : 0;
  const data = [
    { name: '削減', value: saved },
    { name: '残り', value: Math.max(total - saved, 0) },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-44 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="#10b981" />
              <Cell fill="rgba(100,116,139,0.15)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white tabular-nums animate-count-up">
            {pct}%
          </span>
          <span className="text-xs text-slate-500 mt-0.5">削減率</span>
        </div>
      </div>
      <div className="text-center mt-4 space-y-1">
        <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(saved)}</p>
        <p className="text-xs text-slate-500">Night-Watch による月間削減額</p>
      </div>
    </div>
  );
}
