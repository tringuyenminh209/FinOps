// 稟議ワークフロー API ルート
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import {
  createApproval,
  getApprovals,
  getApprovalById,
  respondToApproval,
  getApprovalStats,
} from './service';
import type { AppEnv } from '../../types';

export const approvalsRoutes = new Hono<AppEnv>();

approvalsRoutes.use('*', authMiddleware);
approvalsRoutes.use('*', tenantMiddleware);

const createApprovalSchema = z.object({
  resourceId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  actionType: z.enum(['start', 'stop', 'resize', 'delete', 'other']),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
  estimatedCostJpy: z.number().min(0).optional(),
  expiresInHours: z.number().int().min(1).max(168).default(48),
});

const respondSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().max(1000).optional(),
});

/** GET /stats — 稟議サマリ統計 */
approvalsRoutes.get('/stats', async (c) => {
  const org = c.get('org');
  const stats = await getApprovalStats(org.id);
  return c.json({ success: true, data: stats });
});

/** GET / — 稟議一覧 */
approvalsRoutes.get('/', async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const { status, mine, limit = '50' } = c.req.query();

  const results = await getApprovals(org.id, {
    status: status as any,
    requesterId: mine === 'true' ? user.userId : undefined,
    limit: Math.min(100, parseInt(limit, 10)),
  });

  return c.json({ success: true, data: results });
});

/** GET /:id — 稟議詳細 */
approvalsRoutes.get('/:id', async (c) => {
  const org = c.get('org');
  const approval = await getApprovalById(org.id, c.req.param('id'));

  if (!approval) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: '稟議が見つかりません' } }, 404);
  }

  return c.json({ success: true, data: approval });
});

/** POST / — 稟議申請 */
approvalsRoutes.post(
  '/',
  requireRole('admin', 'operator'),
  zValidator('json', createApprovalSchema),
  async (c) => {
    const org = c.get('org');
    const user = c.get('user');
    const body = c.req.valid('json');

    const approval = await createApproval(org.id, user.userId, body);
    return c.json({ success: true, data: approval }, 201);
  },
);

/** PUT /:id/respond — 承認/却下 */
approvalsRoutes.put(
  '/:id/respond',
  requireRole('admin'),
  zValidator('json', respondSchema),
  async (c) => {
    const org = c.get('org');
    const user = c.get('user');
    const body = c.req.valid('json');

    try {
      const updated = await respondToApproval(org.id, c.req.param('id'), user.userId, body);
      return c.json({ success: true, data: updated });
    } catch (e: any) {
      const msgMap: Record<string, string> = {
        NOT_FOUND: '稟議が見つかりません',
        ALREADY_RESPONDED: 'すでに回答済みです',
        SELF_APPROVAL_NOT_ALLOWED: '自分の申請を承認できません',
        EXPIRED: '稟議の有効期限が切れています',
      };
      const code = e.message as string;
      const status = code === 'NOT_FOUND' ? 404 : 400;
      return c.json(
        { success: false, error: { code, message: msgMap[code] ?? '処理に失敗しました' } },
        status,
      );
    }
  },
);

/** DELETE /:id — 稟議キャンセル (申請者のみ) */
approvalsRoutes.delete(
  '/:id',
  requireRole('admin', 'operator'),
  async (c) => {
    const org = c.get('org');
    const user = c.get('user');
    const approval = await getApprovalById(org.id, c.req.param('id'));

    if (!approval) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: '稟議が見つかりません' } }, 404);
    }

    if (approval.requesterId !== user.userId && user.role !== 'admin') {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: '申請者またはAdminのみキャンセル可能です' } }, 403);
    }

    if (approval.status !== 'pending') {
      return c.json({ success: false, error: { code: 'INVALID_STATE', message: '保留中の稟議のみキャンセルできます' } }, 400);
    }

    const { db } = await import('../../db');
    const { approvals: approvalsTable } = await import('../../db/schema');
    const { eq } = await import('drizzle-orm');

    await db
      .update(approvalsTable)
      .set({ status: 'rejected', approverComment: 'キャンセル済み', updatedAt: new Date() })
      .where(eq(approvalsTable.id, c.req.param('id')));

    return c.json({ success: true, data: { message: 'キャンセルしました' } });
  },
);
