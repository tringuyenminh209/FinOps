'use client';

import { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Timer,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── モックデータ ──
const DAYS_OF_WEEK = ['月', '火', '水', '木', '金', '土', '日'];

interface ScheduleItem {
  id: string;
  resourceName: string;
  resourceType: string;
  startTime: string;
  endTime: string;
  days: number[];
  isActive: boolean;
  overrideUntil: string | null;
  overrideBy: string | null;
}

const MOCK_SCHEDULES: ScheduleItem[] = [
  {
    id: '1',
    resourceName: 'staging-web',
    resourceType: 'EC2',
    startTime: '09:00',
    endTime: '18:00',
    days: [1, 2, 3, 4, 5],
    isActive: true,
    overrideUntil: null,
    overrideBy: null,
  },
  {
    id: '2',
    resourceName: 'staging-db',
    resourceType: 'RDS',
    startTime: '09:00',
    endTime: '18:00',
    days: [1, 2, 3, 4, 5],
    isActive: true,
    overrideUntil: null,
    overrideBy: null,
  },
  {
    id: '3',
    resourceName: 'dev-app',
    resourceType: 'EC2',
    startTime: '10:00',
    endTime: '19:00',
    days: [1, 2, 3, 4, 5],
    isActive: true,
    overrideUntil: '2026-03-02T22:00:00',
    overrideBy: '田中太郎',
  },
  {
    id: '4',
    resourceName: 'batch-server',
    resourceType: 'EC2',
    startTime: '02:00',
    endTime: '06:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    isActive: false,
    overrideUntil: null,
    overrideBy: null,
  },
];

const TYPE_STYLES: Record<string, string> = {
  EC2: 'bg-orange-500/10 text-orange-400',
  RDS: 'bg-blue-500/10 text-blue-400',
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState(MOCK_SCHEDULES);

  const toggleActive = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
    );
  };

  const handleOverride = (id: string) => {
    const until = new Date();
    until.setHours(until.getHours() + 2);
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, overrideUntil: until.toISOString(), overrideBy: '管理者' }
          : s,
      ),
    );
  };

  const activeCount = schedules.filter((s) => s.isActive).length;
  const overrideCount = schedules.filter((s) => s.overrideUntil).length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <p className="text-sm text-slate-400">
          Night-Watch によるリソースの自動起動/停止スケジュールを管理します
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">アクティブ</p>
            <p className="text-xl font-bold text-slate-100">{activeCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Timer className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">オーバーライド中</p>
            <p className="text-xl font-bold text-slate-100">{overrideCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
            <CalendarDays className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">合計スケジュール</p>
            <p className="text-xl font-bold text-slate-100">{schedules.length}</p>
          </div>
        </div>
      </div>

      {/* スケジュール一覧 */}
      <div className="space-y-4">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className={cn(
              'rounded-xl border bg-slate-800 p-6 transition-colors',
              schedule.isActive
                ? 'border-slate-700'
                : 'border-slate-700/50 opacity-60',
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* 左側: リソース情報 */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    schedule.isActive
                      ? 'bg-emerald-500/10'
                      : 'bg-slate-700',
                  )}
                >
                  <Clock
                    className={cn(
                      'h-5 w-5',
                      schedule.isActive
                        ? 'text-emerald-400'
                        : 'text-slate-500',
                    )}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {schedule.resourceName}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                        TYPE_STYLES[schedule.resourceType] ||
                          'bg-slate-700 text-slate-300',
                      )}
                    >
                      {schedule.resourceType}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      {schedule.startTime} - {schedule.endTime} JST
                    </span>
                    <span className="flex gap-1">
                      {DAYS_OF_WEEK.map((day, i) => (
                        <span
                          key={day}
                          className={cn(
                            'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium',
                            schedule.days.includes(i + 1)
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-700 text-slate-600',
                          )}
                        >
                          {day}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              </div>

              {/* 右側: アクション */}
              <div className="flex items-center gap-3">
                {schedule.overrideUntil && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">
                      残業延長中
                      {schedule.overrideBy && ` (${schedule.overrideBy})`}
                    </span>
                  </div>
                )}

                {!schedule.overrideUntil && schedule.isActive && (
                  <button
                    onClick={() => handleOverride(schedule.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <Timer className="h-3.5 w-3.5" />
                    残業延長
                  </button>
                )}

                <button
                  onClick={() => toggleActive(schedule.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    schedule.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600',
                  )}
                >
                  {schedule.isActive ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      無効化
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      有効化
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
