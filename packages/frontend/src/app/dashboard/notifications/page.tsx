'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import type { ApiResponse } from '@finops/shared';
import {
  Bell, MessageSquare, CheckCircle2, XCircle, Clock,
  Filter, Search, Send, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate, formatCurrency } from '@/lib/utils';

type DeliveryStatus = 'delivered' | 'sent' | 'failed' | 'queued';
type MessageType = 'weekly_report' | 'night_watch_action' | 'cost_alert' | 'system';

interface Delivery {
  id: string;
  messageType: MessageType;
  status: DeliveryStatus;
  lineUserId: string;
  displayName: string;
  sentAt: string;
  deliveredAt: string | null;
  errorMessage: string | null;
}

const statusConfig: Record<DeliveryStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  delivered: { label: '配信済み', variant: 'success' },
  sent: { label: '送信済み', variant: 'info' },
  queued: { label: '待機中', variant: 'warning' },
  failed: { label: '失敗', variant: 'danger' },
};

const typeLabels: Record<MessageType, { label: string; icon: string }> = {
  weekly_report: { label: '週次レポート', icon: '📊' },
  night_watch_action: { label: 'Night-Watch', icon: '🌙' },
  cost_alert: { label: 'コストアラート', icon: '⚠️' },
  system: { label: 'システム', icon: '🔔' },
};


interface NotifySetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultSettings: NotifySetting[] = [
  { key: 'cost_alert', label: 'コストアラート', description: '設定した閾値を超えた場合にLINEで通知', enabled: true },
  { key: 'night_watch', label: 'Night-Watch通知', description: 'リソースの自動起動/停止時にLINEで通知', enabled: true },
  { key: 'weekly_report', label: '週次レポート', description: '毎週月曜9時にコストサマリーをLINEで配信', enabled: true },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState(defaultSettings);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    apiGet<ApiResponse<{ deliveries: any[] }>>('/api/v1/line/delivery-status?limit=50')
      .then((res) => {
        if (res.success && res.data && res.data.deliveries) {
          const mapped = res.data.deliveries.map((d: any) => ({
            id: d.id,
            messageType: d.messageType as MessageType,
            status: d.status as DeliveryStatus,
            lineUserId: d.lineUserId,
            displayName: d.displayName ?? d.lineUserId,
            sentAt: d.sentAt ?? d.createdAt,
            deliveredAt: d.deliveredAt ?? null,
            errorMessage: d.errorMessage ?? null,
          }));
          setDeliveries(mapped);
        } else {
          setDeliveries([]);
        }
      })
      .catch(() => setDeliveries([]));
  }, []);

  const filtered = deliveries.filter((d) => {
    if (filter !== 'all' && d.messageType !== filter) return false;
    if (search && !d.displayName.includes(search) && !d.messageType.includes(search)) return false;
    return true;
  });

  const stats = {
    total: deliveries.length,
    delivered: deliveries.filter((d) => d.status === 'delivered').length,
    failed: deliveries.filter((d) => d.status === 'failed').length,
    queued: deliveries.filter((d) => d.status === 'queued').length,
  };

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-400" />
            LINE通知管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">LINE Messaging APIによる通知設定と配信履歴</p>
        </div>
        <Button variant="primary" className="gap-2">
          <Send className="h-4 w-4" />
          テストメッセージ送信
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">合計配信数</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">配信成功</p>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.delivered}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">配信失敗</p>
          <div className="flex items-center gap-2 mt-1">
            <XCircle className="h-5 w-5 text-red-400" />
            <p className="text-2xl font-bold text-red-400 tabular-nums">{stats.failed}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">待機中</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-5 w-5 text-amber-400" />
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{stats.queued}</p>
          </div>
        </Card>
      </div>

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-500" />
            LINE通知設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{setting.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
              </div>
              <button
                onClick={() => toggleSetting(setting.key)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {setting.enabled ? (
                  <ToggleRight className="h-7 w-7 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-slate-600" />
                )}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 配信履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>配信履歴</CardTitle>
          <div className="flex items-center gap-3">
            <Input
              icon={<Search className="h-4 w-4" />}
              placeholder="ユーザー名で検索..."
              className="w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto">
              <option value="all">すべて</option>
              <option value="weekly_report">週次レポート</option>
              <option value="night_watch_action">Night-Watch</option>
              <option value="cost_alert">コストアラート</option>
              <option value="system">システム</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((d, i) => {
              const sc = statusConfig[d.status];
              const tl = typeLabels[d.messageType];
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tl.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{tl.label}</span>
                        <Badge variant={sc.variant} dot>{sc.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.displayName} · {formatDate(d.sentAt, 'long')}
                      </p>
                    </div>
                  </div>
                  {d.errorMessage && (
                    <span className="text-xs text-red-400">{d.errorMessage}</span>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Bell className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">配信履歴がありません</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
