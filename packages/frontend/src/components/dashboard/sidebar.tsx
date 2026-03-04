'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Cloud, Server, Clock, TrendingDown, CreditCard,
  Bell, FileText, Settings, Leaf,
  ChevronLeft, ChevronRight, X, Shield, Zap, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { href: '/dashboard/accounts', icon: Cloud, label: 'クラウドアカウント' },
  { href: '/dashboard/resources', icon: Server, label: 'リソース管理' },
  { href: '/dashboard/schedules', icon: Clock, label: 'Night-Watch' },
  { href: '/dashboard/costs', icon: TrendingDown, label: 'コスト分析' },
  { href: '/dashboard/greenops', icon: Leaf, label: 'GreenOps' },
  { href: '/dashboard/reports', icon: FileText, label: 'レポート' },
  { href: '/dashboard/notifications', icon: Bell, label: 'LINE通知' },
  { href: '/dashboard/billing', icon: CreditCard, label: '請求管理' },
  { href: '/dashboard/settings', icon: Settings, label: '設定' },
];

export function Sidebar({ collapsed, mobileOpen, onToggle, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-slate-700/30">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-white animate-fade-in">
            FinOps
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href as any}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-inner-glow'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
                collapsed && 'justify-center px-2',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-emerald-400')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Plan Badge */}
      {!collapsed && (
        <div className="border-t border-slate-700/30 px-4 py-4">
          <div className="glass-subtle rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">Pro プラン</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              全機能アクセス可能
            </p>
          </div>
        </div>
      )}

      {/* Logout + Collapse Toggle */}
      <div className="border-t border-slate-700/30 p-3 space-y-1">
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>ログアウト</span>}
        </button>
        <div className="hidden lg:block">
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-700/40 hover:text-slate-300 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-slate-700/30',
          'bg-slate-900/80 backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-[var(--sidebar-w-collapsed)]' : 'w-[var(--sidebar-w)]',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-slate-900 border-r border-slate-700/30 animate-slide-in-left">
            <button
              onClick={onCloseMobile}
              aria-label="メニューを閉じる"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-700/40 hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
