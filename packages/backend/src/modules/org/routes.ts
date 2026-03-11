// Organization management API routes
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, count, desc } from 'drizzle-orm';
import { db } from '../../db';
import { organizations, users, cloudAccounts, lineConfigs, auditLogs } from '../../db/schema';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { updateOrgSettingsSchema } from '@finops/shared';
import type { AppEnv } from '../../types';

export const orgRoutes = new Hono<AppEnv>();

orgRoutes.use('*', authMiddleware);
orgRoutes.use('*', tenantMiddleware);

/** GET / — 組織情報と統計 */
orgRoutes.get('/', async (c) => {
  const org = c.get('org');

  const [[memberCount], [accountCount], lineConfig] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.orgId, org.id)),
    db.select({ count: count() }).from(cloudAccounts).where(eq(cloudAccounts.orgId, org.id)),
    db.select().from(lineConfigs).where(eq(lineConfigs.orgId, org.id)).limit(1),
  ]);

  return c.json({
    success: true,
    data: {
      id: org.id,
      name: org.name,
      jctId: org.jctId,
      planType: org.planType,
      paymentMethod: org.paymentMethod,
      settings: org.settings,
      memberCount: memberCount?.count ?? 0,
      cloudAccountCount: accountCount?.count ?? 0,
      lineIntegration: {
        enabled: lineConfig.length > 0 && lineConfig[0].isEnabled,
        connectedUsers: lineConfig.length,
      },
      createdAt: org.createdAt,
    },
  });
});

/** GET /settings — 組織設定詳細 */
orgRoutes.get('/settings', async (c) => {
  const org = c.get('org');
  const settings = (org.settings as Record<string, unknown>) ?? {};

  return c.json({
    success: true,
    data: {
      lineIntegration: (settings.lineIntegration as Record<string, unknown>) ?? { enabled: false },
      notifications: (settings.notifications as Record<string, unknown>) ?? {
        costAlertThresholdJpy: 100000,
        weeklyReportEnabled: true,
        weeklyReportDay: 1,
        weeklyReportHour: 9,
      },
      nightWatch: (settings.nightWatch as Record<string, unknown>) ?? {
        defaultWarningMinutes: 10,
        defaultExtendHours: 2,
      },
    },
  });
});

/** PUT /settings — 組織設定更新 */
orgRoutes.put(
  '/settings',
  requireRole('admin'),
  zValidator('json', updateOrgSettingsSchema),
  async (c) => {
    const org = c.get('org');
    const body = c.req.valid('json');
    const current = (org.settings as Record<string, unknown>) ?? {};

    const merged = {
      ...current,
      ...(body.lineIntegration && {
        lineIntegration: { ...(current.lineIntegration as object ?? {}), ...body.lineIntegration },
      }),
      ...(body.notifications && {
        notifications: { ...(current.notifications as object ?? {}), ...body.notifications },
      }),
      ...(body.nightWatch && {
        nightWatch: { ...(current.nightWatch as object ?? {}), ...body.nightWatch },
      }),
    };

    await db
      .update(organizations)
      .set({ settings: merged, updatedAt: new Date() })
      .where(eq(organizations.id, org.id));

    return c.json({ success: true, data: merged });
  },
);

/** GET /members — 組織メンバー一覧 */
orgRoutes.get('/members', async (c) => {
  const org = c.get('org');

  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.orgId, org.id));

  return c.json({ success: true, data: members });
});

/** GET /audit — 操作履歴 (Audit Log) */
orgRoutes.get('/audit', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const { limit = '100', action, targetType } = c.req.query();

  const limitNum = Math.min(500, parseInt(limit, 10));
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.orgId, org.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limitNum);

  let filtered = rows;
  if (action) filtered = filtered.filter((r) => r.action === action);
  if (targetType) filtered = filtered.filter((r) => r.targetType === targetType);

  return c.json({ success: true, data: filtered });
});
