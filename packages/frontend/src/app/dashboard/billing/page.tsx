'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Download, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface Invoice {
  id: string;
  orgId: string;
  periodStart: string;
  periodEnd: string;
  amountJpy: number;
  taxJpy: number;
  status: 'paid' | 'pending' | 'overdue';
  issuedAt: string;
  paidAt: string | null;
  stripeInvoiceId: string | null;
}

interface OrgData {
  id: string;
  name: string;
  planType: string;
  jctId: string | null;
  stripeCustomerId: string | null;
  paymentMethod: string | null;
}

interface DisplayInvoice {
  id: string;
  period: string;
  amount: number;
  tax: number;
  status: 'paid' | 'pending' | 'overdue';
  issuedAt: string;
}

const statusConfig = {
  paid: { label: '支払済', variant: 'success' as const, icon: CheckCircle2 },
  pending: { label: '未払い', variant: 'warning' as const, icon: Clock },
  overdue: { label: '延滞', variant: 'danger' as const, icon: AlertCircle },
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free プラン',
  pro: 'Pro プラン',
  enterprise: 'Enterprise プラン',
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<DisplayInvoice[]>([]);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiGet<{ success: boolean; data: Invoice[] }>('/billing/invoices'),
      apiGet<{ success: boolean; data: OrgData }>('/org'),
    ]).then(([invoicesRes, orgRes]) => {
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success && invoicesRes.value.data) {
        const mapped: DisplayInvoice[] = invoicesRes.value.data.map((inv) => ({
          id: inv.stripeInvoiceId ?? inv.id,
          period: `${inv.periodStart}〜${inv.periodEnd}`,
          amount: inv.amountJpy,
          tax: inv.taxJpy,
          status: inv.status,
          issuedAt: inv.issuedAt,
        }));
        setInvoices(mapped);
      }
      if (orgRes.status === 'fulfilled' && orgRes.value.success && orgRes.value.data) {
        setOrg(orgRes.value.data);
      }
      setLoading(false);
    });
  }, []);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount + i.tax, 0);
  const planName = loading ? '読み込み中...' : org ? (PLAN_LABELS[org.planType] ?? org.planType) : 'プランなし';

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
                <h3 className="text-2xl font-bold text-white">{planName}</h3>
                {org && (
                  <p className="text-xs text-slate-500 mt-2">組織: {org.name}</p>
                )}
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
              {org?.paymentMethod && (
                <div>
                  <p className="text-xs text-slate-500">支払い方法</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-300">{org.paymentMethod}</span>
                  </div>
                </div>
              )}
              {org?.jctId && (
                <div>
                  <p className="text-xs text-slate-500">適格請求書番号</p>
                  <p className="text-sm text-slate-300 mt-1 tabular-nums">{org.jctId}</p>
                </div>
              )}
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
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">請求書がありません</p>
            </div>
          ) : (
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
                  const sc = statusConfig[inv.status] ?? statusConfig.pending;
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
          )}
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
                PDF請求書には消費税額が明記されております。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
