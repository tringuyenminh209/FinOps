// AI Advisor API ルート
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { PLAN_LIMITS } from '@finops/shared';
import { analyzeAndRecommend, getRecommendations, updateOptimizationStatus } from './service';
import type { AppEnv } from '../../types';

const aiRoutes = new Hono<AppEnv>();

// 全ルートに認証 + テナント分離
aiRoutes.use('*', authMiddleware, tenantMiddleware);

// Pro/Enterprise プラン限定チェック
aiRoutes.use('*', async (c, next) => {
  const org = c.get('org');
  const plan = PLAN_LIMITS[org.planType as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  if (!plan.aiAdvisor) {
    return c.json({
      success: false,
      error: { code: 'PLAN_LIMIT', message: 'AI Advisor機能はPro/Enterpriseプランで利用可能です' },
    }, 403);
  }
  await next();
});

// POST /analyze — AI分析実行 (admin のみ)
aiRoutes.post('/analyze', requireRole('admin'), async (c) => {
  const user = c.get('user');

  try {
    const recommendations = await analyzeAndRecommend(user.orgId);
    return c.json({ success: true, data: recommendations });
  } catch (err) {
    console.error('[AI Advisor] analyze error:', err);
    return c.json({
      success: false,
      error: { code: 'ANALYSIS_ERROR', message: 'AI分析中にエラーが発生しました' },
    }, 500);
  }
});

// GET /recommendations — 推奨アクション一覧
aiRoutes.get('/recommendations', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');

  const recommendations = await getRecommendations(user.orgId, status);
  return c.json({ success: true, data: recommendations });
});

// PUT /recommendations/:id — 承認 / 却下
aiRoutes.put('/recommendations/:id', requireRole('operator'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  let body: { status: 'approved' | 'dismissed' };
  try {
    body = await c.req.json();
  } catch {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' },
    }, 400);
  }

  if (!['approved', 'dismissed'].includes(body.status)) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'statusはapproved/dismissedのみ有効です' },
    }, 400);
  }

  const updated = await updateOptimizationStatus(user.orgId, id, body.status);
  if (!updated) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: '推奨が見つかりません' },
    }, 404);
  }

  return c.json({ success: true, data: updated });
});

export { aiRoutes };
