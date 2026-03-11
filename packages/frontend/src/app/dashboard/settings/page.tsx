'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '@/lib/api';
import type { ApiResponse } from '@finops/shared';
import {
  Settings, Building2, Bell, Clock, Shield, Save,
  ToggleLeft, ToggleRight, Link2, ExternalLink, MessageSquare,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface OrgInfo {
  name: string;
  jctId: string;
  planType: 'free' | 'pro' | 'enterprise';
  memberCount: number;
}

interface LineSettings {
  enabled: boolean;
  channelName: string;
  connectedUsers: number;
}

interface NotifyPrefs {
  costAlertEnabled: boolean;
  costAlertThresholdJpy: number;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number;
  weeklyReportHour: number;
  nightWatchNotify: boolean;
}

interface NightWatchPrefs {
  defaultWarningMinutes: number;
  defaultExtendHours: number;
}

const dayLabels = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

const planStyles: Record<string, { label: string; variant: 'success' | 'info' | 'warning' }> = {
  free: { label: 'Free', variant: 'info' },
  pro: { label: 'Pro', variant: 'success' },
  enterprise: { label: 'Enterprise', variant: 'warning' },
};

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgInfo>({
    name: 'FinOps株式会社',
    jctId: 'T1234567890123',
    planType: 'pro',
    memberCount: 5,
  });

  const [line, setLine] = useState<LineSettings>({
    enabled: true,
    channelName: 'FinOps通知Bot',
    connectedUsers: 3,
  });

  const [notify, setNotify] = useState<NotifyPrefs>({
    costAlertEnabled: true,
    costAlertThresholdJpy: 500000,
    weeklyReportEnabled: true,
    weeklyReportDay: 1,
    weeklyReportHour: 9,
    nightWatchNotify: true,
  });

  const [nw, setNw] = useState<NightWatchPrefs>({
    defaultWarningMinutes: 10,
    defaultExtendHours: 2,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<ApiResponse<any>>('/org')
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setOrg({
            name: d.name ?? 'FinOps株式会社',
            jctId: d.jctId ?? '',
            planType: d.planType ?? 'free',
            memberCount: d.memberCount ?? 0,
          });
          if (d.lineIntegration) {
            setLine((prev) => ({
              ...prev,
              enabled: d.lineIntegration.enabled ?? false,
              connectedUsers: d.lineIntegration.connectedUsers ?? 0,
            }));
          }
        }
      })
      .catch(() => {/* keep defaults */});

    apiGet<ApiResponse<any>>('/org/settings')
      .then((res) => {
        if (res.success && res.data) {
          const s = res.data;
          if (s.notifications) {
            setNotify((prev) => ({
              ...prev,
              costAlertThresholdJpy: s.notifications.costAlertThresholdJpy ?? prev.costAlertThresholdJpy,
              weeklyReportEnabled: s.notifications.weeklyReportEnabled ?? prev.weeklyReportEnabled,
              weeklyReportDay: s.notifications.weeklyReportDay ?? prev.weeklyReportDay,
              weeklyReportHour: s.notifications.weeklyReportHour ?? prev.weeklyReportHour,
            }));
          }
          if (s.nightWatch) {
            setNw({
              defaultWarningMinutes: s.nightWatch.defaultWarningMinutes ?? 10,
              defaultExtendHours: s.nightWatch.defaultExtendHours ?? 2,
            });
          }
        }
      })
      .catch(() => {/* keep defaults */});
  }, []);

  const handleSave = async () => {
    try {
      await apiPut('/org/settings', {
        notifications: {
          costAlertThresholdJpy: notify.costAlertThresholdJpy,
          weeklyReportEnabled: notify.weeklyReportEnabled,
          weeklyReportDay: notify.weeklyReportDay,
          weeklyReportHour: notify.weeklyReportHour,
        },
        nightWatch: {
          defaultWarningMinutes: nw.defaultWarningMinutes,
          defaultExtendHours: nw.defaultExtendHours,
        },
      });
    } catch {/* ignore */}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ps = planStyles[org.planType];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-emerald-400" />
            設定
          </h1>
          <p className="text-sm text-slate-500 mt-1">組織設定・LINE連携・通知設定</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saved ? '保存しました ✓' : '設定を保存'}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 組織情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              組織情報
            </CardTitle>
            <Badge variant={ps.variant}>{ps.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">組織名</label>
              <Input value={org.name} readOnly />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">適格請求書発行事業者番号</label>
              <Input value={org.jctId} readOnly />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <span className="text-sm text-slate-400">メンバー数</span>
              <span className="text-sm font-medium text-white">{org.memberCount}名</span>
            </div>
          </CardContent>
        </Card>

        {/* LINE連携 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#06C755]" />
              LINE連携
            </CardTitle>
            <Badge variant={line.enabled ? 'success' : 'default'} dot>
              {line.enabled ? '接続中' : '未接続'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#06C755]/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-[#06C755]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{line.channelName}</p>
                  <p className="text-xs text-slate-500">{line.connectedUsers}人接続中</p>
                </div>
              </div>
              <button
                onClick={() => setLine((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className="transition-colors"
              >
                {line.enabled ? (
                  <ToggleRight className="h-7 w-7 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-slate-600" />
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">LINE公式アカウントの友だち追加</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                LINEアプリでQRコードを読み取るか、下のリンクから友だち追加してください。
              </p>
              <button className="mt-2 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                <ExternalLink className="h-3 w-3" />
                友だち追加リンクを開く
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* コストアラート */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-800/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">コストアラート</span>
                <button onClick={() => setNotify((p) => ({ ...p, costAlertEnabled: !p.costAlertEnabled }))}>
                  {notify.costAlertEnabled ? (
                    <ToggleRight className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-600" />
                  )}
                </button>
              </div>
              {notify.costAlertEnabled && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">通知閾値 (月額 JPY)</label>
                  <Input
                    type="number"
                    value={notify.costAlertThresholdJpy}
                    onChange={(e) => setNotify((p) => ({ ...p, costAlertThresholdJpy: Number(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            {/* 週次レポート */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-800/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">週次レポート配信</span>
                <button onClick={() => setNotify((p) => ({ ...p, weeklyReportEnabled: !p.weeklyReportEnabled }))}>
                  {notify.weeklyReportEnabled ? (
                    <ToggleRight className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-600" />
                  )}
                </button>
              </div>
              {notify.weeklyReportEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">配信曜日</label>
                    <Select
                      value={notify.weeklyReportDay}
                      onChange={(e) => setNotify((p) => ({ ...p, weeklyReportDay: Number(e.target.value) }))}
                    >
                      {dayLabels.map((l, i) => (
                        <option key={i} value={i}>{l}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">配信時刻 (JST)</label>
                    <Select
                      value={notify.weeklyReportHour}
                      onChange={(e) => setNotify((p) => ({ ...p, weeklyReportHour: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Night-Watch通知 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30">
              <div>
                <span className="text-sm font-medium text-slate-200">Night-Watch通知</span>
                <p className="text-xs text-slate-500 mt-0.5">リソース起動/停止時にLINE通知</p>
              </div>
              <button onClick={() => setNotify((p) => ({ ...p, nightWatchNotify: !p.nightWatchNotify }))}>
                {notify.nightWatchNotify ? (
                  <ToggleRight className="h-6 w-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-slate-600" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Night-Watch設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Night-Watch デフォルト設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">停止前警告 (分)</label>
              <Select
                value={nw.defaultWarningMinutes}
                onChange={(e) => setNw((p) => ({ ...p, defaultWarningMinutes: Number(e.target.value) }))}
              >
                {[5, 10, 15, 30, 60].map((v) => (
                  <option key={v} value={v}>{v}分前</option>
                ))}
              </Select>
              <p className="text-xs text-slate-500 mt-1">リソース停止前にLINEで警告を送信</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">デフォルト延長時間</label>
              <Select
                value={nw.defaultExtendHours}
                onChange={(e) => setNw((p) => ({ ...p, defaultExtendHours: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 6, 8].map((v) => (
                  <option key={v} value={v}>{v}時間</option>
                ))}
              </Select>
              <p className="text-xs text-slate-500 mt-1">LINE Postbackボタンで延長する際のデフォルト値</p>
            </div>

            {/* セキュリティ情報 */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">セキュリティ</span>
              </div>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Webhook署名検証</span>
                  <Badge variant="success">有効</Badge>
                </div>
                <div className="flex justify-between">
                  <span>JWT認証</span>
                  <Badge variant="success">HS256</Badge>
                </div>
                <div className="flex justify-between">
                  <span>APPI準拠</span>
                  <Badge variant="success">AES-256-GCM</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
