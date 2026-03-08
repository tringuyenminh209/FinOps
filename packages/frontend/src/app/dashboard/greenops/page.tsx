'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  Leaf, Zap, ArrowDown, ArrowUp, FileText, Download, Flame, BarChart3, RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCO2, formatNumber, cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import { EMISSION_FACTORS, getGreenGrade } from '@finops/shared';
import type { GreenReport, GreenScore, GreenReportDetail, ApiResponse } from '@finops/shared';


const REGION_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

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
      <span className={cn('text-lg font-bold px-2.5 py-0.5 rounded-lg border', gradeColors[grade] ?? gradeColors['D'])}>
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
  const [reports, setReports] = useState<GreenReport[]>([]);
  const [greenScore, setGreenScore] = useState<GreenScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, scoreRes] = await Promise.all([
        apiGet<ApiResponse<GreenReport[]>>('/api/v1/carbon/report?limit=12'),
        apiGet<ApiResponse<GreenScore>>('/api/v1/carbon/green-score'),
      ]);

      if (reportsRes.success && reportsRes.data) {
        setReports(reportsRes.data);
      } else {
        setReports([]);
      }

      if (scoreRes.success && scoreRes.data) {
        setGreenScore(scoreRes.data);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await apiPost('/api/v1/carbon/calculate', {});
      await apiPost('/api/v1/carbon/report/generate', { month: new Date().toISOString().slice(0, 7) });
      await fetchData();
    } catch (err) {
      console.error('Calculate error:', err);
    } finally {
      setCalculating(false);
    }
  };

  // 表示用データ導出
  const latestReport = reports[0];
  const prevReport = reports[1];

  const currentCarbon = latestReport?.totalCarbonKg ?? 0;
  const prevCarbon = prevReport?.totalCarbonKg ?? 0;
  const carbonDiff = prevCarbon > 0 ? ((currentCarbon - prevCarbon) / prevCarbon) * 100 : 0;
  const currentPower = latestReport?.totalPowerKwh ?? 0;
  const savingsCarbon = latestReport?.savingsCarbonKg ?? 0;
  const currentScore = greenScore?.score ?? latestReport?.greenScore ?? 0;
  const currentGrade = greenScore?.grade ?? getGreenGrade(currentScore);

  // チャートデータ変換
  const carbonTrend = [...reports].reverse().slice(-6).map(r => ({
    month: r.reportMonth.replace(/^\d{4}-/, '') + '月',
    carbon: r.totalCarbonKg,
    power: r.totalPowerKwh,
  }));

  const scoreTrend = [...reports].reverse().slice(-6).map(r => ({
    month: r.reportMonth.replace(/^\d{4}-/, '') + '月',
    score: r.greenScore,
  }));

  const regionBreakdown = (latestReport?.details ?? [] as GreenReportDetail[]).map((d: GreenReportDetail, i: number) => ({
    name: d.region,
    value: d.carbonKg,
    color: REGION_COLORS[i % REGION_COLORS.length],
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-500">GreenOpsデータを読み込み中...</p>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCalculate}
            disabled={calculating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', calculating && 'animate-spin')} />
            {calculating ? '計算中...' : 'CO2再計算'}
          </Button>
        </div>
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
              {Math.abs(carbonDiff).toFixed(1)}% 前月比
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">月間電力消費量</p>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {formatNumber(Math.round(currentPower))} <span className="text-lg text-slate-500">kWh</span>
          </p>
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
          {greenScore && (
            <p className="text-xs text-slate-500 mt-1">
              削減率: {greenScore.reductionPercent.toFixed(1)}%
            </p>
          )}
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
              {regionBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-slate-500 text-sm">
                  データがありません
                </div>
              ) : (
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
                      {regionBreakdown.map((entry: { name: string; value: number; color: string }) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string): React.ReactNode => <span className="text-xs text-slate-400 ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
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
                <span className="text-sm font-medium tabular-nums text-emerald-400">{value as number}</span>
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
            {reports.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">GreenOpsレポートがありません</p>
                <p className="text-slate-500 text-xs mt-1">CO2再計算を実行するとレポートが生成されます</p>
              </div>
            )}
            {reports.map((report) => {
              const grade = getGreenGrade(report.greenScore);
              return (
                <div key={report.reportMonth} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white tabular-nums">{report.reportMonth}</span>
                    <Badge className={cn('text-xs', gradeColors[grade])}>
                      {grade}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm tabular-nums text-slate-400">{formatCO2(report.totalCarbonKg)}</span>
                    <span className="text-sm tabular-nums text-slate-400">{formatNumber(Math.round(report.totalPowerKwh))} kWh</span>
                    <span className="text-sm tabular-nums font-medium text-emerald-400">Score: {report.greenScore}</span>
                    <button
                      onClick={() => handlePdfPrint(report.reportMonth)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
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
