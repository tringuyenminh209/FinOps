import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../../middleware/auth';
import {
  listInvoices,
  getInvoice,
  generateJCTInvoice,
  createSubscription,
  updatePaymentMethod,
  handleStripeWebhook,
  verifyWebhookSignature,
} from './service';

type AuthEnv = {
  Variables: {
    user: { userId: string; orgId: string; role: 'admin' | 'viewer' | 'operator' };
  };
};

export const billingRoutes = new Hono<AuthEnv>();

// ── Stripe Webhook (認証不要、署名検証のみ) ──
billingRoutes.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json(
      { success: false, error: { code: 'INVALID_SIGNATURE', message: '署名がありません' } },
      400,
    );
  }

  try {
    const rawBody = await c.req.text();
    const event = verifyWebhookSignature(rawBody, signature);
    await handleStripeWebhook(event);
    return c.json({ success: true, data: { received: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook処理エラー';
    return c.json(
      { success: false, error: { code: 'WEBHOOK_ERROR', message } },
      400,
    );
  }
});

// ── 以降のルートは認証必須 ──
billingRoutes.use('/*', authMiddleware);

// GET /invoices — 請求書一覧
billingRoutes.get('/invoices', async (c) => {
  const user = c.get('user');
  const invoices = await listInvoices(user.orgId);
  return c.json({ success: true, data: invoices });
});

// GET /invoices/:id — 請求書詳細
billingRoutes.get('/invoices/:id', async (c) => {
  const invoice = await getInvoice(c.req.param('id'));
  if (!invoice) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: '請求書が見つかりません' } },
      404,
    );
  }
  return c.json({ success: true, data: invoice });
});

// GET /invoices/:id/pdf — JCT適格請求書PDF URL
billingRoutes.get('/invoices/:id/pdf', async (c) => {
  try {
    const jctInvoice = await generateJCTInvoice(c.req.param('id'));
    return c.json({ success: true, data: jctInvoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : '請求書生成エラー';
    return c.json(
      { success: false, error: { code: 'INVOICE_ERROR', message } },
      400,
    );
  }
});

// POST /subscribe — サブスクリプション作成 (admin権限)
billingRoutes.post(
  '/subscribe',
  requireRole('admin'),
  zValidator(
    'json',
    z.object({
      planType: z.enum(['pro', 'enterprise']),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { planType } = c.req.valid('json');

    try {
      const subscription = await createSubscription(user.orgId, planType);
      return c.json({ success: true, data: { subscriptionId: subscription.id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'サブスクリプション作成エラー';
      return c.json(
        { success: false, error: { code: 'SUBSCRIPTION_ERROR', message } },
        400,
      );
    }
  },
);

// PUT /payment-method — 支払い方法変更 (admin権限)
billingRoutes.put(
  '/payment-method',
  requireRole('admin'),
  zValidator(
    'json',
    z.object({
      method: z.enum(['stripe', 'furikomi']),
      stripePaymentMethodId: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { method, stripePaymentMethodId } = c.req.valid('json');

    try {
      await updatePaymentMethod(user.orgId, method, stripePaymentMethodId);
      return c.json({ success: true, data: { paymentMethod: method } });
    } catch (err) {
      const message = err instanceof Error ? err.message : '支払い方法更新エラー';
      return c.json(
        { success: false, error: { code: 'PAYMENT_ERROR', message } },
        400,
      );
    }
  },
);
