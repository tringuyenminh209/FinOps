'use client';

import { useState, useEffect } from 'react';
import {
  ScrollText, Search, Filter, User, Shield, Clock,
  Server, Cloud, Settings, Zap, ChevronDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate, cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import type { ApiResponse } from '@finops/shared';

interface AuditEntry {
  id: string;
  orgId: string;
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}


const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create:          { label: '作成',          color: 'text-emerald-400', icon: Server },
  update:          { label: '更新',          color: 'text-blue-400',    icon: Settings },
  delete:          { label: '削除',          color: 'text-red-400',     icon: Server },
  scan:            { label: 'スキャン',       color: 'text-cyan-400',    icon: Cloud },
  approve:         { label: '承認',          color: 'text-emerald-400', icon: Shield },
  reject:          { label: '却下',          color: 'text-red-400',     icon: Shield },
  override:        { label: 'Override延長',  color: 'text-yellow-400',  icon: Clock },
  analyze:         { label: 'AI分析',        color: 'text-purple-400',  icon: Zap },
  calculate:       { label: 'CO2計算',       color: 'text-green-400',   icon: Zap },
  send_report:     { label: 'レポート送信',  color: 'text-cyan-400',    icon: Zap },
  night_watch_stop:  { label: 'NW停止',      color: 'text-slate-400',   icon: Clock },
  night_watch_start: { label: 'NW起動',      color: 'text-emerald-400', icon: Clock },
};

const TARGET_LABELS: Record<string, string> = {
  cloud_account: 'クラウドアカウント',
  approval: '稟議',
  schedule: 'スケジュール',
  resource: 'リソース',
  ai_advisor: 'AI Advisor',
  org_settings: '組織設定',
  carbon: 'GreenOps',
  line_notification: 'LINE通知',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');

  useEffect(() => {
    apiGet<ApiResponse<AuditEntry[]>>('/api/v1/org/audit')
      .then((res) => { if (res.success && res.data) setEntries(res.data); else setEntries([]); })
      .catch(() => setEntries([]));
  }, []);

  const filtered = entries.filter((e) => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (targetFilter !== 'all' && e.targetType !== targetFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!e.action.includes(s) && !e.targetType.includes(s) && !JSON.stringify(e.details).toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));
  const uniqueTargets = Array.from(new Set(entries.map((e) => e.targetType)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-emerald-400" />
          操作履歴
        </h1>
        <p className="text-sm text-slate-500 mt-1">組織内の全操作ログ (管理者のみ閲覧可)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">総ログ数</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{entries.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">今日</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            {entries.filter((e) => new Date(e.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">操作種別</p>
          <p className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">{uniqueActions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">ユーザー</p>
          <p className="text-2xl font-bold text-purple-400 mt-1 tabular-nums">
            {new Set(entries.filter((e) => e.userId).map((e) => e.userId)).size}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="アクション・対象・詳細で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">全アクション</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
          ))}
        </Select>
        <Select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
          <option value="all">全対象</option>
          {uniqueTargets.map((t) => (
            <option key={t} value={t}>{TARGET_LABELS[t] ?? t}</option>
          ))}
        </Select>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">時刻</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">アクション</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">対象</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">詳細</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">ユーザー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/20">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                      該当するログはありません
                    </td>
                  </tr>
                )}
                {filtered.map((entry) => {
                  const ac = ACTION_CONFIG[entry.action];
                  const ActionIcon = ac?.icon ?? Zap;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn('flex items-center gap-2 text-sm font-medium', ac?.color ?? 'text-slate-300')}>
                          <ActionIcon className="h-4 w-4 shrink-0" />
                          {ac?.label ?? entry.action}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{TARGET_LABELS[entry.targetType] ?? entry.targetType}</span>
                          {entry.targetId && (
                            <span className="text-xs text-slate-600 font-mono">{entry.targetId.slice(0, 8)}…</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-slate-500 max-w-xs truncate">
                          {Object.entries(entry.details)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center">
                            {entry.userId ? (
                              <User className="h-3 w-3 text-slate-400" />
                            ) : (
                              <Zap className="h-3 w-3 text-emerald-400" />
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {entry.userId ? entry.userId.slice(0, 8) + '…' : 'System'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
