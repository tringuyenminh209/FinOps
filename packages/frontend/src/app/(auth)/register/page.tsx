'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, User, Building2, Eye, EyeOff, ArrowRight,
  Check, Zap, Shield, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiPost, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type Step = 'account' | 'organization' | 'plan';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    period: '/月',
    description: '個人・検証用',
    features: ['AWSアカウント1つ', 'リソース10台まで', 'Night-Watch 基本機能'],
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥49,800',
    period: '/月（税抜）',
    description: '中小企業向け',
    features: ['最大10アカウント', 'Night-Watch 全機能', 'AI最適化レコメンド', 'GreenOps', '適格請求書発行'],
    recommended: true,
  },
];

const isDev = process.env.NODE_ENV === 'development';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [step, setStep] = useState<Step>('account');
  const [error, setError] = useState('');

  // Account
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Organization
  const [orgName, setOrgName] = useState('');

  // Plan
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateAccount = (): boolean => {
    if (!displayName.trim()) { setError('お名前を入力してください'); return false; }
    if (!email.trim()) { setError('メールアドレスを入力してください'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('有効なメールアドレスを入力してください'); return false; }
    if (password.length < 8) { setError('パスワードは8文字以上で設定してください'); return false; }
    if (password !== confirmPassword) { setError('パスワードが一致しません'); return false; }
    if (!agreed) { setError('利用規約とプライバシーポリシーに同意してください'); return false; }
    return true;
  };

  const validateOrg = (): boolean => {
    if (!orgName.trim()) { setError('組織名を入力してください'); return false; }
    return true;
  };

  const handleNext = async () => {
    setError('');
    setEmailError('');
    if (step === 'account') {
      if (!validateAccount()) return;
      setCheckingEmail(true);
      try {
        const res = await apiPost<{ success: boolean; data: { exists: boolean } }>(
          '/auth/check-email',
          { email },
        );
        if (res.data.exists) {
          setEmailError('このメールアドレスはすでに登録されています');
          return;
        }
      } catch {
        setEmailError('メールアドレスの確認中にエラーが発生しました');
        return;
      } finally {
        setCheckingEmail(false);
      }
      setStep('organization');
    } else if (step === 'organization' && validateOrg()) {
      setStep('plan');
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 'organization') setStep('account');
    else if (step === 'plan') setStep('organization');
  };

  const handleSubmit = async () => {
    setError('');
    try {
      await register({ email, password, displayName, orgName });
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEmailError('このメールアドレスはすでに登録されています');
        setStep('account');
      } else {
        setError('登録処理中にエラーが発生しました。もう一度お試しください。');
      }
    }
  };

  // デモ登録（開発用）
  const handleDemoRegister = () => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('refreshToken', 'demo-refresh');
    router.push('/dashboard');
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'account', label: 'アカウント' },
    { key: 'organization', label: '組織情報' },
    { key: 'plan', label: 'プラン選択' },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="animate-fade-in">
      {/* Mobile Logo */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">FinOps</span>
      </div>

      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">新規登録</h2>
        <p className="text-sm text-slate-500">無料で始めて、クラウドコストを最適化しましょう</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all shrink-0',
              idx < currentStepIdx
                ? 'bg-emerald-500 text-white'
                : idx === currentStepIdx
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800/60 text-slate-600',
            )}>
              {idx < currentStepIdx ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <span className={cn(
              'text-xs hidden sm:inline',
              idx === currentStepIdx ? 'text-slate-300' : 'text-slate-600',
            )}>
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-px',
                idx < currentStepIdx ? 'bg-emerald-500/50' : 'bg-slate-700/30',
              )} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-scale-in">
          {error}
        </div>
      )}

      {/* Step 1: Account */}
      {step === 'account' && (
        <div className="space-y-5 animate-slide-up">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">お名前</label>
            <Input
              type="text"
              placeholder="山田 太郎"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              icon={<User className="h-4 w-4" />}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">メールアドレス</label>
            <Input
              type="email"
              placeholder="taro@company.co.jp"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              icon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              className={emailError ? 'border-red-500 focus:border-red-500' : ''}
            />
            {emailError && (
              <p className="text-xs text-red-400 mt-1">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">パスワード</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="8文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password strength indicator */}
            {password && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  password.length >= 8,
                  /[A-Z]/.test(password),
                  /[0-9]/.test(password),
                  /[^A-Za-z0-9]/.test(password),
                ].map((met, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      met ? 'bg-emerald-500' : 'bg-slate-700',
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">パスワード（確認）</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="パスワードを再入力"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
            />
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border transition-all',
                agreed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-600 group-hover:border-slate-500',
              )}>
                {agreed && <Check className="h-3 w-3 text-white" />}
              </div>
            </div>
            <span className="text-xs text-slate-500 leading-relaxed">
              <Link href={'/terms' as any} className="text-emerald-500 hover:text-emerald-400">利用規約</Link>
              {' '}および{' '}
              <Link href={'/privacy' as any} className="text-emerald-500 hover:text-emerald-400">プライバシーポリシー</Link>
              に同意します
            </span>
          </label>

          <Button size="lg" className="w-full" onClick={handleNext} disabled={checkingEmail}>
            {checkingEmail ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                確認中...
              </span>
            ) : (
              <>
                次へ
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 2: Organization */}
      {step === 'organization' && (
        <div className="space-y-5 animate-slide-up">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">組織名（会社名）</label>
            <Input
              type="text"
              placeholder="株式会社サンプル"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              icon={<Building2 className="h-4 w-4" />}
            />
            <p className="text-xs text-slate-600">後から変更可能です</p>
          </div>

          <div className="glass-subtle rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-300">データ分離について</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  各組織のデータはRow Level Security（RLS）により完全に分離されます。
                  他組織のデータにアクセスすることはできません。
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" />
              戻る
            </Button>
            <Button size="lg" className="flex-1" onClick={handleNext}>
              次へ
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Plan Selection */}
      {step === 'plan' && (
        <div className="space-y-5 animate-slide-up">
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'w-full text-left rounded-2xl p-5 transition-all border',
                  selectedPlan === plan.id
                    ? 'glass border-emerald-500/30 shadow-glow'
                    : 'glass-subtle border-transparent hover:border-slate-600/30',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{plan.name}</span>
                      {plan.recommended && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-500">{plan.period}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plan.features.map((f) => (
                    <span key={f} className="text-[11px] text-slate-400 bg-slate-800/50 rounded-lg px-2 py-0.5">
                      {f}
                    </span>
                  ))}
                </div>
                {/* Radio indicator */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/20">
                  <div className={cn(
                    'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
                    selectedPlan === plan.id
                      ? 'border-emerald-500'
                      : 'border-slate-600',
                  )}>
                    {selectedPlan === plan.id && (
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {selectedPlan === plan.id ? 'このプランを選択中' : 'このプランを選択'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedPlan === 'pro' && (
            <p className="text-xs text-slate-500 text-center">
              14日間の無料トライアル付き。いつでもキャンセル可能です。
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" />
              戻る
            </Button>
            <Button size="lg" className="flex-1" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  登録中...
                </span>
              ) : (
                <>
                  登録する
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Demo — dev only */}
          {isDev && (
            <Button
              variant="ghost"
              size="md"
              className="w-full text-slate-600 hover:text-slate-400"
              onClick={handleDemoRegister}
            >
              デモ環境にアクセス（開発用）
            </Button>
          )}
        </div>
      )}

      {/* Login Link */}
      <div className="mt-8 pt-6 border-t border-slate-700/30 text-center">
        <p className="text-sm text-slate-500">
          すでにアカウントをお持ちですか？{' '}
          <Link
            href="/login"
            className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
          >
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
