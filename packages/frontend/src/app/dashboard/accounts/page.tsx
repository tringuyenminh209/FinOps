'use client';

import { useState, useEffect } from 'react';
import { Cloud, Plus, RefreshCw, MoreVertical, CheckCircle2, XCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCurrency, cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

interface CloudAccount {
  id: string;
  orgId: string;
  provider: string;
  arnRole: string;
  externalId: string;
  region: string;
  accountAlias: string | null;
  isActive: boolean;
  lastScanAt: string | null;
  createdAt: string;
}

interface DisplayAccount {
  id: string;
  alias: string;
  provider: string;
  accountId: string;
  region: string;
  status: 'active' | 'inactive';
  resources: number;
  monthlyCost: number;
  lastScan: string | null;
}

const statusConfig = {
  active: { label: 'アクティブ', variant: 'success' as const, icon: CheckCircle2 },
  inactive: { label: '無効', variant: 'default' as const, icon: XCircle },
  error: { label: 'エラー', variant: 'danger' as const, icon: AlertCircle },
};

const AWS_REGIONS = [
  { value: 'ap-northeast-1', label: '東京 (ap-northeast-1)' },
  { value: 'ap-northeast-3', label: '大阪 (ap-northeast-3)' },
  { value: 'us-east-1', label: 'バージニア (us-east-1)' },
  { value: 'us-west-2', label: 'オレゴン (us-west-2)' },
  { value: 'eu-west-1', label: 'アイルランド (eu-west-1)' },
  { value: 'ap-southeast-1', label: 'シンガポール (ap-southeast-1)' },
];

function AddAccountModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [arnRole, setArnRole] = useState('');
  const [externalId, setExternalId] = useState('');
  const [region, setRegion] = useState('ap-northeast-1');
  const [accountAlias, setAccountAlias] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setError('');
    if (!arnRole.trim() || arnRole.length < 20) {
      setError('有効なARN Roleを入力してください（20文字以上）');
      return;
    }
    if (!externalId.trim()) {
      setError('External IDを入力してください');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/accounts', {
        provider: 'aws',
        arnRole,
        externalId,
        region,
        accountAlias: accountAlias.trim() || undefined,
      });
      onAdded();
      onClose();
    } catch {
      setError('アカウントの追加に失敗しました。入力内容を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">AWSアカウント追加</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">アカウント名（任意）</label>
            <Input
              placeholder="例: Production Account"
              value={accountAlias}
              onChange={(e) => setAccountAlias(e.target.value)}
              icon={<Cloud className="h-4 w-4" />}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">IAM Role ARN <span className="text-red-400">*</span></label>
            <Input
              placeholder="arn:aws:iam::123456789012:role/FinOpsReadOnly"
              value={arnRole}
              onChange={(e) => setArnRole(e.target.value)}
            />
            <p className="text-xs text-slate-600">クロスアカウントアクセス用のIAM Roleを指定してください</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">External ID <span className="text-red-400">*</span></label>
            <Input
              placeholder="例: 123456789012"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">リージョン</label>
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              {AWS_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>
            キャンセル
          </Button>
          <Button size="md" className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                追加中...
              </span>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                追加する
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<DisplayAccount[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAccounts = () => {
    apiGet<{ success: boolean; data: CloudAccount[] }>('/accounts')
      .then((res) => {
        if (res.success && res.data) {
          const mapped: DisplayAccount[] = res.data.map((a) => ({
            id: a.id,
            alias: a.accountAlias ?? a.externalId,
            provider: 'AWS',
            accountId: a.externalId,
            region: a.region,
            status: a.isActive ? 'active' : 'inactive',
            resources: 0,
            monthlyCost: 0,
            lastScan: a.lastScanAt,
          }));
          setAccounts(mapped);
        } else {
          setAccounts([]);
        }
      })
      .catch(() => setAccounts([]));
  };

  useEffect(() => { fetchAccounts(); }, []);

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
        <Button size="md" onClick={() => setShowAddModal(true)}>
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
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Cloud className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">クラウドアカウントが接続されていません</p>
          <p className="text-slate-500 text-sm mt-1">AWSアカウントを追加してリソース管理を開始してください</p>
          <Button size="md" className="mt-4" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            アカウント追加
          </Button>
        </div>
      ) : (
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
                  <span className="text-xs text-slate-600">最終スキャン: {account.lastScan ?? '未スキャン'}</span>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-3.5 w-3.5" />
                    再スキャン
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddAccountModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={fetchAccounts}
      />
    </div>
  );
}
