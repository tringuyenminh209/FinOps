'use client';

import { useState } from 'react';
import { Cloud, Plus, RefreshCw, MoreVertical, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

const accounts = [
  {
    id: '1', alias: '本番環境 (Production)', provider: 'AWS', accountId: '123456789012',
    region: 'ap-northeast-1', status: 'active', resources: 42, monthlyCost: 380000,
    lastScan: '2分前',
  },
  {
    id: '2', alias: 'ステージング環境', provider: 'AWS', accountId: '987654321098',
    region: 'ap-northeast-1', status: 'active', resources: 18, monthlyCost: 95000,
    lastScan: '15分前',
  },
  {
    id: '3', alias: '開発環境 (Dev)', provider: 'AWS', accountId: '456789012345',
    region: 'ap-northeast-1', status: 'active', resources: 24, monthlyCost: 62000,
    lastScan: '1時間前',
  },
  {
    id: '4', alias: 'データ分析基盤', provider: 'AWS', accountId: '321098765432',
    region: 'us-east-1', status: 'inactive', resources: 8, monthlyCost: 0,
    lastScan: '3日前',
  },
];

const statusConfig = {
  active: { label: 'アクティブ', variant: 'success' as const, icon: CheckCircle2 },
  inactive: { label: '無効', variant: 'default' as const, icon: XCircle },
  error: { label: 'エラー', variant: 'danger' as const, icon: AlertCircle },
};

export default function AccountsPage() {
  const [search, setSearch] = useState('');

  const filtered = accounts.filter(
    (a) => a.alias.toLowerCase().includes(search.toLowerCase()) || a.accountId.includes(search),
  );

  const totalCost = accounts.reduce((s, a) => s + a.monthlyCost, 0);
  const totalResources = accounts.reduce((s, a) => s + a.resources, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">クラウドアカウント</h1>
          <p className="text-sm text-slate-500 mt-1">AWS アカウントの接続管理</p>
        </div>
        <Button size="md">
          <Plus className="h-4 w-4" />
          アカウント追加
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">接続アカウント数</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{accounts.filter(a => a.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">総リソース数</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{totalResources}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">合計月間コスト</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatCurrency(totalCost)}</p>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="アカウント名またはIDで検索..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Cloud className="h-4 w-4" />}
      />

      {/* Account Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((account) => {
          const sc = statusConfig[account.status as keyof typeof statusConfig] ?? statusConfig.active;
          const StatusIcon = sc.icon;
          return (
            <Card key={account.id} className="group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{account.alias}</h3>
                    <p className="text-xs text-slate-500 tabular-nums mt-0.5">{account.accountId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sc.variant} dot>
                    {sc.label}
                  </Badge>
                  <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-700/40 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-700/30">
                <div>
                  <p className="text-xs text-slate-500">リージョン</p>
                  <p className="text-sm text-slate-300 mt-0.5">{account.region}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">リソース</p>
                  <p className="text-sm text-white font-medium mt-0.5 tabular-nums">{account.resources}台</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">月間コスト</p>
                  <p className="text-sm text-emerald-400 font-medium mt-0.5 tabular-nums">{formatCurrency(account.monthlyCost)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/30">
                <span className="text-xs text-slate-600">最終スキャン: {account.lastScan}</span>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  再スキャン
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
