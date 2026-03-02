import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { organizations, billingRecords } from '../../db/schema';
import { JCT_RATE } from '@finops/shared';

// Lazy Stripe client — only initialized when actually called
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// ── プラン料金定義 (税抜/JPY) ──
const PLAN_PRICES: Record<string, number> = {
  pro: 9800,
  enterprise: 49800,
};

// ── JCT適格請求書インターフェース ──
export interface JCTInvoice {
  invoiceNumber: string;
  issuerRegistrationNumber: string;
  issueDate: string;
  items: { description: string; unitPrice: number; quantity: number; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxClassification: string;
}

// ── Stripe顧客作成 ──
export async function createStripeCustomer(org: {
  id: string;
  name: string;
  email: string;
}): Promise<Stripe.Customer> {
  const customer = await getStripe().customers.create({
    email: org.email,
    name: org.name,
    metadata: { orgId: org.id },
  });

  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(organizations.id, org.id));

  return customer;
}

// ── サブスクリプション作成 (Pro/Enterprise) ──
export async function createSubscription(
  orgId: string,
  planType: 'pro' | 'enterprise',
): Promise<Stripe.Subscription> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) throw new Error('組織が見つかりません');

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer({
      id: org.id,
      name: org.name,
      email: '',
    });
    customerId = customer.id;
  }

  const taxRate = await getOrCreateJCTTaxRate();

  const price = await getStripe().prices.create({
    currency: 'jpy',
    unit_amount: PLAN_PRICES[planType],
    recurring: { interval: 'month' },
    product_data: {
      name: `FinOps ${planType === 'pro' ? 'Pro' : 'Enterprise'} プラン`,
    },
  });

  const subscription = await getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    default_tax_rates: [taxRate.id],
    metadata: { orgId, planType },
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  await db
    .update(organizations)
    .set({ planType, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  return subscription;
}

// ── JCT税率オブジェクト取得/作成 ──
async function getOrCreateJCTTaxRate(): Promise<Stripe.TaxRate> {
  const existing = await getStripe().taxRates.list({ active: true, limit: 100 });
  const jctRate = existing.data.find(
    (r: Stripe.TaxRate) => r.display_name === 'JCT' && r.percentage === JCT_RATE * 100,
  );

  if (jctRate) return jctRate;

  return getStripe().taxRates.create({
    display_name: 'JCT',
    description: '消費税（標準税率）',
    percentage: JCT_RATE * 100,
    inclusive: false,
    jurisdiction: 'JP',
  });
}

// ── 適格請求書(Qualified Invoice)データ生成 ──
export async function generateJCTInvoice(
  billingRecordId: string,
): Promise<JCTInvoice> {
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(eq(billingRecords.id, billingRecordId))
    .limit(1);

  if (!record) throw new Error('請求レコードが見つかりません');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, record.orgId))
    .limit(1);

  const subtotal = record.amountJpy;
  const taxAmount = Math.floor(subtotal * JCT_RATE);
  const total = subtotal + taxAmount;

  return {
    invoiceNumber: record.invoiceNumber,
    issuerRegistrationNumber:
      process.env.JCT_REGISTRATION_NUMBER || 'T0000000000000',
    issueDate: new Date().toISOString().split('T')[0],
    items: [
      {
        description: `FinOps ${org?.planType ?? 'pro'} プラン (${formatPeriod(record.billingPeriodStart, record.billingPeriodEnd)})`,
        unitPrice: subtotal,
        quantity: 1,
        amount: subtotal,
      },
    ],
    subtotal,
    taxRate: JCT_RATE,
    taxAmount,
    total,
    taxClassification: '標準税率 10%',
  };
}

// ── 請求書一覧取得 ──
export async function listInvoices(orgId: string) {
  return db
    .select()
    .from(billingRecords)
    .where(eq(billingRecords.orgId, orgId))
    .orderBy(billingRecords.createdAt);
}

// ── 請求書詳細取得 ──
export async function getInvoice(invoiceId: string) {
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(eq(billingRecords.id, invoiceId))
    .limit(1);

  return record ?? null;
}

// ── 支払い方法更新 ──
export async function updatePaymentMethod(
  orgId: string,
  method: 'stripe' | 'furikomi',
  stripePaymentMethodId?: string,
): Promise<void> {
  if (method === 'stripe' && stripePaymentMethodId) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org?.stripeCustomerId) {
      await getStripe().paymentMethods.attach(stripePaymentMethodId, {
        customer: org.stripeCustomerId,
      });
      await getStripe().customers.update(org.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: stripePaymentMethodId,
        },
      });
    }
  }

  await db
    .update(organizations)
    .set({ paymentMethod: method, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));
}

// ── Stripe Webhook処理 ──
export async function handleStripeWebhook(
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = invoice.metadata?.orgId;
      if (!orgId) break;

      const subtotal = invoice.subtotal ?? 0;
      const tax = invoice.tax ?? 0;

      await db.insert(billingRecords).values({
        orgId,
        invoiceNumber: `INV-${Date.now()}`,
        amountJpy: subtotal,
        taxJpy: tax,
        totalJpy: subtotal + tax,
        paymentMethod: 'stripe',
        status: 'paid',
        billingPeriodStart: new Date(
          (invoice.period_start ?? 0) * 1000,
        ),
        billingPeriodEnd: new Date(
          (invoice.period_end ?? 0) * 1000,
        ),
        stripeInvoiceId: invoice.id,
        paidAt: new Date(),
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = invoice.metadata?.orgId;
      if (!orgId) break;

      await db
        .update(billingRecords)
        .set({ status: 'overdue' })
        .where(eq(billingRecords.stripeInvoiceId, invoice.id));
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;
      const planType = subscription.metadata?.planType;
      if (!orgId || !planType) break;

      await db
        .update(organizations)
        .set({ planType, updatedAt: new Date() })
        .where(eq(organizations.id, orgId));
      break;
    }
  }
}

// ── Stripe署名検証 ──
export function verifyWebhookSignature(
  payload: string,
  signature: string,
): Stripe.Event {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  return getStripe().webhooks.constructEvent(payload, signature, endpointSecret);
}

// ── ヘルパー ──
function formatPeriod(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} - ${fmt(end)}`;
}
