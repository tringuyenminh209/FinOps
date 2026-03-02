'use client';

import { useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

// ── モックデータ ──
const ALL_RESOURCES = [
  { id: '1', name: 'web-prod-01', type: 'EC2', account: '本番環境', status: 'running' as const, monthlyCost: 45200, lastSeen: '2026-03-02T10:30:00' },
  { id: '2', name: 'api-prod-01', type: 'EC2', account: '本番環境', status: 'running' as const, monthlyCost: 38400, lastSeen: '2026-03-02T10:30:00' },
  { id: '3', name: 'db-primary', type: 'RDS', account: '本番環境', status: 'running' as const, monthlyCost: 128000, lastSeen: '2026-03-02T10:28:00' },
  { id: '4', name: 'cache-redis', type: 'EC2', account: '本番環境', status: 'running' as const, monthlyCost: 22400, lastSeen: '2026-03-02T10:30:00' },
  { id: '5', name: 'staging-web', type: 'EC2', account: 'ステージング', status: 'stopped' as const, monthlyCost: 0, lastSeen: '2026-03-01T18:00:00' },
  { id: '6', name: 'staging-db', type: 'RDS', account: 'ステージング', status: 'stopped' as const, monthlyCost: 0, lastSeen: '2026-03-01T18:00:00' },
  { id: '7', name: 'dev-app', type: 'EC2', account: '開発環境', status: 'stopped' as const, monthlyCost: 0, lastSeen: '2026-03-01T18:00:00' },
  { id: '8', name: 'logs-bucket', type: 'S3', account: '本番環境', status: 'running' as const, monthlyCost: 3200, lastSeen: '2026-03-02T10:30:00' },
  { id: '9', name: 'data-pipeline', type: 'Lambda', account: '本番環境', status: 'running' as const, monthlyCost: 8600, lastSeen: '2026-03-02T10:25:00' },
  { id: '10', name: 'legacy-app', type: 'EC2', account: '本番環境', status: 'terminated' as const, monthlyCost: 0, lastSeen: '2026-02-15T12:00:00' },
];

const TYPE_OPTIONS = ['すべて', 'EC2', 'RDS', 'S3', 'Lambda'];
const STATUS_OPTIONS = ['すべて', 'running', 'stopped', 'terminated'];
const ACCOUNT_OPTIONS = ['すべて', '本番環境', 'ステージング', '開発環境'];

const STATUS_STYLES: Record<string, string> = {
  running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  stopped: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  running: '稼働中',
  stopped: '停止中',
  terminated: '終了',
};

const TYPE_STYLES: Record<string, string> = {
  EC2: 'bg-orange-500/10 text-orange-400',
  RDS: 'bg-blue-500/10 text-blue-400',
  S3: 'bg-green-500/10 text-green-400',
  Lambda: 'bg-purple-500/10 text-purple-400',
};

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('すべて');
  const [statusFilter, setStatusFilter] = useState('すべて');
  const [accountFilter, setAccountFilter] = useState('すべて');

  const filtered = ALL_RESOURCES.filter((r) => {
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'すべて' && r.type !== typeFilter) return false;
    if (statusFilter !== 'すべて' && r.status !== statusFilter) return false;
    if (accountFilter !== 'すべて' && r.account !== accountFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ツールバー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 検索 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="リソース名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
          <Download className="h-4 w-4" />
          CSV出力
        </button>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <FilterSelect
          label="タイプ"
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        <FilterSelect
          label="ステータス"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterSelect
          label="アカウント"
          options={ACCOUNT_OPTIONS}
          value={accountFilter}
          onChange={setAccountFilter}
        />
        <span className="text-xs text-slate-500">
          {filtered.length}件 / {ALL_RESOURCES.length}件
        </span>
      </div>

      {/* テーブル */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">リソース名</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">タイプ</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">アカウント</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">ステータス</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">月間コスト</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">最終確認</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((resource) => (
                <tr key={resource.id} className="hover:bg-slate-750 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-200">
                    {resource.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', TYPE_STYLES[resource.type] || 'bg-slate-700 text-slate-300')}>
                      {resource.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                    {resource.account}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[resource.status])}>
                      {STATUS_LABELS[resource.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                    {formatCurrency(resource.monthlyCost)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                    {formatDate(resource.lastSeen)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    該当するリソースがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {label}: {opt}
        </option>
      ))}
    </select>
  );
}
