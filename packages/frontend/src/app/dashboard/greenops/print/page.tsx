'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Leaf, Zap, Flame, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatCO2, formatNumber, formatCurrency } from '@/lib/utils';
import { EMISSION_FACTORS } from '@finops/shared';
import type { GreenReport, GreenReportDetail } from '@finops/shared';

interface ReportResponse {
  success: boolean;
  data: GreenReport;
}

export default function GreenOpsPrintPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? '';
  const [report, setReport] = useState<GreenReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) {
      setError('月パラメータが指定されていません');
      setLoading(false);
      return;
    }

    async function fetchReport() {
      try {
        const res = await apiGet<ReportResponse>(`/api/v1/carbon/report/${month}`);
        setReport(res.data);
      } catch {
        setError('レポートの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [month]);

  useEffect(() => {
    if (report && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [report, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error ?? 'レポートが見つかりません'}</p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: #1a1a1a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-page { padding: 20px !important; }
        }
      `}</style>

      <div className="print-page max-w-4xl mx-auto p-8 bg-white text-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-emerald-500 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">GreenOps レポート</h1>
              <p className="text-sm text-slate-500">FinOps Platform — ESG / カーボンレポート</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600">{report.reportMonth}</p>
            <p className="text-xs text-slate-400">生成日: {new Date().toLocaleDateString('ja-JP')}</p>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-slate-500 font-medium">CO2排出量</p>
            </div>
            <p className="text-2xl font-bold">{formatCO2(report.totalCarbonKg)}</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-slate-500 font-medium">電力消費量</p>
            </div>
            <p className="text-2xl font-bold">{formatNumber(report.totalPowerKwh)} kWh</p>
          </div>
          <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
            <p className="text-xs text-slate-500 font-medium mb-1">CO2削減量</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCO2(report.savingsCarbonKg)}</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500 font-medium mb-1">Green-score</p>
            <p className="text-2xl font-bold text-emerald-600">{report.greenScore}</p>
          </div>
        </div>

        {/* Details Table */}
        {report.details.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">リージョン別内訳</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-medium text-slate-700">リージョン</th>
                  <th className="text-left p-3 font-medium text-slate-700">プロバイダ</th>
                  <th className="text-right p-3 font-medium text-slate-700">CO2 (kg)</th>
                  <th className="text-right p-3 font-medium text-slate-700">電力 (kWh)</th>
                  <th className="text-right p-3 font-medium text-slate-700">リソース数</th>
                </tr>
              </thead>
              <tbody>
                {report.details.map((d: GreenReportDetail, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="p-3 font-mono text-slate-700">{d.region}</td>
                    <td className="p-3 text-slate-600">{d.provider}</td>
                    <td className="p-3 text-right tabular-nums">{d.carbonKg.toFixed(1)}</td>
                    <td className="p-3 text-right tabular-nums">{d.powerKwh.toFixed(1)}</td>
                    <td className="p-3 text-right tabular-nums">{d.resourceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Emission Factors Reference */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">排出係数一覧 (参考)</h2>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(EMISSION_FACTORS).map(([key, value]) => (
              <div key={key} className="border border-slate-200 rounded p-2 text-xs">
                <span className="font-mono text-slate-600">{key}</span>
                <span className="float-right font-bold text-emerald-600">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="border-t-2 border-slate-200 pt-4 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">コスト関連</span>
            <div className="text-right">
              <p className="text-sm text-slate-700">月間コスト: <strong>{formatCurrency(report.totalCostJpy)}</strong></p>
              <p className="text-sm text-emerald-600">コスト削減: <strong>{formatCurrency(report.savingsCostJpy)}</strong></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-200">
          <p>FinOps Platform — GreenOps レポート — {report.reportMonth}</p>
          <p>本レポートは自動生成されたESG / カーボンフットプリントデータに基づいています</p>
        </div>

        {/* Print Button (hidden in print) */}
        <div className="no-print fixed bottom-6 right-6">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-600 transition-colors"
          >
            <Leaf className="h-4 w-4" />
            PDFとして印刷
          </button>
        </div>
      </div>
    </>
  );
}
