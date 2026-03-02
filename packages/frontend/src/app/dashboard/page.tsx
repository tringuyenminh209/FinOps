'use client';

import {
  Wallet,
  TrendingDown,
  Moon,
  Server,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { CostChart } from '@/components/dashboard/cost-chart';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { formatCurrency, cn } from '@/lib/utils';

// ── モックデータ ──
const MOCK_COST_DATA = [
  { month: '2025/10', cost: 1240000, savings: 180000 },
  { month: '2025/11', cost: 1180000, savings: 220000 },
  { month: '2025/12', cost: 1350000, savings: 195000 },
  { month: '2026/01', cost: 1290000, savings: 310000 },
  { month: '2026/02', cost: 1150000, savings: 380000 },
  { month: '2026/03', cost: 1080000, savings: 420000 },
];

const MOCK_RESOURCES = [
  { id: '1', name: 'web-prod-01', type: 'EC2', status: 'running' as const, monthlyCost: 45200, lastSeen: '2026-03-02T10:30:00' },
  { id: '2', name: 'api-prod-01', type: 'EC2', status: 'running' as const, monthlyCost: 38400, lastSeen: '2026-03-02T10:30:00' },
  { id: '3', name: 'db-primary', type: 'RDS', status: 'running' as const, monthlyCost: 128000, lastSeen: '2026-03-02T10:28:00' },
  { id: '4', name: 'staging-web', type: 'EC2', status: 'stopped' as const, monthlyCost: 0, lastSeen: '2026-03-01T18:00:00' },
  { id: '5', name: 'dev-db', type: 'RDS', status: 'stopped' as const, monthlyCost: 0, lastSeen: '2026-03-01T18:00:00' },
  { id: '6', name: 'legacy-app', type: 'EC2', status: 'terminated' as const, monthlyCost: 0, lastSeen: '2026-02-15T12:00:00' },
];

const MOCK_RECOMMENDATIONS = [
  {
    id: '1',
    icon: TrendingDown,
    title: 'RDS db-primary をリザーブドインスタンスに変更',
    saving: 38400,
    type: 'コスト削減',
    color: 'text-emerald-400',
  },
  {
    id: '2',
    icon: Moon,
    title: 'staging-web の Night-Watch スケジュール最適化',
    saving: 12800,
    type: 'スケジュール',
    color: 'text-teal-400',
  },
  {
    id: '3',
    icon: Server,
    title: 'api-prod-01 のインスタンスサイズ適正化 (m5.large → m5.medium)',
    saving: 19200,
    type: 'ライトサイジング',
    color: 'text-blue-400',
  },
];

const MOCK_ALERTS = [
  { id: '1', type: 'warning', message: 'web-prod-01 のCPU使用率が90%超過', time: '10分前' },
  { id: '2', type: 'info', message: 'Night-Watch: staging環境を停止しました', time: '2時間前' },
  { id: '3', type: 'success', message: '2月のコストレポートが生成されました', time: '5時間前' },
];

const ALERT_STYLES: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
  info: { icon: Clock, color: 'text-blue-400' },
  success: { icon: CheckCircle2, color: 'text-emerald-400' },
};

export default function DashboardPage() {
  const runningCount = MOCK_RESOURCES.filter((r) => r.status === 'running').length;
  const stoppedCount = MOCK_RESOURCES.filter((r) => r.status === 'stopped').length;
  const terminatedCount = MOCK_RESOURCES.filter((r) => r.status === 'terminated').length;

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="月間コスト"
          value={formatCurrency(1080000)}
          trend={-6.1}
          icon={Wallet}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <StatsCard
          label="前月比"
          value="-6.1%"
          trend={-6.1}
          icon={TrendingDown}
          iconColor="bg-teal-500/10 text-teal-400"
        />
        <StatsCard
          label="Night-Watch削減額"
          value={formatCurrency(420000)}
          trend={10.5}
          icon={Moon}
          iconColor="bg-indigo-500/10 text-indigo-400"
        />
        <StatsCard
          label="リソース数"
          value={`${MOCK_RESOURCES.length}`}
          icon={Server}
          iconColor="bg-orange-500/10 text-orange-400"
        />
      </div>

      {/* チャート + リソース概要 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CostChart data={MOCK_COST_DATA} />
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">
            リソースステータス
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-300">稼働中</span>
              </div>
              <span className="text-lg font-bold text-slate-100">
                {runningCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-300">停止中</span>
              </div>
              <span className="text-lg font-bold text-slate-100">
                {stoppedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-slate-300">終了</span>
              </div>
              <span className="text-lg font-bold text-slate-100">
                {terminatedCount}
              </span>
            </div>

            {/* プログレスバー */}
            <div className="mt-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${(runningCount / MOCK_RESOURCES.length) * 100}%`,
                  }}
                />
                <div
                  className="bg-amber-500 transition-all"
                  style={{
                    width: `${(stoppedCount / MOCK_RESOURCES.length) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{
                    width: `${(terminatedCount / MOCK_RESOURCES.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* AI推奨 */}
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-slate-100">
              AI推奨アクション
            </h3>
            <div className="space-y-3">
              {MOCK_RECOMMENDATIONS.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 rounded-lg bg-slate-700/50 p-3"
                >
                  <rec.icon className={cn('mt-0.5 h-4 w-4 shrink-0', rec.color)} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {rec.title}
                    </p>
                    <p className="mt-1 text-xs font-medium text-emerald-400">
                      削減見込: {formatCurrency(rec.saving)}/月
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* リソーステーブル + アラート */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ResourceTable resources={MOCK_RESOURCES} />
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">
            最近のアラート
          </h3>
          <div className="space-y-3">
            {MOCK_ALERTS.map((alert) => {
              const style = ALERT_STYLES[alert.type];
              const AlertIcon = style.icon;
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg bg-slate-700/50 p-3"
                >
                  <AlertIcon
                    className={cn('mt-0.5 h-4 w-4 shrink-0', style.color)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
