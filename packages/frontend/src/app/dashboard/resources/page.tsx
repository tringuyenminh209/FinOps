'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { apiGet } from '@/lib/api';
import type { ApiResponse } from '@finops/shared';

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  region: string;
  monthlyCost: number;
}


export default function ResourcesPage() {
  const [allResources, setAllResources] = useState<ResourceItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    apiGet<ApiResponse<{ resources: any[]; total: number }>>('/api/v1/resources')
      .then((res) => {
        if (res.success && res.data && res.data.resources.length > 0) {
          const mapped = res.data.resources.map((r: any) => ({
            id: r.id,
            name: r.name || r.externalId,
            type: `${r.resourceType.toUpperCase()}`,
            status: r.status,
            region: r.region,
            monthlyCost: r.monthlyCostJpy ?? 0,
          }));
          setAllResources(mapped);
        } else {
          setAllResources([]);
        }
      })
      .catch(() => setAllResources([]));
  }, []);

  const filtered = allResources.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && !r.type.toLowerCase().includes(typeFilter.toLowerCase())) return false;
    return true;
  });

  const running = allResources.filter((r) => r.status === 'running').length;
  const stopped = allResources.filter((r) => r.status === 'stopped').length;
  const totalCost = allResources.reduce((s, r) => s + r.monthlyCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">リソース管理</h1>
          <p className="text-sm text-slate-500 mt-1">全アカウントのクラウドリソース一覧</p>
        </div>
        <Button variant="secondary" size="md">
          <Download className="h-4 w-4" />
          CSV出力
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">総リソース数</p>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{allResources.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">稼働中</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="success" dot>{running}台</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">停止中</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default">{stopped}台</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">月間合計コスト</p>
          <p className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">¥{totalCost.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="リソース名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">全ステータス</option>
          <option value="running">稼働中</option>
          <option value="stopped">停止</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">全タイプ</option>
          <option value="EC2">EC2</option>
          <option value="RDS">RDS</option>
          <option value="ElastiCache">ElastiCache</option>
        </Select>
      </div>

      {/* Table */}
      {allResources.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Server className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium">リソースがありません</p>
              <p className="text-slate-500 text-xs mt-1">クラウドアカウントを接続してスキャンを実行してください</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ResourceTable resources={filtered} pageSize={10} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
