'use client';

import { useState } from 'react';
import { Clock, Plus, Play, Pause, Moon, Sun, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

const schedules = [
  {
    id: '1', name: 'Staging 自動停止', resources: ['staging-api', 'staging-db'],
    stopTime: '20:00', startTime: '08:00', days: [0, 1, 2, 3, 4],
    enabled: true, overrideUntil: null as string | null, monthlySavings: 85000,
  },
  {
    id: '2', name: 'Dev環境 夜間停止', resources: ['dev-frontend'],
    stopTime: '19:00', startTime: '09:00', days: [0, 1, 2, 3, 4],
    enabled: true, overrideUntil: null as string | null, monthlySavings: 42000,
  },
  {
    id: '3', name: 'ML トレーニング', resources: ['ml-training-01'],
    stopTime: '22:00', startTime: '06:00', days: [0, 1, 2, 3, 4, 5, 6],
    enabled: true, overrideUntil: '23:00', monthlySavings: 180000,
  },
  {
    id: '4', name: 'バッチ処理 週末停止', resources: ['batch-worker-01'],
    stopTime: '18:00 (金)', startTime: '06:00 (月)', days: [5, 6],
    enabled: false, overrideUntil: null as string | null, monthlySavings: 56000,
  },
];

function TimelineBar({ stopTime, startTime }: { stopTime: string; startTime: string }) {
  const parseH = (t: string) => parseInt(t.split(':')[0], 10);
  const stop = parseH(stopTime);
  const start = parseH(startTime);
  const runStart = start < stop ? start : 0;
  const runEnd = start < stop ? stop : start;

  return (
    <div className="relative h-6 bg-slate-800/60 rounded-lg overflow-hidden">
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-slate-700/20"
          style={{ left: `${(i / 24) * 100}%` }}
        />
      ))}
      <div
        className="absolute top-1 bottom-1 rounded bg-emerald-500/25 border border-emerald-500/40"
        style={{
          left: `${(runStart / 24) * 100}%`,
          width: `${((runEnd - runStart) / 24) * 100}%`,
        }}
      />
      <div
        className="absolute top-1 bottom-1 rounded bg-slate-600/40 border border-slate-500/20"
        style={{
          left: `${(runEnd / 24) * 100}%`,
          width: `${((24 - runEnd + runStart) / 24) * 100}%`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-slate-500">
        <span>0時</span>
        <span>12時</span>
        <span>24時</span>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const filtered = schedules.filter((s) => {
    if (filter === 'enabled') return s.enabled;
    if (filter === 'disabled') return !s.enabled;
    return true;
  });

  const totalSavings = schedules.filter(s => s.enabled).reduce((s, x) => s + x.monthlySavings, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Moon className="h-6 w-6 text-indigo-400" />
            Night-Watch スケジュール
          </h1>
          <p className="text-sm text-slate-500 mt-1">リソースの自動停止・起動スケジュール管理</p>
        </div>
        <Button size="md">
          <Plus className="h-4 w-4" />
          スケジュール追加
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">アクティブスケジュール</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{schedules.filter(s => s.enabled).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">管理リソース数</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{schedules.reduce((s, x) => s + x.resources.length, 0)}台</p>
        </Card>
        <Card className="p-4 border-emerald-500/20">
          <p className="text-xs text-slate-500 uppercase tracking-wider">月間予想削減額</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatCurrency(totalSavings)}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'enabled', 'disabled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/40',
            )}
          >
            {f === 'all' ? 'すべて' : f === 'enabled' ? '有効' : '無効'}
          </button>
        ))}
      </div>

      {/* Schedule Cards */}
      <div className="space-y-4">
        {filtered.map((schedule) => (
          <Card key={schedule.id} className="group">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-white truncate">{schedule.name}</h3>
                  {schedule.overrideUntil && (
                    <Badge variant="warning">残業延長中 〜{schedule.overrideUntil}</Badge>
                  )}
                  {!schedule.enabled && <Badge variant="default">無効</Badge>}
                </div>

                {/* Day chips */}
                <div className="flex items-center gap-1 mb-3">
                  {dayLabels.map((label, i) => (
                    <span
                      key={i}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                        schedule.days.includes(i)
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800/40 text-slate-600',
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Timeline */}
                <TimelineBar stopTime={schedule.stopTime} startTime={schedule.startTime} />

                {/* Time Labels */}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Moon className="h-3 w-3 text-indigo-400" />
                    停止 {schedule.stopTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sun className="h-3 w-3 text-amber-400" />
                    起動 {schedule.startTime}
                  </span>
                </div>

                {/* Resources */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {schedule.resources.map((r) => (
                    <span key={r} className="text-xs bg-slate-800/60 text-slate-400 rounded-lg px-2 py-1">{r}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex lg:flex-col items-center gap-2 lg:items-end shrink-0">
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(schedule.monthlySavings)}</p>
                <p className="text-xs text-slate-500">月間削減</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="ghost" size="sm">
                    {schedule.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {schedule.enabled ? '停止' : '有効化'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="h-3.5 w-3.5" />
                    延長
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
