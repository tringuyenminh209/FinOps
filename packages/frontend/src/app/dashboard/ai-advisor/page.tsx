'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, TrendingDown, CheckCircle, XCircle, Clock,
  AlertTriangle, Zap, Leaf, RefreshCw, ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { Optimization, ApiResponse } from '@finops/shared';

// ── アクションタイプ表示設定 ──

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ri_purchase: { label: 'RI購入', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Zap },
  sp_purchase: { label: 'Savings Plan', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', icon: Zap },
  rightsize: { label: 'サイズ変更', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: TrendingDown },
  stop: { label: '停止・削除', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: '保留中', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  approved: { label: '承認済み', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', icon: CheckCircle },
  executed: { label: '実行済み', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: CheckCircle },
  dismissed: { label: '却下', color: 'text-slate-400 bg-slate-400/10 border-slate-400/30', icon: XCircle },
};

// ── デモデータ ──

const DEMO_RECOMMENDATIONS: Optimization[] = [
  {
    id: '1',
    resourceId: 'r1',
    recommendedBy: 'gpt-4o-mini',
    actionType: 'ri_purchase',
    actionDescription: 'prod-api-server は常時稼働中です。1年間のReserved Instanceを購入することで約40%のコスト削減が見込めます。月額¥18,000 → ¥10,800 に削減可能です。',
    status: 'pending',
    savingsJpy: 7200,
    co2ReducedKg: 5.8,
    details: { analyzedAt: new Date().toISOString() },
    recommendedAt: new Date(),
    executedAt: null,
  },
  {
    id: '2',
    resourceId: 'r2',
    recommendedBy: 'gpt-4o-mini',
    actionType: 'rightsize',
    actionDescription: 'dev-db-01 のCPU使用率が5%以下で推移しています。db.t3.medium から db.t3.small へのダウンサイジングで25%削減可能です。',
    status: 'pending',
    savingsJpy: 3500,
    co2ReducedKg: 2.1,
    details: { analyzedAt: new Date().toISOString() },
    recommendedAt: new Date(),
    executedAt: null,
  },
  {
    id: '3',
    resourceId: 'r3',
    recommendedBy: 'gpt-4o-mini',
    actionType: 'stop',
    actionDescription: 'test-ec2-old は14日間停止中ですが月額コストが発生しています。不要なEBSボリュームが原因です。削除することで完全にコストを削減できます。',
    status: 'approved',
    savingsJpy: 2100,
    co2ReducedKg: 1.6,
    details: { analyzedAt: new Date().toISOString() },
    recommendedAt: new Date(Date.now() - 86400000),
    executedAt: new Date(),
  },
  {
    id: '4',
    resourceId: 'r4',
    recommendedBy: 'gpt-4o-mini',
    actionType: 'sp_purchase',
    actionDescription: '過去3ヶ月のコンピューティング使用量から、Compute Savings Planの購入が最適です。月額¥25,000で30%削減が見込めます。',
    status: 'dismissed',
    savingsJpy: 7500,
    co2ReducedKg: 4.2,
    details: { analyzedAt: new Date().toISOString() },
    recommendedAt: new Date(Date.now() - 172800000),
    executedAt: null,
  },
];

export default function AiAdvisorPage() {
  const [recommendations, setRecommendations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [isDemo, setIsDemo] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const query = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiGet<ApiResponse<Optimization[]>>(`/api/v1/ai/recommendations${query}`);
      if (res.success && res.data && res.data.length > 0) {
        setRecommendations(res.data);
      } else if (res.success && res.data?.length === 0) {
        setRecommendations([]);
      } else {
        setRecommendations(DEMO_RECOMMENDATIONS);
        setIsDemo(true);
      }
    } catch {
      setRecommendations(DEMO_RECOMMENDATIONS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecommendations(); }, [filter]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await apiPost<ApiResponse<Optimization[]>>('/api/v1/ai/analyze', {});
      if (res.success && res.data && res.data.length > 0) {
        setIsDemo(false);
        await fetchRecommendations();
      }
    } catch (err) {
      console.error('Analyze error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdate = async (id: string, status: 'approved' | 'dismissed') => {
    if (isDemo) {
      setRecommendations(prev =>
        prev.map(r => r.id === id ? { ...r, status } : r)
      );
      return;
    }

    setUpdatingId(id);
    try {
      const res = await apiPut<ApiResponse<Optimization>>(`/api/v1/ai/recommendations/${id}`, { status });
      if (res.success && res.data) {
        setRecommendations(prev =>
          prev.map(r => r.id === id ? res.data! : r)
        );
      }
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // KPI 集計
  const allRecs = isDemo ? DEMO_RECOMMENDATIONS : recommendations;
  const pending = allRecs.filter(r => r.status === 'pending').length;
  const approved = allRecs.filter(r => r.status === 'approved').length;
  const totalSavings = allRecs
    .filter(r => r.status === 'pending' || r.status === 'approved')
    .reduce((s, r) => s + r.savingsJpy, 0);
  const totalCo2 = allRecs
    .filter(r => r.status === 'pending' || r.status === 'approved')
    .reduce((s, r) => s + r.co2ReducedKg, 0);

  const displayRecs = recommendations.length > 0 || !isDemo ? recommendations : DEMO_RECOMMENDATIONS;
  const filtered = filter === 'all' ? displayRecs : displayRecs.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            AI Advisor
          </h1>
          <p className="text-sm text-slate-500 mt-1">GPT-4o miniによるクラウドコスト最適化提案</p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <Badge variant="outline" className="text-xs">デモデータ</Badge>
          )}
          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2"
          >
            <Sparkles className={cn('h-4 w-4', analyzing && 'animate-pulse')} />
            {analyzing ? 'AI分析中...' : 'AI分析を実行'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">保留中</p>
            <Clock className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-yellow-400 tabular-nums">{pending}</p>
          <p className="text-xs text-slate-500 mt-1">承認待ちの推奨</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">承認済み</p>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">{approved}</p>
          <p className="text-xs text-slate-500 mt-1">実行承認済み</p>
        </Card>

        <Card className="p-5 border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">月間削減見込み</p>
            <TrendingDown className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatCurrency(totalSavings)}</p>
          <p className="text-xs text-slate-500 mt-1">年間: {formatCurrency(totalSavings * 12)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">CO2削減見込み</p>
            <Leaf className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {totalCo2.toFixed(1)} <span className="text-base text-slate-500">kg</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">月間合計</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: '全て' },
          { key: 'pending', label: '保留中' },
          { key: 'approved', label: '承認済み' },
          { key: 'dismissed', label: '却下' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === key
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-sm text-slate-500">推奨データを読み込み中...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">推奨アクションがありません</p>
          <p className="text-slate-500 text-sm mt-1">「AI分析を実行」ボタンでコスト分析を開始してください</p>
          <Button variant="primary" onClick={handleAnalyze} disabled={analyzing} className="mt-4">
            <Sparkles className="h-4 w-4 mr-2" />
            AI分析を実行
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => {
            const actionConfig = ACTION_CONFIG[rec.actionType] ?? ACTION_CONFIG['rightsize'];
            const statusConfig = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG['pending'];
            const ActionIcon = actionConfig.icon;
            const StatusIcon = statusConfig.icon;
            const isUpdating = updatingId === rec.id;

            return (
              <Card key={rec.id} className="p-5 hover:border-slate-600/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Action Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <ActionIcon className="h-5 w-5 text-purple-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={cn('text-xs', actionConfig.color)}>
                        {actionConfig.label}
                      </Badge>
                      <Badge className={cn('text-xs flex items-center gap-1', statusConfig.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                      {rec.recommendedBy && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {rec.recommendedBy}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">{rec.actionDescription}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400 tabular-nums">
                          {formatCurrency(rec.savingsJpy)}/月
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Leaf className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-sm text-slate-400 tabular-nums">
                          CO2 {rec.co2ReducedKg.toFixed(2)}kg削減
                        </span>
                      </div>
                      <span className="text-xs text-slate-600">
                        {new Date(rec.recommendedAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {rec.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        onClick={() => handleUpdate(rec.id, 'approved')}
                        disabled={isUpdating}
                        className="text-xs px-3 py-1.5 h-auto flex items-center gap-1"
                      >
                        {isUpdating ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        承認
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleUpdate(rec.id, 'dismissed')}
                        disabled={isUpdating}
                        className="text-xs px-3 py-1.5 h-auto text-slate-400 hover:text-red-400 flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        却下
                      </Button>
                    </div>
                  )}

                  {rec.status !== 'pending' && (
                    <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Info Card */}
      <Card className="p-5 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">AI Advisor について</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              GPT-4o miniがクラウドリソースの利用状況を分析し、日本のSME向けに最適化提案を生成します。
              推奨アクションを承認する前に、必ずコスト試算と業務影響を確認してください。
              Prompt Cachingにより分析コストを最小化しています。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
