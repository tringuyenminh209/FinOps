'use client';

import { Cloud, Plus, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn, formatDate, formatNumber } from '@/lib/utils';

// ── モックデータ ──
const MOCK_ACCOUNTS = [
  {
    id: '1',
    provider: 'aws' as const,
    alias: '本番環境 (Production)',
    region: 'ap-northeast-1',
    status: 'active' as const,
    lastScan: '2026-03-02T10:15:00',
    resourceCount: 24,
    monthlyCost: 890000,
  },
  {
    id: '2',
    provider: 'aws' as const,
    alias: 'ステージング環境',
    region: 'ap-northeast-1',
    status: 'active' as const,
    lastScan: '2026-03-02T10:15:00',
    resourceCount: 12,
    monthlyCost: 145000,
  },
  {
    id: '3',
    provider: 'azure' as const,
    alias: '開発環境 (Dev)',
    region: 'japaneast',
    status: 'error' as const,
    lastScan: '2026-02-28T08:00:00',
    resourceCount: 8,
    monthlyCost: 45000,
  },
];

const PROVIDER_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  aws: { label: 'AWS', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  azure: { label: 'Azure', bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  active: { label: '接続中', icon: CheckCircle2, color: 'text-emerald-400' },
  error: { label: 'エラー', icon: AlertCircle, color: 'text-red-400' },
};

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            接続済みのクラウドアカウントを管理します
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors">
          <Plus className="h-4 w-4" />
          アカウント追加
        </button>
      </div>

      {/* アカウントカード一覧 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_ACCOUNTS.map((account) => {
          const provider = PROVIDER_STYLES[account.provider];
          const status = STATUS_CONFIG[account.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={account.id}
              className="rounded-xl border border-slate-700 bg-slate-800 p-6 hover:border-slate-600 transition-colors"
            >
              {/* プロバイダバッジ + ステータス */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold',
                    provider.bg,
                    provider.text,
                  )}
                >
                  <Cloud className="h-3.5 w-3.5" />
                  {provider.label}
                </span>
                <div className={cn('flex items-center gap-1', status.color)}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="text-xs font-medium">{status.label}</span>
                </div>
              </div>

              {/* アカウント名 */}
              <h3 className="text-base font-semibold text-slate-100 mb-1">
                {account.alias}
              </h3>
              <p className="text-xs text-slate-500 mb-4">{account.region}</p>

              {/* 統計 */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                <div>
                  <p className="text-xs text-slate-500">リソース数</p>
                  <p className="text-lg font-bold text-slate-100">
                    {formatNumber(account.resourceCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">月間コスト</p>
                  <p className="text-lg font-bold text-slate-100">
                    ¥{formatNumber(account.monthlyCost)}
                  </p>
                </div>
              </div>

              {/* 最終スキャン */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  最終スキャン: {formatDate(account.lastScan, 'long')}
                </p>
                <button className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
