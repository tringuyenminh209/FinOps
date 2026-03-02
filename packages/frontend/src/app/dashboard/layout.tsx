'use client';

import { useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useSidebar } from '@/hooks/use-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle, mobileOpen, openMobile, closeMobile } = useSidebar();
  const { user, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const initial = user?.displayName?.charAt(0) ?? '管';

  return (
    <div className="min-h-screen gradient-mesh">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggle}
        onCloseMobile={closeMobile}
      />

      <div
        className={cn(
          'transition-all duration-300',
          collapsed ? 'lg:pl-[var(--sidebar-w-collapsed)]' : 'lg:pl-[var(--sidebar-w)]',
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-4 border-b border-slate-700/30 bg-slate-900/60 backdrop-blur-xl px-4 lg:px-8">
          <button
            onClick={openMobile}
            aria-label="メニューを開く"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <JstClock />

          <button aria-label="通知" className="relative rounded-xl p-2.5 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </button>

          <div className="flex items-center gap-3 ml-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
              {initial}
            </div>
            {user?.displayName && (
              <span className="hidden md:inline text-sm text-slate-300 font-medium">
                {user.displayName}
              </span>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

function JstClock() {
  const now = new Date();
  const jst = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
    hour12: false,
  }).format(now);
  const dateStr = new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(now);

  return (
    <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
      <span>{dateStr}</span>
      <span className="tabular-nums text-slate-400 font-medium">{jst}</span>
      <span className="text-slate-600">JST</span>
    </div>
  );
}
