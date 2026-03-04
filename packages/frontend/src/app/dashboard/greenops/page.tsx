'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  Leaf, Zap, ArrowDown, ArrowUp, FileText, Download, Flame, BarChart3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { formatCO2, formatCurrency, formatNumber, cn } from '@/lib/utils';
import { EMISSION_FACTORS, GREEN_SCORE_THRESHOLDS } from '@finops/shared';

// ── デモデータ ──

const carbonTrend = [
  { month: '9月', carbon: 1280, power: 3200 },
  { month: '10月', carbon: 1150, power: 2900 },
  { month: '11月', carbon: 980, power: 2500 },
  { month: '12月', carbon: 870, power: 2200 },
  { month: '1月', carbon: 750, power: 1900 },
  { month: '2月', carbon: 640, power: 1600 },
];

const scoreTrend = [
  { month: '9月', score: 35 },
  { month: '10月', score: 42 },
  { month: '11月', score: 55 },
  { month: '12月', score: 63 },
  { month: '1月', score: 72 },
  { month: '2月', score: 78 },
];

const regionBreakdown = [
  { name: 'ap-northeast-1', value: 420, color: '#10b981' },
  { name: 'ap-northeast-3', value: 130, color: '#06b6d4' },
  { name: 'japaneast', value: 60, color: '#8b5cf6' },
  { name: 'japanwest', value: 30, color: '#f59e0b' },
];

const reportHistory = [
  { month: '2026-02', carbonKg: 640, powerKwh: 1600, score: 78, grade: 'A' },
  { month: '2026-01', carbonKg: 750, powerKwh: 1900, score: 72, grade: 'A' },
  { month: '2025-12', carbonKg: 870, powerKwh: 2200, score: 63, grade: 'A' },
  { month: '2025-11', carbonKg: 980, powerKwh: 2500, score: 55, grade: 'B' },
  { month: '2025-10', carbonKg: 1150, powerKwh: 2900, score: 42, grade: 'B' },
  { month: '2025-09', carbonKg: 1280, powerKwh: 3200, score: 35, grade: 'C' },
];

const gradeColors: Record<string, string> = {
  S: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  A: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  B: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  C: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  D: 'text-red-400 bg-red-400/10 border-red-400/30',
};

function GradeDisplay({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl font-bold text-white tabular-nums">{score}</span>
      <span className={cn(
        'text-lg font-bold px-2.5 py-0.5 rounded-lg border',
        gradeColors[grade] ?? gradeColors['D'],
      )}>
        {grade}
      </span>
    </div>
  );
}

function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-slate-600/30 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="tabular-nums font-medium text-white">
            {entry.name === 'CO2' ? formatCO2(entry.value) : `${formatNumber(entry.value)} kWh`}
          </span>
        </div>
      ))}
    </div>
  );
}

function handlePdfPrint(month: string) {
  window.open(`/dashboard/greenops/print?month=${month}`, '_blank');
}

export default function GreenOpsPage() {
  const [selectedMonth] = useState('2026-02');

  const currentCarbon = 640;
  const prevCarbon = 750;
  const carbonDiff = ((currentCarbon - prevCarbon) / prevCarbon) * 100;
  const currentPower = 1600;
  const savingsCarbon = 110;
  const currentScore = 78;
  const currentGrade = 'A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-400" />
            GreenOps
          </h1>
          <p className="text-sm text-slate-500 mt-1">CO2排出量分析とGreen-scoreダッシュボード</p>
        </div>
        <Select className="w-auto">
          <option>2026年2月</option>
          <option>2026年1月</option>
          <option>2025年12月</option>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">月間CO2排出量</p>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{formatCO2(currentCarbon)}</p>
          <div className="flex items-center gap-1 mt-1">
            {carbonDiff < 0 ? (
              <ArrowDown className="h-3 w-3 text-emerald-400" />
            ) : (
              <ArrowUp className="h-3 w-3 text-red-400" />
            )}
            <span className={`text-xs font-medium ${carbonDiff < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {carbonDiff.toFixed(1)}% 前月比
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">月間電力消費量</p>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{formatNumber(currentPower)} <span className="text-lg text-slate-500">kWh</span></p>
        </Card>

        <Card className="p-5 border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">CO2削減量</p>
            <ArrowDown className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">{formatCO2(savingsCarbon)}</p>
          <p className="text-xs text-slate-500 mt-1">Night-Watch による自動停止効果</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Green-score</p>
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <GradeDisplay score={currentScore} grade={currentGrade} />
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* CO2 Trend AreaChart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              CO2排出トレンド (6ヶ月)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={carbonTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="carbon" name="CO2" stroke="#10b981" fill="url(#carbonGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="power" name="電力" stroke="#06b6d4" fill="url(#powerGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Trend + Region Pie */}
        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-400" />
                Green-score 推移
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={scoreTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">リージョン別排出量</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={regionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {regionBreakdown.map((entry) => (
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
      </div>

      {/* Emission Factors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            排出係数テーブル (kg-CO2/kWh)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(EMISSION_FACTORS).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
                <span className="text-sm text-slate-300 font-mono">{key}</span>
                <span className="text-sm font-medium tabular-nums text-emerald-400">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            レポート履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportHistory.map((report) => (
              <div key={report.month} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white tabular-nums">{report.month}</span>
                  <Badge className={cn('text-xs', gradeColors[report.grade])}>
                    {report.grade}
                  </Badge>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm tabular-nums text-slate-400">{formatCO2(report.carbonKg)}</span>
                  <span className="text-sm tabular-nums text-slate-400">{formatNumber(report.powerKwh)} kWh</span>
                  <span className="text-sm tabular-nums font-medium text-emerald-400">Score: {report.score}</span>
                  <button
                    onClick={() => handlePdfPrint(report.month)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
