'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingDown, ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface MonthlyPoint {
  month: string;
  cost: number;
}

interface BreakdownPoint {
  name: string;
  value: number;
  color: string;
}

interface CostSummary {
  currentMonthJpy: number;
  previousMonthJpy: number;
  changePercent: number;
}

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#64748b', '#ef4444'];

function formatMonth(ym: string): string {
  const m = ym.split('-')[1];
  return m ? parseInt(m, 10) + '月' : ym;
}

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
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [breakdownData, setBreakdownData] = useState<BreakdownPoint[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data: { monthly: { month: string; amountJpy: number }[]; breakdown: { type: string; amountJpy: number }[]; total: number } }>('/costs?months=6')
      .then((res) => {
        if (res.success && res.data) {
          setMonthlyData(res.data.monthly.map((m) => ({
            month: formatMonth(m.month),
            cost: m.amountJpy,
          })));
          setBreakdownData(res.data.breakdown.map((b, i) => ({
            name: b.type,
            value: b.amountJpy,
            color: COLORS[i % COLORS.length],
          })));
        } else {
          setMonthlyData([]);
          setBreakdownData([]);
        }
      })
      .catch(() => {
        setMonthlyData([]);
        setBreakdownData([]);
      });

    apiGet<{ success: boolean; data: CostSummary }>('/costs/summary')
      .then((res) => {
        if (res.success && res.data) {
          setSummary(res.data);
        } else {
          setSummary(null);
        }
      })
      .catch(() => setSummary(null));
  }, []);

  const currentMonthJpy = summary?.currentMonthJpy ?? 0;
  const previousMonthJpy = summary?.previousMonthJpy ?? 0;
  const changePercent = summary?.changePercent ?? 0;
  const diffAmt = currentMonthJpy - previousMonthJpy;

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
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">今月の合計コスト</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formatCurrency(currentMonthJpy)}</p>
          {summary && (
            <div className="flex items-center gap-1 mt-1">
              {changePercent <= 0 ? (
                <ArrowDown className="h-3 w-3 text-emerald-400" />
              ) : (
                <ArrowUp className="h-3 w-3 text-red-400" />
              )}
              <span className={`text-xs font-medium ${changePercent <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(changePercent).toFixed(1)}% 前月比
              </span>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">前月の合計コスト</p>
          <p className="text-3xl font-bold text-slate-400 mt-2 tabular-nums">{formatCurrency(previousMonthJpy)}</p>
        </Card>
        <Card className="p-5 border-emerald-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wider">前月比 削減額</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2 tabular-nums">{formatCurrency(Math.abs(diffAmt))}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Bar Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>月間コスト推移</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
                コストデータがありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="cost" name="コスト" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>今月のサービス別内訳</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">
                内訳データがありません
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
