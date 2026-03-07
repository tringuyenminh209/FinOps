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

const DEMO_RESOURCES: ResourceItem[] = [
  { id: '1', name: 'web-api-prod-01', type: 'EC2 (t3.large)', status: 'running', region: 'ap-northeast-1', monthlyCost: 12500 },
  { id: '2', name: 'web-api-prod-02', type: 'EC2 (t3.large)', status: 'running', region: 'ap-northeast-1', monthlyCost: 12500 },
  { id: '3', name: 'batch-worker-01', type: 'EC2 (c5.xlarge)', status: 'running', region: 'ap-northeast-1', monthlyCost: 28000 },
  { id: '4', name: 'staging-api', type: 'EC2 (t3.medium)', status: 'stopped', region: 'ap-northeast-1', monthlyCost: 5500 },
  { id: '5', name: 'dev-frontend', type: 'EC2 (t3.small)', status: 'stopped', region: 'ap-northeast-1', monthlyCost: 2800 },
  { id: '6', name: 'main-db-prod', type: 'RDS (db.r5.large)', status: 'running', region: 'ap-northeast-1', monthlyCost: 58000 },
  { id: '7', name: 'analytics-db', type: 'RDS (db.r5.xlarge)', status: 'running', region: 'ap-northeast-1', monthlyCost: 95000 },
  { id: '8', name: 'cache-prod', type: 'ElastiCache (r6g.large)', status: 'running', region: 'ap-northeast-1', monthlyCost: 32000 },
  { id: '9', name: 'staging-db', type: 'RDS (db.t3.medium)', status: 'stopped', region: 'ap-northeast-1', monthlyCost: 8500 },
  { id: '10', name: 'ml-training-01', type: 'EC2 (p3.2xlarge)', status: 'stopped', region: 'us-east-1', monthlyCost: 0 },
  { id: '11', name: 'bastion-host', type: 'EC2 (t3.nano)', status: 'running', region: 'ap-northeast-1', monthlyCost: 800 },
  { id: '12', name: 'log-aggregator', type: 'EC2 (t3.medium)', status: 'running', region: 'ap-northeast-1', monthlyCost: 7200 },
];

export default function ResourcesPage() {
  const [allResources, setAllResources] = useState<ResourceItem[]>(DEMO_RESOURCES);
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
        }
      })
      .catch(() => {/* fallback to demo */});
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
      <Card>
        <CardContent className="p-0">
          <ResourceTable resources={filtered} pageSize={10} />
        </CardContent>
      </Card>
    </div>
  );
}
