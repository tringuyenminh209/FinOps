'use client';

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: LucideIcon;
  iconColor?: string;
  large?: boolean;
  className?: string;
  format?: 'currency' | 'number' | 'none';
}

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = 'text-emerald-400',
  large = false,
  className,
  format = 'none',
}: StatsCardProps) {
  const displayValue = format === 'currency' && typeof value === 'number'
    ? formatCurrency(value)
    : String(value);

  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card className={cn('relative overflow-hidden group', className)}>
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
          <div className={cn('rounded-xl p-2 bg-slate-800/60', iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className={cn(
          'tabular-nums font-bold text-white animate-count-up',
          large ? 'text-3xl lg:text-4xl' : 'text-2xl',
        )}>
          {displayValue}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              isPositive ? 'text-emerald-400' : 'text-red-400',
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(trend)}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500">{subtitle}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
