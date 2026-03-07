'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { apiPost } from '@/lib/api';

interface CallbackResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    user: { id: string; orgId: string; role: string; displayName: string | null };
  };
}

function LineCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('LINE認証がキャンセルされました');
        setTimeout(() => router.push('/login' as any), 2000);
        return;
      }

      if (!code) {
        setError('認可コードが見つかりません');
        setTimeout(() => router.push('/login' as any), 2000);
        return;
      }

      const savedState = sessionStorage.getItem('line_state');
      if (state && savedState && state !== savedState) {
        setError('セキュリティ検証に失敗しました。もう一度お試しください');
        sessionStorage.removeItem('line_state');
        setTimeout(() => router.push('/login' as any), 2000);
        return;
      }
      sessionStorage.removeItem('line_state');

      try {
        const redirectUri = `${window.location.origin}/auth/line/callback`;
        const res = await apiPost<CallbackResponse>('/api/v1/auth/line-callback', {
          code,
          redirectUri,
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('refreshToken', res.data.refreshToken);

        router.push('/dashboard');
      } catch {
        setError('LINE認証に失敗しました。もう一度お試しください');
        setTimeout(() => router.push('/login' as any), 3000);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/20">
          <Zap className="h-7 w-7 text-white" />
        </div>

        {error ? (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <p className="text-xs text-slate-500">ログインページにリダイレクトします...</p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <Loader2 className="h-6 w-6 text-emerald-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">LINE認証を処理しています...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
      </div>
    }>
      <LineCallbackContent />
    </Suspense>
  );
}
