// LINE Integration ルート — Webhook, 通知設定, レポート配信, 配信ステータス
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../middleware/auth';
import type { AuthUser } from '../../middleware/auth';
import {
  verifyWebhookSignature,
  handleWebhookEvents,
  getLineConfigsByOrg,
  upsertLineConfig,
  sendWeeklyReport,
  getDeliveryStatus,
  getWeeklyReports,
} from './service';
import { getUserById } from '../auth/service';

type LineEnv = { Variables: { user: AuthUser } };

export const lineRoutes = new Hono<LineEnv>();

// ── POST /webhook ── (認証不要: LINE Platform からの呼び出し)
lineRoutes.post('/webhook', async (c) => {
  const signature = c.req.header('x-line-signature') || '';
  const rawBody = await c.req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return c.json(
      { success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook署名が無効です' } },
      401,
    );
  }

  try {
    const body = JSON.parse(rawBody);
    await handleWebhookEvents(body.events || []);
    return c.json({ success: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return c.json(
      { success: false, error: { code: 'WEBHOOK_ERROR', message: 'Webhook処理中にエラーが発生しました' } },
      500,
    );
  }
});

// ── GET /config ── LINE通知設定一覧
lineRoutes.get('/config', authMiddleware, async (c) => {
  const user = c.get('user');
  const configs = await getLineConfigsByOrg(user.orgId);
  return c.json({ success: true, data: configs });
});

// ── PUT /config ── LINE通知設定更新
lineRoutes.put('/config', authMiddleware, async (c) => {
  const authUser = c.get('user');
  const body = await c.req.json();

  const userRecord = await getUserById(authUser.userId);
  if (!userRecord?.lineUserId) {
    return c.json(
      { success: false, error: { code: 'LINE_NOT_LINKED', message: 'LINEアカウントが連携されていません' } },
      400,
    );
  }

  const config = await upsertLineConfig(authUser.orgId, userRecord.lineUserId, body);
  return c.json({ success: true, data: config });
});

// ── POST /send-report ── 手動レポート送信 (admin のみ)
lineRoutes.post('/send-report', authMiddleware, requireRole('admin'), async (c) => {
  const user = c.get('user');

  try {
    const result = await sendWeeklyReport(user.orgId);
    return c.json({
      success: true,
      data: {
        report: result.report,
        delivery: { sent: result.sent, failed: result.failed },
      },
    });
  } catch (err) {
    console.error('Send report error:', err);
    return c.json(
      { success: false, error: { code: 'REPORT_SEND_FAILED', message: 'レポート送信に失敗しました' } },
      500,
    );
  }
});

// ── GET /delivery-status ── 配信ステータス一覧
lineRoutes.get('/delivery-status', authMiddleware, async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const deliveries = await getDeliveryStatus(user.orgId, limit);
  return c.json({ success: true, data: deliveries });
});

// ── GET /reports ── 週次レポート一覧
lineRoutes.get('/reports', authMiddleware, async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '12', 10);
  const reports = await getWeeklyReports(user.orgId, limit);
  return c.json({ success: true, data: reports });
});
