'use client';

import { CreditCard, Download, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

const invoices = [
  {
    id: 'INV-2026-02', period: '2026年2月', amount: 54780, tax: 4980,
    status: 'paid' as const, issuedAt: '2026-03-01', paidAt: '2026-03-01',
    jctNumber: 'T1234567890123',
  },
  {
    id: 'INV-2026-01', period: '2026年1月', amount: 54780, tax: 4980,
    status: 'paid' as const, issuedAt: '2026-02-01', paidAt: '2026-02-03',
    jctNumber: 'T1234567890123',
  },
  {
    id: 'INV-2025-12', period: '2025年12月', amount: 54780, tax: 4980,
    status: 'paid' as const, issuedAt: '2026-01-01', paidAt: '2026-01-02',
    jctNumber: 'T1234567890123',
  },
  {
    id: 'INV-2025-11', period: '2025年11月', amount: 32780, tax: 2980,
    status: 'paid' as const, issuedAt: '2025-12-01', paidAt: '2025-12-01',
    jctNumber: 'T1234567890123',
  },
];

const statusConfig = {
  paid: { label: '支払済', variant: 'success' as const, icon: CheckCircle2 },
  pending: { label: '未払い', variant: 'warning' as const, icon: Clock },
  overdue: { label: '延滞', variant: 'danger' as const, icon: AlertCircle },
};

const planInfo = {
  name: 'Pro プラン',
  price: 49800,
  tax: 4980,
  total: 54780,
  nextBilling: '2026年4月1日',
  features: [
    '最大10アカウント接続',
    'Night-Watch 全機能',
    'AI最適化レコメンド',
    'GreenOps レポート',
    '適格請求書発行',
    '優先サポート',
  ],
};

export default function BillingPage() {
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount + i.tax, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-violet-400" />
            請求管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">サブスクリプションと請求書の管理</p>
        </div>
      </div>

      {/* Plan + Payment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Current Plan */}
        <Card className="lg:col-span-2 border-emerald-500/10">
          <CardHeader>
            <CardTitle>現在のプラン</CardTitle>
            <Badge variant="success">アクティブ</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{planInfo.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-emerald-400 tabular-nums">{formatCurrency(planInfo.price)}</span>
                  <span className="text-sm text-slate-500">/月（税抜）</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">消費税（10%）: {formatCurrency(planInfo.tax)} — 合計: {formatCurrency(planInfo.total)}/月</p>
                <p className="text-xs text-slate-500 mt-2">次回請求日: {planInfo.nextBilling}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {planInfo.features.map((f) => (
                  <span key={f} className="text-xs bg-emerald-500/10 text-emerald-400 rounded-lg px-2.5 py-1 border border-emerald-500/15">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>支払い概要</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">累計支払額</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">支払い方法</p>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">**** **** **** 4242</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">適格請求書番号</p>
                <p className="text-sm text-slate-300 mt-1 tabular-nums">T1234567890123</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3.5 w-3.5" />
                Stripeポータルを開く
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            請求書一覧
          </CardTitle>
          <Badge variant="info">{invoices.length}件</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>請求書ID</TableHead>
                <TableHead>対象期間</TableHead>
                <TableHead>金額（税込）</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>発行日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const sc = statusConfig[inv.status];
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-white tabular-nums">{inv.id}</TableCell>
                    <TableCell>{inv.period}</TableCell>
                    <TableCell className="tabular-nums text-emerald-400 font-medium">
                      {formatCurrency(inv.amount + inv.tax)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{inv.issuedAt}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* JCT Compliance Notice */}
      <Card className="border-slate-600/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2 text-amber-400 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-300">適格請求書等保存方式（インボイス制度）対応</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                当サービスの請求書は適格請求書等保存方式（インボイス制度）に対応しています。
                登録番号: T1234567890123。PDF請求書には消費税額が明記されております。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
