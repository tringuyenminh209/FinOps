'use client';

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatPercent } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({
  label,
  value,
  trend,
  icon: Icon,
  iconColor = 'bg-emerald-500/10 text-emerald-400',
}: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            iconColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-100">{value}</p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          <TrendIcon
            className={cn(
              'h-4 w-4',
              isPositive ? 'text-emerald-400' : 'text-red-400',
            )}
          />
          <span
            className={cn(
              'text-sm font-medium',
              isPositive ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {formatPercent(trend)}
          </span>
          <span className="text-sm text-slate-500">前月比</span>
        </div>
      )}
    </div>
  );
}
