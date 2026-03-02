'use client';

import {
  DollarSign, TrendingDown, Server, Leaf, Lightbulb, AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { CostChart } from '@/components/dashboard/cost-chart';
import { SavingsRing } from '@/components/dashboard/savings-ring';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { formatCurrency } from '@/lib/utils';

const costData = [
  { month: '9月', cost: 890000, savings: 120000 },
  { month: '10月', cost: 850000, savings: 180000 },
  { month: '11月', cost: 780000, savings: 210000 },
  { month: '12月', cost: 720000, savings: 280000 },
  { month: '1月', cost: 680000, savings: 310000 },
  { month: '2月', cost: 620000, savings: 420000 },
];

const recommendations = [
  { id: '1', title: '未使用EBSボリューム削除', impact: 28000, priority: 'high' as const },
  { id: '2', title: 'RDS インスタンスのダウンサイジング', impact: 45000, priority: 'high' as const },
  { id: '3', title: 'S3 ライフサイクルポリシー設定', impact: 12000, priority: 'medium' as const },
  { id: '4', title: 'ElastiCache ノード最適化', impact: 8500, priority: 'low' as const },
];

const alerts = [
  { id: '1', message: 'Production RDSのCPU使用率が85%を超過', severity: 'warning' as const },
  { id: '2', message: 'Staging環境の自動停止が正常に完了', severity: 'info' as const },
  { id: '3', message: '今月のコスト予算の90%に到達', severity: 'danger' as const },
];

const activities = [
  { id: '1', type: 'schedule' as const, message: 'Staging環境 — 3台のEC2を自動停止しました', time: '2分前' },
  { id: '2', type: 'scan' as const, message: 'AWS本番アカウントのスキャン完了 (42リソース)', time: '15分前' },
  { id: '3', type: 'alert' as const, message: 'コスト予算アラートを送信しました', time: '1時間前' },
  { id: '4', type: 'billing' as const, message: '2月分の適格請求書を発行しました', time: '3時間前' },
  { id: '5', type: 'schedule' as const, message: 'Dev環境 — Night-Watch延長（残業モード）', time: '5時間前' },
];

const priorityMap = {
  high: { label: '高', variant: 'danger' as const },
  medium: { label: '中', variant: 'warning' as const },
  low: { label: '低', variant: 'default' as const },
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">クラウドコストと最適化の概要</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Row 1: KPI Cards */}
        <StatsCard
          title="月間クラウドコスト"
          value={620000}
          format="currency"
          trend={-8.8}
          subtitle="前月比"
          icon={DollarSign}
          iconColor="text-emerald-400"
          large
          className="md:col-span-1"
        />
        <StatsCard
          title="Night-Watch削減額"
          value={420000}
          format="currency"
          trend={35.5}
          subtitle="前月比"
          icon={TrendingDown}
          iconColor="text-teal-400"
          large
          className="md:col-span-1"
        />
        <StatsCard
          title="管理リソース数"
          value="142台"
          trend={5.2}
          subtitle="先月+7台"
          icon={Server}
          iconColor="text-sky-400"
          className="md:col-span-1"
        />
        <StatsCard
          title="CO₂削減量"
          value="2.4t"
          trend={12.0}
          subtitle="累計排出削減"
          icon={Leaf}
          iconColor="text-green-400"
          className="md:col-span-1"
        />

        {/* Row 2: Chart + Savings Ring */}
        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>コスト推移</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                コスト
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                削減額
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <CostChart data={costData} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1 xl:row-span-1">
          <CardHeader>
            <CardTitle>Night-Watch 効果</CardTitle>
          </CardHeader>
          <CardContent>
            <SavingsRing saved={420000} total={1040000} />
          </CardContent>
        </Card>

        {/* Row 3: Recommendations + Alerts */}
        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              AI最適化レコメンド
            </CardTitle>
            <Badge variant="info">{recommendations.length}件</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={priorityMap[rec.priority].variant} dot>
                      {priorityMap[rec.priority].label}
                    </Badge>
                    <span className="text-sm text-slate-300 truncate">{rec.title}</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400 tabular-nums whitespace-nowrap ml-3">
                    {formatCurrency(rec.impact)}/月
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              最近のアラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => {
                const variant = alert.severity === 'warning' ? 'warning' : alert.severity === 'danger' ? 'danger' : 'info';
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40"
                  >
                    <Badge variant={variant} dot>
                      {alert.severity === 'warning' ? '警告' : alert.severity === 'danger' ? '危険' : '情報'}
                    </Badge>
                    <span className="text-sm text-slate-300 leading-relaxed">{alert.message}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Row 4: Activity Feed (Full Width) */}
        <Card className="md:col-span-2 xl:col-span-4">
          <CardHeader>
            <CardTitle>アクティビティ</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
