'use client';

import { useState, useEffect } from 'react';
import {
  CheckSquare, Clock, CheckCircle2, XCircle, AlertTriangle,
  Plus, User, Calendar, ChevronDown, MessageSquare, Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { ApiResponse } from '@finops/shared';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
type ActionType = 'start' | 'stop' | 'resize' | 'delete' | 'other';
type Urgency = 'low' | 'normal' | 'high';

interface Approval {
  id: string;
  title: string;
  description: string;
  actionType: ActionType;
  urgency: Urgency;
  status: ApprovalStatus;
  requesterId: string;
  approverId: string | null;
  resourceId: string | null;
  estimatedCostJpy: number;
  approverComment: string | null;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
}

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  urgent: number;
}

const ZERO_STATS: ApprovalStats = { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0, urgent: 0 };

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'default'; icon: any }> = {
  pending:  { label: '保留中',   variant: 'warning', icon: Clock },
  approved: { label: '承認済み', variant: 'success', icon: CheckCircle2 },
  rejected: { label: '却下',    variant: 'danger',  icon: XCircle },
  expired:  { label: '期限切れ', variant: 'default', icon: AlertTriangle },
};

const ACTION_LABELS: Record<ActionType, string> = {
  start:  '起動',
  stop:   '停止',
  resize: 'スペック変更',
  delete: '削除',
  other:  'その他',
};

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string }> = {
  high:   { label: '緊急', color: 'text-red-400' },
  normal: { label: '通常', color: 'text-yellow-400' },
  low:    { label: '低',   color: 'text-slate-400' },
};

export default function ApprovalsPage() {
  const [approvalList, setApprovalList] = useState<Approval[]>([]);
  const [stats, setStats] = useState<ApprovalStats>(ZERO_STATS);
  const [filter, setFilter] = useState<string>('all');
  const [comment, setComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newApproval, setNewApproval] = useState({ title: '', description: '', actionType: 'stop' as ActionType, urgency: 'normal' as Urgency, estimatedCostJpy: 0 });

  useEffect(() => {
    apiGet<ApiResponse<Approval[]>>('/approvals')
      .then((res) => { if (res.success && res.data) setApprovalList(res.data); else setApprovalList([]); })
      .catch(() => setApprovalList([]));
    apiGet<ApiResponse<ApprovalStats>>('/approvals/stats')
      .then((res) => { if (res.success && res.data) setStats(res.data); else setStats(ZERO_STATS); })
      .catch(() => setStats(ZERO_STATS));
  }, []);

  const filtered = filter === 'all' ? approvalList : approvalList.filter((a) => a.status === filter);

  const handleRespond = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(id);
    try {
      const res = await apiPut<ApiResponse<Approval>>(`/approvals/${id}/respond`, {
        status,
        comment: comment[id] ?? '',
      });
      if (res.success && res.data) {
        setApprovalList((prev) => prev.map((a) => a.id === id ? res.data! : a));
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          [status === 'approved' ? 'approved' : 'rejected']: prev[status === 'approved' ? 'approved' : 'rejected'] + 1,
        }));
      }
    } catch {
      // optimistic local update on error
      setApprovalList((prev) => prev.map((a) => a.id === id
        ? { ...a, status, approverComment: comment[id] ?? null, respondedAt: new Date().toISOString() }
        : a));
    }
    setLoading(null);
  };

  const handleCreate = async () => {
    if (!newApproval.title || !newApproval.description) return;
    try {
      const res = await apiPost<ApiResponse<Approval>>('/approvals', {
        ...newApproval,
        expiresInHours: 48,
      });
      if (res.success && res.data) {
        setApprovalList((prev) => [res.data!, ...prev]);
        setStats((prev) => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
      }
    } catch {
      console.error('稟議申請の送信に失敗しました');
    }
    setNewApproval({ title: '', description: '', actionType: 'stop', urgency: 'normal', estimatedCostJpy: 0 });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-emerald-400" />
            稟議管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">リソース操作の承認ワークフロー</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          稟議申請
        </Button>
      </div>

      {/* New Approval Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>新規稟議申請</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">タイトル</label>
                <Input
                  placeholder="申請のタイトルを入力..."
                  value={newApproval.title}
                  onChange={(e) => setNewApproval((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">操作種別</label>
                <Select value={newApproval.actionType} onChange={(e) => setNewApproval((p) => ({ ...p, actionType: e.target.value as ActionType }))}>
                  <option value="start">起動</option>
                  <option value="stop">停止</option>
                  <option value="resize">スペック変更</option>
                  <option value="delete">削除</option>
                  <option value="other">その他</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">緊急度</label>
                <Select value={newApproval.urgency} onChange={(e) => setNewApproval((p) => ({ ...p, urgency: e.target.value as Urgency }))}>
                  <option value="low">低</option>
                  <option value="normal">通常</option>
                  <option value="high">緊急</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">推定コスト (JPY)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newApproval.estimatedCostJpy || ''}
                  onChange={(e) => setNewApproval((p) => ({ ...p, estimatedCostJpy: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">申請理由</label>
                <textarea
                  className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm px-4 py-3 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                  placeholder="申請の詳細・理由を記入してください..."
                  value={newApproval.description}
                  onChange={(e) => setNewApproval((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>キャンセル</Button>
              <Button variant="primary" onClick={handleCreate} disabled={!newApproval.title || !newApproval.description}>申請する</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: '総申請数', value: stats.total, color: 'text-slate-300' },
          { label: '保留中', value: stats.pending, color: 'text-yellow-400' },
          { label: '承認済み', value: stats.approved, color: 'text-emerald-400' },
          { label: '却下', value: stats.rejected, color: 'text-red-400' },
          { label: '期限切れ', value: stats.expired, color: 'text-slate-500' },
          { label: '緊急対応', value: stats.urgent, color: 'text-red-400' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</p>
            <p className={cn('text-2xl font-bold mt-1 tabular-nums', item.color)}>{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: '全て' },
          { key: 'pending', label: '保留中' },
          { key: 'approved', label: '承認済み' },
          { key: 'rejected', label: '却下' },
          { key: 'expired', label: '期限切れ' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              filter === tab.key
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approval List */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <CheckSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">該当する稟議はありません</p>
          </Card>
        )}
        {filtered.map((approval) => {
          const sc = STATUS_CONFIG[approval.status];
          const ug = URGENCY_CONFIG[approval.urgency];
          const StatusIcon = sc.icon;
          return (
            <Card key={approval.id} className="overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={sc.variant}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {sc.label}
                      </Badge>
                      <span className={cn('text-xs font-medium', ug.color)}>
                        {ug.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-400">
                        {ACTION_LABELS[approval.actionType]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white text-base truncate">{approval.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{approval.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {approval.estimatedCostJpy > 0 && (
                      <p className="text-sm font-medium text-emerald-400 tabular-nums">
                        {formatCurrency(approval.estimatedCostJpy)}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{formatDate(approval.createdAt)}</p>
                  </div>
                </div>

                {/* Approver comment */}
                {approval.approverComment && (
                  <div className="mt-3 flex gap-2 p-3 rounded-xl bg-slate-800/40">
                    <MessageSquare className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400">{approval.approverComment}</p>
                  </div>
                )}

                {/* Action buttons for pending */}
                {approval.status === 'pending' && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-slate-700/30">
                    <Input
                      placeholder="コメント (任意)"
                      value={comment[approval.id] ?? ''}
                      onChange={(e) => setComment((p) => ({ ...p, [approval.id]: e.target.value }))}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRespond(approval.id, 'approved')}
                        disabled={loading === approval.id}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        承認
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRespond(approval.id, 'rejected')}
                        disabled={loading === approval.id}
                      >
                        <XCircle className="h-4 w-4" />
                        却下
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
