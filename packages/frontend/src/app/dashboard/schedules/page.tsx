'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, Play, Pause, Moon, Sun, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

interface ApiSchedule {
  schedule: {
    id: string;
    resourceId: string;
    startTimeJst: string;
    endTimeJst: string;
    daysOfWeek: number[];
    isActive: boolean;
    overrideUntil: string | null;
    createdAt: string;
  };
  resourceName: string | null;
  resourceType: string | null;
  resourceExternalId: string | null;
  resourceStatus: string | null;
}

interface DisplaySchedule {
  id: string;
  name: string;
  resources: string[];
  stopTime: string;
  startTime: string;
  days: number[];
  enabled: boolean;
  overrideUntil: string | null;
  monthlySavings: number;
}

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

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // 月〜日

function AddScheduleModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [resourcesList, setResourcesList] = useState<{ id: string; name: string }[]>([]);
  const [resourceId, setResourceId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]); // 月〜金
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiGet<{ success: boolean; data: { resources: any[]; total: number } }>('/resources')
      .then((res) => {
        if (res.success && res.data?.resources) {
          setResourcesList(res.data.resources.map((r: any) => ({ id: r.id, name: r.name || r.externalId })));
        }
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const handleSubmit = async () => {
    setError('');
    if (!resourceId) { setError('リソースを選択してください'); return; }
    if (days.length === 0) { setError('少なくとも1日選択してください'); return; }

    setLoading(true);
    try {
      await apiPost('/schedules', { resourceId, startTimeJst: startTime, endTimeJst: endTime, daysOfWeek: days });
      onAdded();
      onClose();
    } catch {
      setError('スケジュールの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">スケジュール追加</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">リソース <span className="text-red-400">*</span></label>
            <Select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
              <option value="">選択してください</option>
              {resourcesList.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-amber-400" /> 起動時間 (JST)
              </label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-1">
                <Moon className="h-3.5 w-3.5 text-indigo-400" /> 停止時間 (JST)
              </label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">実行曜日</label>
            <div className="flex items-center gap-1.5">
              {dayLabels.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                    days.includes(i)
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800/40 text-slate-600 border border-slate-700/30 hover:border-slate-600',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button size="md" className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />追加中...</span>
            ) : (
              <><Plus className="h-4 w-4" />追加する</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<DisplaySchedule[]>([]);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchSchedules = () => {
    apiGet<{ success: boolean; data: ApiSchedule[] }>('/schedules')
      .then((res) => {
        if (res.success && res.data) {
          const mapped: DisplaySchedule[] = res.data.map((item) => ({
            id: item.schedule.id,
            name: item.resourceName ?? item.resourceExternalId ?? item.schedule.resourceId,
            resources: [item.resourceName ?? item.resourceExternalId ?? item.schedule.resourceId],
            stopTime: item.schedule.endTimeJst,
            startTime: item.schedule.startTimeJst,
            days: item.schedule.daysOfWeek,
            enabled: item.schedule.isActive,
            overrideUntil: item.schedule.overrideUntil,
            monthlySavings: 0,
          }));
          setSchedules(mapped);
        } else {
          setSchedules([]);
        }
      })
      .catch(() => setSchedules([]));
  };

  useEffect(() => { fetchSchedules(); }, []);

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
        <Button size="md" onClick={() => setShowAddModal(true)}>
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
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{schedules.length}台</p>
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
      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Moon className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">スケジュールがありません</p>
          <p className="text-slate-500 text-sm mt-1">リソースの自動停止・起動スケジュールを追加してください</p>
          <Button size="md" className="mt-4" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            スケジュール追加
          </Button>
        </div>
      ) : (
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
      )}

      <AddScheduleModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={fetchSchedules}
      />
    </div>
  );
}
