// GreenOps API ルート — Carbon / GreenScore / Report
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { greenReportQuerySchema, PLAN_LIMITS } from '@finops/shared';
import {
  calculateCarbon,
  calculateGreenScore,
  generateGreenReport,
  getGreenReports,
  getGreenReport,
} from './service';

type CarbonEnv = {
  Variables: {
    user: { userId: string; orgId: string; role: 'admin' | 'viewer' | 'operator' };
    org: { planType: 'free' | 'pro' | 'enterprise' };
  };
};

const carbonRoutes = new Hono<CarbonEnv>();

// 全ルートに認証 + テナント分離を適用
carbonRoutes.use('*', authMiddleware, tenantMiddleware);

// Pro/Enterprise プラン限定チェック
carbonRoutes.use('*', async (c, next) => {
  const org = c.get('org');
  const plan = PLAN_LIMITS[org.planType];
  if (!plan.greenOps) {
    return c.json({
      success: false,
      error: { code: 'PLAN_LIMIT', message: 'GreenOps機能はPro/Enterpriseプランで利用可能です' },
    }, 403);
  }
  await next();
});

// GET /report — 月次レポート一覧
carbonRoutes.get('/report', async (c) => {
  const user = c.get('user');
  const limit = Number(c.req.query('limit')) || 12;
  const reports = await getGreenReports(user.orgId, limit);
  return c.json({ success: true, data: reports });
});

// GET /report/:month — 特定月レポート
carbonRoutes.get('/report/:month', async (c) => {
  const user = c.get('user');
  const month = c.req.param('month');
  const parsed = greenReportQuerySchema.safeParse({ month });
  if (!parsed.success) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400);
  }

  const report = await getGreenReport(user.orgId, month);
  if (!report) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: '指定月のレポートが見つかりません' },
    }, 404);
  }
  return c.json({ success: true, data: report });
});

// GET /green-score — Green-score 取得
carbonRoutes.get('/green-score', async (c) => {
  const user = c.get('user');
  const score = await calculateGreenScore(user.orgId);
  return c.json({ success: true, data: score });
});

// POST /calculate — 手動計算実行 (admin のみ)
carbonRoutes.post('/calculate', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const calculations = await calculateCarbon(user.orgId);
  return c.json({ success: true, data: calculations });
});

// POST /report/generate — 月次レポート生成 (admin のみ)
carbonRoutes.post('/report/generate', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ month: string }>();
  const parsed = greenReportQuerySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400);
  }
  const report = await generateGreenReport(user.orgId, parsed.data.month);
  return c.json({ success: true, data: report });
});

// GET /report/:month/pdf — PDF 向けデータ取得
carbonRoutes.get('/report/:month/pdf', async (c) => {
  const user = c.get('user');
  const month = c.req.param('month');
  const parsed = greenReportQuerySchema.safeParse({ month });
  if (!parsed.success) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400);
  }

  const report = await getGreenReport(user.orgId, month);
  if (!report) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: '指定月のレポートが見つかりません' },
    }, 404);
  }

  c.header('Content-Disposition', `attachment; filename="green-report-${month}.json"`);
  return c.json({ success: true, data: report });
});

export { carbonRoutes };
