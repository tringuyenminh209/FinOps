'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginWithLine, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'select' | 'email'>('select');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      await loginWithEmail(email, password);
      router.push('/dashboard');
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません');
    }
  };

  const handleLineLogin = async () => {
    setError('');
    const lineClientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;

    if (!lineClientId) {
      // デモモード: LINE Login未設定の場合はダッシュボードに遷移
      router.push('/dashboard');
      return;
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/line/callback`);
    const state = crypto.randomUUID();
    sessionStorage.setItem('line_state', state);

    window.location.href =
      `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${lineClientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid%20email`;
  };

  // デモログイン（開発用）
  const handleDemoLogin = () => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('refreshToken', 'demo-refresh');
    router.push('/dashboard');
  };

  return (
    <div className="animate-fade-in">
      {/* Mobile Logo */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">FinOps</span>
      </div>

      <div className="space-y-2 mb-8">
        <h2 className="text-2xl font-bold text-white">ログイン</h2>
        <p className="text-sm text-slate-500">アカウントにログインして、コスト管理を始めましょう</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-scale-in">
          {error}
        </div>
      )}

      {mode === 'select' ? (
        <div className="space-y-4">
          {/* LINE Login */}
          <button
            onClick={handleLineLogin}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-6 py-3.5 text-sm font-medium text-white transition-all hover:bg-[#05b64e] hover:shadow-lg hover:shadow-[#06C755]/20 disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--background)] px-4 text-xs text-slate-600">または</span>
            </div>
          </div>

          {/* Email Login */}
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setMode('email')}
          >
            <Mail className="h-4 w-4" />
            メールアドレスでログイン
          </Button>

          {/* Demo Login */}
          <Button
            variant="ghost"
            size="md"
            className="w-full text-slate-600 hover:text-slate-400"
            onClick={handleDemoLogin}
          >
            デモ環境にアクセス（開発用）
          </Button>
        </div>
      ) : (
        <form onSubmit={handleEmailLogin} className="space-y-5 animate-slide-up">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">メールアドレス</label>
            <Input
              type="email"
              placeholder="your@company.co.jp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-400">パスワード</label>
              <Link href={'/forgot-password' as any} className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                パスワードをお忘れですか？
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ログイン中...
              </span>
            ) : (
              <>
                ログイン
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setMode('select'); setError(''); }}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            ← 他のログイン方法に戻る
          </button>
        </form>
      )}

      {/* Register Link */}
      <div className="mt-8 pt-6 border-t border-slate-700/30 text-center">
        <p className="text-sm text-slate-500">
          アカウントをお持ちでないですか？{' '}
          <Link
            href="/register"
            className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
          >
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
