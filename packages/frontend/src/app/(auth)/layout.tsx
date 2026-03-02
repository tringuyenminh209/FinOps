'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-mesh flex">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-[300px] h-[300px] rounded-full bg-teal-500/5 blur-[100px]" />
        </div>

        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FinOps</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            クラウドコストを
            <br />
            <span className="text-gradient">スマートに最適化</span>
          </h1>
          <p className="text-slate-400 leading-relaxed max-w-md">
            Night-Watchによるリソース自動停止、AI最適化提案、GreenOps CO₂可視化。
            日本のJCT・APPI準拠で安心して導入いただけます。
          </p>

          {/* Trust badges */}
          <div className="flex items-center gap-4 pt-4">
            {['APPI準拠', 'AES-256暗号化', 'JCT対応'].map((badge) => (
              <span
                key={badge}
                className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-3 py-1"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-slate-600">
            © 2026 FinOps Platform. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
