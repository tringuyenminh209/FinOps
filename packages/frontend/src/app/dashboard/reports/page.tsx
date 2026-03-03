'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  FileText, TrendingDown, TrendingUp, ArrowDown, ArrowUp,
  Calendar, Send, Download, Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface WeeklyReportData {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalCostJpy: number;
  previousCostJpy: number;
  costChangePercent: number;
  resourceCount: number;
  stoppedHours: number;
  savingsJpy: number;
  generatedAt: string;
}

const mockReports: WeeklyReportData[] = [
  { id: '1', periodStart: '2026-02-24', periodEnd: '2026-03-03', totalCostJpy: 560000, previousCostJpy: 590000, costChangePercent: -5.1, resourceCount: 42, stoppedHours: 168, savingsJpy: 84000, generatedAt: '2026-03-03T09:00:00' },
  { id: '2', periodStart: '2026-02-17', periodEnd: '2026-02-24', totalCostJpy: 590000, previousCostJpy: 620000, costChangePercent: -4.8, resourceCount: 42, stoppedHours: 154, savingsJpy: 77000, generatedAt: '2026-02-24T09:00:00' },
  { id: '3', periodStart: '2026-02-10', periodEnd: '2026-02-17', totalCostJpy: 620000, previousCostJpy: 645000, costChangePercent: -3.9, resourceCount: 40, stoppedHours: 140, savingsJpy: 70000, generatedAt: '2026-02-17T09:00:00' },
  { id: '4', periodStart: '2026-02-03', periodEnd: '2026-02-10', totalCostJpy: 645000, previousCostJpy: 680000, costChangePercent: -5.1, resourceCount: 40, stoppedHours: 130, savingsJpy: 65000, generatedAt: '2026-02-10T09:00:00' },
  { id: '5', periodStart: '2026-01-27', periodEnd: '2026-02-03', totalCostJpy: 680000, previousCostJpy: 710000, costChangePercent: -4.2, resourceCount: 38, stoppedHours: 120, savingsJpy: 60000, generatedAt: '2026-02-03T09:00:00' },
  { id: '6', periodStart: '2026-01-20', periodEnd: '2026-01-27', totalCostJpy: 710000, previousCostJpy: 720000, costChangePercent: -1.4, resourceCount: 38, stoppedHours: 110, savingsJpy: 55000, generatedAt: '2026-01-27T09:00:00' },
];

const trendData = mockReports.slice().reverse().map((r) => ({
  period: r.periodStart.slice(5),
  cost: r.totalCostJpy,
  savings: r.savingsJpy,
}));

const savingsData = mockReports.slice().reverse().map((r) => ({
  period: r.periodStart.slice(5),
  hours: r.stoppedHours,
  savings: r.savingsJpy,
}));

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-slate-600/30 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="tabular-nums font-medium text-white">
            {entry.name.includes('時間') ? `${entry.value}h` : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<WeeklyReportData>(mockReports[0]);

  const totalSavings = mockReports.reduce((s, r) => s + r.savingsJpy, 0);
  const totalHours = mockReports.reduce((s, r) => s + r.stoppedHours, 0);
  const avgChange = mockReports.reduce((s, r) => s + r.costChangePercent, 0) / mockReports.length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-400" />
            週次レポート
          </h1>
          <p className="text-sm text-slate-500 mt-1">コスト推移・Night-Watch実績の週次サマリー</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-2">
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
          <Button variant="primary" className="gap-2">
            <Send className="h-4 w-4" />
            LINE配信
          </Button>
        </div>
      </div>

      {/* 集計KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">今週コスト</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{formatCurrency(selectedReport.totalCostJpy)}</p>
          <div className="flex items-center gap-1 mt-1">
            {selectedReport.costChangePercent < 0 ? (
              <ArrowDown className="h-3 w-3 text-emerald-400" />
            ) : (
              <ArrowUp className="h-3 w-3 text-red-400" />
            )}
            <span className={`text-xs font-medium ${selectedReport.costChangePercent < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(selectedReport.costChangePercent)} 前週比
            </span>
          </div>
        </Card>
        <Card className="p-4 border-emerald-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wider">累計削減額</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatCurrency(totalSavings)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">累計停止時間</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-5 w-5 text-teal-400" />
            <p className="text-2xl font-bold text-teal-400 tabular-nums">{totalHours}h</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">平均削減率</p>
          <div className="flex items-center gap-2 mt-1">
            <TrendingDown className="h-5 w-5 text-emerald-400" />
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatPercent(avgChange)}</p>
          </div>
        </Card>
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>週次コスト推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" name="コスト" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Night-Watch削減実績</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={savingsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v}h`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line yAxisId="left" type="monotone" dataKey="hours" name="停止時間" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="savings" name="削減額" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* レポート一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            レポート履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockReports.map((r, i) => {
              const isSelected = r.id === selectedReport.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 animate-slide-up ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-slate-800/40 border border-transparent hover:bg-slate-800/60'
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-200">
                        {r.periodStart.slice(5).replace('-', '/')} 〜 {r.periodEnd.slice(5).replace('-', '/')}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.resourceCount}リソース · {r.stoppedHours}h停止</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm font-medium text-white tabular-nums">{formatCurrency(r.totalCostJpy)}</p>
                      <p className={`text-xs font-medium tabular-nums flex items-center justify-end gap-0.5 ${r.costChangePercent < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.costChangePercent < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        {formatPercent(r.costChangePercent)}
                      </p>
                    </div>
                    <Badge variant="success">
                      {formatCurrency(r.savingsJpy)} 削減
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
