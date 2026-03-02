'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  name: string;
  type: string;
  status: string;
  region: string;
  monthlyCost: number;
}

interface ResourceTableProps {
  resources: Resource[];
  pageSize?: number;
}

type SortDir = 'asc' | 'desc' | null;
type SortKey = keyof Resource;

const statusVariant = (s: string) => {
  switch (s) {
    case 'running': return 'success' as const;
    case 'stopped': return 'default' as const;
    case 'error': return 'danger' as const;
    default: return 'warning' as const;
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'running': return '稼働中';
    case 'stopped': return '停止';
    case 'error': return 'エラー';
    default: return s;
  }
};

export function ResourceTable({ resources, pageSize = 10 }: ResourceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const sorted = [...resources].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 text-slate-600" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              { key: 'name' as SortKey, label: 'リソース名' },
              { key: 'type' as SortKey, label: 'タイプ' },
              { key: 'status' as SortKey, label: 'ステータス' },
              { key: 'region' as SortKey, label: 'リージョン' },
              { key: 'monthlyCost' as SortKey, label: '月間コスト' },
            ].map(({ key, label }) => (
              <TableHead key={key}>
                <button
                  onClick={() => toggleSort(key)}
                  className="flex items-center gap-1 hover:text-slate-300 transition-colors"
                >
                  {label}
                  <SortIcon col={key} />
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-white">{r.name}</TableCell>
              <TableCell>
                <span className="text-xs bg-slate-800/60 rounded-lg px-2 py-1">{r.type}</span>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(r.status)} dot={r.status === 'running'}>
                  {statusLabel(r.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{r.region}</TableCell>
              <TableCell className="tabular-nums text-emerald-400 font-medium">
                ¥{r.monthlyCost.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-xs text-slate-500">
            {sorted.length}件中 {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)}件表示
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                  i === page
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-500 hover:bg-slate-700/40 hover:text-slate-300',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
