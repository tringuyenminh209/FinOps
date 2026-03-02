'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingDown, ArrowDown, ArrowUp, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

const monthlyData = [
  { month: '9月', ec2: 320000, rds: 280000, other: 120000 },
  { month: '10月', ec2: 310000, rds: 275000, other: 115000 },
  { month: '11月', ec2: 290000, rds: 260000, other: 108000 },
  { month: '12月', ec2: 270000, rds: 250000, other: 100000 },
  { month: '1月', ec2: 255000, rds: 240000, other: 95000 },
  { month: '2月', ec2: 240000, rds: 230000, other: 90000 },
];

const breakdownData = [
  { name: 'EC2', value: 240000, color: '#10b981' },
  { name: 'RDS', value: 230000, color: '#06b6d4' },
  { name: 'ElastiCache', value: 32000, color: '#8b5cf6' },
  { name: 'S3', value: 18000, color: '#f59e0b' },
  { name: 'その他', value: 40000, color: '#64748b' },
];

const comparisons = [
  { service: 'EC2', current: 240000, previous: 255000 },
  { service: 'RDS', current: 230000, previous: 240000 },
  { service: 'ElastiCache', current: 32000, previous: 35000 },
  { service: 'S3', current: 18000, previous: 16000 },
  { service: 'Lambda', current: 8000, previous: 9500 },
  { service: 'CloudWatch', current: 12000, previous: 12000 },
];

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-slate-600/30 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="tabular-nums font-medium text-white">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CostsPage() {
  const totalCurrent = breakdownData.reduce((s, d) => s + d.value, 0) + 8000 + 12000;
  const totalPrevious = comparisons.reduce((s, c) => s + c.previous, 0);
  const diff = totalCurrent - totalPrevious;
  const diffPct = ((diff / totalPrevious) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-emerald-400" />
            コスト分析
          </h1>
          <p className="text-sm text-slate-500 mt-1">クラウドコストの詳細分析と推移</p>
        </div>
        <Select className="w-auto">
          <option>2026年2月</option>
          <option>2026年1月</option>
          <option>2025年12月</option>
        </Select>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">今月の合計コスト</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formatCurrency(totalCurrent)}</p>
          <div className="flex items-center gap-1 mt-1">
            {diff < 0 ? (
              <ArrowDown className="h-3 w-3 text-emerald-400" />
            ) : (
              <ArrowUp className="h-3 w-3 text-red-400" />
            )}
            <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {diffPct}% 前月比
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">前月の合計コスト</p>
          <p className="text-3xl font-bold text-slate-400 mt-2 tabular-nums">{formatCurrency(totalPrevious)}</p>
        </Card>
        <Card className="p-5 border-emerald-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wider">前月比 削減額</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2 tabular-nums">{formatCurrency(Math.abs(diff))}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Stacked Bar Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>サービス別 月間コスト推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                <RechartsTooltip content={<CustomBarTooltip />} />
                <Bar dataKey="ec2" name="EC2" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rds" name="RDS" stackId="a" fill="#06b6d4" />
                <Bar dataKey="other" name="その他" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>今月のサービス別内訳</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {breakdownData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-slate-400 ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            前月比較
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparisons.map((row) => {
              const change = row.current - row.previous;
              const changePct = row.previous > 0 ? ((change / row.previous) * 100).toFixed(1) : '0.0';
              return (
                <div key={row.service} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  <span className="text-sm font-medium text-slate-300">{row.service}</span>
                  <div className="flex items-center gap-6">
                    <span className="text-sm tabular-nums text-slate-400">{formatCurrency(row.previous)}</span>
                    <span className="text-sm tabular-nums text-white font-medium">{formatCurrency(row.current)}</span>
                    <span className={`text-xs font-medium tabular-nums flex items-center gap-0.5 w-20 justify-end ${change <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {change <= 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                      {changePct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
