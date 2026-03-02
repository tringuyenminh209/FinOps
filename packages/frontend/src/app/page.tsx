'use client';

import Link from 'next/link';
import {
  Zap, Moon, Leaf, Brain, Shield, FileText, Lock,
  ArrowRight, ChevronRight, CheckCircle2, Building2, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Moon,
    title: 'Night-Watch',
    subtitle: 'リソース自動停止・起動',
    description: '営業時間外のクラウドリソースを自動停止。残業延長もワンクリックで対応。最大40%のコスト削減を実現。',
    color: 'from-indigo-500 to-violet-600',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
  },
  {
    icon: Leaf,
    title: 'GreenOps',
    subtitle: 'CO₂排出量の可視化',
    description: '日本の電力排出係数に基づいたCO₂排出量レポート。環境省基準のGHGプロトコル対応。ESG報告に活用可能。',
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
  },
  {
    icon: Brain,
    title: 'AI Advisor',
    subtitle: 'GPT-4o mini 最適化提案',
    description: 'AIがコストデータを分析し、最適化の具体的アクションを日本語で提案。未使用リソースの検出からライトサイジングまで。',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
  },
];

const stats = [
  { value: '¥420,000', label: '月間平均コスト削減額', sublabel: 'Night-Watch利用企業平均' },
  { value: '40%', label: '平均コスト削減率', sublabel: '非稼働時間リソース停止' },
  { value: '2.4t', label: 'CO₂月間削減量', sublabel: 'GreenOps算定基準' },
  { value: '<5分', label: '初期セットアップ時間', sublabel: 'IAM Cross-account設定' },
];

const securityBadges = [
  { icon: Shield, label: 'APPI準拠', description: '個人情報保護法対応' },
  { icon: Lock, label: 'AES-256暗号化', description: 'AWS認証情報の安全な管理' },
  { icon: FileText, label: 'JCT対応', description: '適格請求書等保存方式' },
  { icon: Building2, label: 'マルチテナント', description: 'RLSによるデータ分離' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-mesh">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-700/30 bg-slate-900/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">FinOps</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">機能</a>
            <a href="#results" className="hover:text-white transition-colors">導入実績</a>
            <a href="#security" className="hover:text-white transition-colors">セキュリティ</a>
            <a href="#pricing" className="hover:text-white transition-colors">料金</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
            >
              無料で始める
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-teal-500/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-8 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
              日本市場特化のクラウドコスト最適化
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight animate-slide-up">
              クラウドコストを
              <br />
              <span className="text-gradient">自動で最適化</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              Night-Watchによるリソース自動停止、AI最適化提案、GreenOps CO₂可視化。
              日本のJCT・APPI準拠で安心して導入いただけます。
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:scale-[1.02] transition-all"
              >
                無料トライアルを開始
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600/50 px-8 py-3.5 text-base text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
              >
                機能を見る
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">主要機能</h2>
            <p className="mt-3 text-slate-400">3つのコアモジュールでクラウドコストを最適化</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group glass rounded-2xl p-8 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-glow animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className={cn('inline-flex rounded-xl p-3 mb-5', feature.bgColor)}>
                    <Icon className={cn('h-6 w-6', feature.textColor)} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">{feature.subtitle}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Results / Stats */}
      <section id="results" className="py-20 lg:py-28 border-t border-slate-700/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">導入実績</h2>
            <p className="mt-3 text-slate-400">FinOps導入による効果の実績値</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div
                key={stat.label}
                className="glass rounded-2xl p-6 text-center animate-slide-up"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
              >
                <p className="text-3xl lg:text-4xl font-bold text-gradient tabular-nums">{stat.value}</p>
                <p className="text-sm font-medium text-white mt-3">{stat.label}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 lg:py-28 border-t border-slate-700/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">セキュリティ & コンプライアンス</h2>
            <p className="mt-3 text-slate-400">日本の法規制に準拠した安全な運用</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityBadges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.label}
                  className="glass rounded-2xl p-6 text-center animate-slide-up"
                  style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
                >
                  <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 mb-4">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{badge.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20 lg:py-28 border-t border-slate-700/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">料金プラン</h2>
            <p className="mt-3 text-slate-400">シンプルな月額制。初期費用なし。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="glass rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white">Free</h3>
              <p className="text-sm text-slate-500 mt-1">個人・検証用</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-white">¥0</span>
                <span className="text-sm text-slate-500">/月</span>
              </div>
              <ul className="mt-6 space-y-3">
                {['AWSアカウント1つ', 'Night-Watch 基本機能', 'コストダッシュボード', 'リソース10台まで'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-slate-600/50 px-6 py-3 text-sm font-medium text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all w-full"
              >
                無料で始める
              </Link>
            </div>

            {/* Pro */}
            <div className="glass rounded-2xl p-8 border-emerald-500/20 shadow-glow relative">
              <div className="absolute -top-3 right-6">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1 text-xs font-medium text-white shadow-lg">
                  おすすめ
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Pro</h3>
              <p className="text-sm text-slate-500 mt-1">中小企業向け</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-emerald-400">¥49,800</span>
                <span className="text-sm text-slate-500">/月（税抜）</span>
              </div>
              <ul className="mt-6 space-y-3">
                {['最大10アカウント', 'Night-Watch 全機能', 'AI最適化レコメンド', 'GreenOps レポート', '適格請求書発行', '優先サポート'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all w-full"
              >
                14日間無料トライアル
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Enterprise */}
            <div className="glass rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white">Enterprise</h3>
              <p className="text-sm text-slate-500 mt-1">大企業向け</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-white">お問合せ</span>
              </div>
              <ul className="mt-6 space-y-3">
                {['無制限アカウント', 'カスタムポリシー', '専任カスタマーサクセス', 'SLA保証', 'SSO/SAML対応', 'オンプレミス対応'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@finops.jp"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-slate-600/50 px-6 py-3 text-sm font-medium text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all w-full"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 border-t border-slate-700/20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 mb-6">
            <TrendingDown className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            今すぐクラウドコストの<br className="sm:hidden" />最適化を始めましょう
          </h2>
          <p className="mt-4 text-slate-400">
            5分のセットアップで、すぐにコスト削減を開始できます。
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-4 text-lg font-medium text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:scale-[1.02] transition-all mt-8"
          >
            無料で始める
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/20 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">FinOps</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                日本市場特化のクラウドコスト最適化プラットフォーム
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">プロダクト</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><a href="#features" className="hover:text-slate-300 transition-colors">Night-Watch</a></li>
                <li><a href="#features" className="hover:text-slate-300 transition-colors">GreenOps</a></li>
                <li><a href="#features" className="hover:text-slate-300 transition-colors">AI Advisor</a></li>
                <li><a href="#pricing" className="hover:text-slate-300 transition-colors">料金プラン</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">リソース</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><a href="#" className="hover:text-slate-300 transition-colors">ドキュメント</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">APIリファレンス</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">ステータスページ</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">変更履歴</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">法的情報</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><a href="#" className="hover:text-slate-300 transition-colors">利用規約</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">プライバシーポリシー</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">特定商取引法に基づく表記</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">セキュリティポリシー</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© 2026 FinOps. All rights reserved.</p>
            <p className="text-xs text-slate-600">Made with 💚 for the Japanese market</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
