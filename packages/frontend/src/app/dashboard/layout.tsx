'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cloud,
  Server,
  Clock,
  Wallet,
  FileText,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/dashboard/accounts', label: 'クラウドアカウント', icon: Cloud },
  { href: '/dashboard/resources', label: 'リソース', icon: Server },
  { href: '/dashboard/schedules', label: 'スケジュール', icon: Clock },
  { href: '/dashboard/costs', label: 'コスト', icon: Wallet },
  { href: '/dashboard/billing', label: '請求', icon: FileText },
] as const;

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'ダッシュボード',
  '/dashboard/accounts': 'クラウドアカウント',
  '/dashboard/resources': 'リソース管理',
  '/dashboard/schedules': 'Night-Watch スケジュール',
  '/dashboard/costs': 'コスト分析',
  '/dashboard/billing': '請求管理',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] || 'ダッシュボード';

  return (
    <div className="flex h-screen bg-slate-900">
      {/* サイドバー */}
      <aside className="flex w-64 flex-col bg-slate-950 border-r border-slate-800">
        {/* ロゴ */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            FinOps
          </span>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
                {isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 text-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ユーザーエリア */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-slate-300">
              管
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">
                管理者
              </p>
              <p className="truncate text-xs text-slate-500">admin@example.com</p>
            </div>
            <button className="text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* メインエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              {pageTitle}
            </h1>
            <p className="text-xs text-slate-500">株式会社サンプル</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-slate-400 hover:text-slate-200 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                3
              </span>
            </button>
            <button className="text-slate-400 hover:text-slate-200 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* コンテンツ */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
