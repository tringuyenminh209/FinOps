'use client';

import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface ResourceRow {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'terminated';
  monthlyCost: number;
  lastSeen: string;
}

interface ResourceTableProps {
  resources: ResourceRow[];
}

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
  EBS: 'bg-pink-500/10 text-pink-400',
};

export function ResourceTable({ resources }: ResourceTableProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-100">リソース一覧</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                リソース名
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                タイプ
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                ステータス
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                月間コスト
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                最終確認
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {resources.map((resource) => (
              <tr
                key={resource.id}
                className="hover:bg-slate-750 transition-colors"
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-200">
                  {resource.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-1 text-xs font-medium',
                      TYPE_STYLES[resource.type] || 'bg-slate-700 text-slate-300',
                    )}
                  >
                    {resource.type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      STATUS_STYLES[resource.status],
                    )}
                  >
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
