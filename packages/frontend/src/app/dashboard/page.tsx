'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, Server, Leaf, Lightbulb, AlertTriangle, Plus } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { CostChart } from '@/components/dashboard/cost-chart';
import { SavingsRing } from '@/components/dashboard/savings-ring';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { formatCurrency } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface CostSummary {
  currentMonthJpy: number;
  previousMonthJpy: number;
  changePercent: number;
}

interface MonthlyCost {
  month: string;
  amountJpy: number;
}

interface CostsData {
  monthly: MonthlyCost[];
  total: number;
}

interface ResourcesData {
  total: number;
}

interface Optimization {
  id: string;
  title: string;
  savingsJpy: number;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  createdAt: string;
}

const priorityMap = {
  high:   { label: '高', variant: 'danger'  as const },
  medium: { label: '中', variant: 'warning' as const },
  low:    { label: '低', variant: 'default' as const },
};

const MONTH_NAMES: Record<string, string> = {
  '01': '1月', '02': '2月', '03': '3月', '04': '4月',
  '05': '5月', '06': '6月', '07': '7月', '08': '8月',
  '09': '9月', '10': '10月', '11': '11月', '12': '12月',
};

function toChartMonth(yyyyMM: string) {
  return MONTH_NAMES[yyyyMM.slice(5)] ?? yyyyMM;
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary]           = useState<CostSummary | null>(null);
  const [costsData, setCostsData]       = useState<CostsData | null>(null);
  const [resourceTotal, setResourceTotal] = useState<number>(0);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [activities, setActivities]     = useState<AuditEntry[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      const results = await Promise.allSettled([
        apiGet<{ success: boolean; data: CostSummary }>('/costs/summary'),
        apiGet<{ success: boolean; data: CostsData }>('/costs?months=6'),
        apiGet<{ success: boolean; data: ResourcesData }>('/resources?limit=1'),
        apiGet<{ success: boolean; data: Optimization[] }>('/ai/recommendations'),
        apiGet<{ success: boolean; data: AuditEntry[] }>('/org/audit?limit=5'),
      ]);

      if (results[0].status === 'fulfilled') setSummary(results[0].value.data);
      if (results[1].status === 'fulfilled') setCostsData(results[1].value.data);
      if (results[2].status === 'fulfilled') setResourceTotal(results[2].value.data.total ?? 0);
      if (results[3].status === 'fulfilled') setOptimizations(Array.isArray(results[3].value.data) ? results[3].value.data : []);
      if (results[4].status === 'fulfilled') setActivities(Array.isArray(results[4].value.data) ? results[4].value.data : []);

      setLoading(false);
    }
    load();
  }, []);

  const chartData = (costsData?.monthly ?? []).map((m) => ({
    month: toChartMonth(m.month),
    cost: m.amountJpy,
    savings: 0,
  }));

  const currentCost   = summary?.currentMonthJpy  ?? 0;
  const costChangePct = summary?.changePercent     ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">クラウドコストと最適化の概要</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* KPI Cards */}
        <StatsCard
          title="月間クラウドコスト"
          value={currentCost}
          format="currency"
          trend={costChangePct}
          subtitle="前月比"
          icon={DollarSign}
          iconColor="text-emerald-400"
          large
        />
        <StatsCard
          title="Night-Watch削減額"
          value={0}
          format="currency"
          trend={0}
          subtitle="前月比"
          icon={TrendingDown}
          iconColor="text-teal-400"
          large
        />
        <StatsCard
          title="管理リソース数"
          value={`${resourceTotal}台`}
          trend={0}
          subtitle=""
          icon={Server}
          iconColor="text-sky-400"
        />
        <StatsCard
          title="CO₂削減量"
          value="0t"
          trend={0}
          subtitle="累計排出削減"
          icon={Leaf}
          iconColor="text-green-400"
        />

        {/* Cost Chart */}
        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>コスト推移</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />コスト
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <CostChart data={chartData} />
            ) : (
              <EmptyState
                message="コストデータがありません。クラウドアカウントを接続するとデータが表示されます。"
                action={
                  <Link href="/dashboard/accounts" className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                    <Plus className="h-3 w-3" />アカウントを追加
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader><CardTitle>Night-Watch 効果</CardTitle></CardHeader>
          <CardContent>
            <SavingsRing saved={0} total={currentCost || 1} />
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              AI最適化レコメンド
            </CardTitle>
            {optimizations.length > 0 && <Badge variant="info">{optimizations.length}件</Badge>}
          </CardHeader>
          <CardContent>
            {optimizations.length > 0 ? (
              <div className="space-y-3">
                {optimizations.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={priorityMap[rec.priority]?.variant ?? 'default'} dot>
                        {priorityMap[rec.priority]?.label ?? rec.priority}
                      </Badge>
                      <span className="text-sm text-slate-300 truncate">{rec.title}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-400 tabular-nums whitespace-nowrap ml-3">
                      {formatCurrency(rec.savingsJpy)}/月
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                message="AI分析データがありません。リソースをスキャンすると最適化提案が表示されます。"
                action={
                  <Link href="/dashboard/accounts" className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                    <Plus className="h-3 w-3" />アカウントをスキャン
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Alerts placeholder */}
        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              最近のアラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState message="アラートはありません。" />
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="md:col-span-2 xl:col-span-4">
          <CardHeader><CardTitle>アクティビティ</CardTitle></CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <ActivityFeed
                activities={activities.map((a) => ({
                  id: a.id,
                  type: (a.targetType === 'schedule' ? 'schedule' : a.targetType === 'billing' ? 'billing' : 'scan') as 'scan' | 'schedule' | 'billing' | 'alert',
                  message: a.action,
                  time: new Date(a.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
                }))}
              />
            ) : (
              <EmptyState message="アクティビティはまだありません。" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
