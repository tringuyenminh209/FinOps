'use client';

import { Cloud, Zap, ShieldAlert, CreditCard, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityType = 'scan' | 'schedule' | 'alert' | 'billing';

interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  time: string;
}

const typeConfig: Record<ActivityType, { icon: LucideIcon; color: string; bg: string }> = {
  scan: { icon: Cloud, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  schedule: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  alert: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  billing: { icon: CreditCard, color: 'text-violet-400', bg: 'bg-violet-500/15' },
};

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {activities.map((activity, idx) => {
        const config = typeConfig[activity.type];
        const Icon = config.icon;
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 animate-slide-up"
            style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
          >
            <div className={cn('rounded-lg p-2 shrink-0', config.bg, config.color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 leading-relaxed truncate">{activity.message}</p>
              <p className="text-xs text-slate-600 mt-0.5">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
