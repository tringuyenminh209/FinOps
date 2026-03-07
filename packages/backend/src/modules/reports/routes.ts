// Reports API — Weekly cost report history
import { Hono } from 'hono';
import { eq, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { costCarbonHistory, resources, cloudAccounts, schedules } from '../../db/schema';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import type { AppEnv } from '../../types';

export const reportsRoutes = new Hono<AppEnv>();

reportsRoutes.use('*', authMiddleware);
reportsRoutes.use('*', tenantMiddleware);

/** GET /weekly — 週次レポート履歴 (最新12週) */
reportsRoutes.get('/weekly', async (c) => {
  const org = c.get('org');
  const { weeks = '12' } = c.req.query();

  const accounts = await db
    .select({ id: cloudAccounts.id })
    .from(cloudAccounts)
    .where(eq(cloudAccounts.orgId, org.id));

  if (accounts.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const accountIds = accounts.map((a) => a.id);
  const orgResources = await db
    .select({ id: resources.id, resourceType: resources.resourceType })
    .from(resources)
    .where(inArray(resources.cloudAccountId, accountIds));

  if (orgResources.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const resourceIds = orgResources.map((r) => r.id);
  const weeksBack = Math.min(52, Math.max(1, parseInt(weeks, 10)));

  const history = await db
    .select()
    .from(costCarbonHistory)
    .where(inArray(costCarbonHistory.resourceId, resourceIds))
    .orderBy(desc(costCarbonHistory.timestamp));

  // Group into weekly buckets (ISO week-start = Monday)
  const byWeek = new Map<string, { amountJpy: number; carbonKg: number; count: number }>();
  for (const entry of history) {
    const d = new Date(entry.timestamp);
    // Normalize to Monday of that week
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().slice(0, 10);
    const existing = byWeek.get(key) ?? { amountJpy: 0, carbonKg: 0, count: 0 };
    existing.amountJpy += entry.amountJpy;
    existing.carbonKg += entry.carbonFootprintKg ?? 0;
    existing.count += 1;
    byWeek.set(key, existing);
  }

  const sorted = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-weeksBack);

  const reports = sorted.map(([weekStart, data], i) => {
    const prev = i > 0 ? sorted[i - 1][1].amountJpy : null;
    const changePercent = prev && prev > 0 ? ((data.amountJpy - prev) / prev) * 100 : 0;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      id: weekStart,
      periodStart: weekStart,
      periodEnd: weekEnd.toISOString().slice(0, 10),
      totalCostJpy: Math.round(data.amountJpy),
      previousCostJpy: prev ? Math.round(prev) : null,
      costChangePercent: Math.round(changePercent * 10) / 10,
      resourceCount: orgResources.length,
      carbonKg: Math.round(data.carbonKg * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  });

  return c.json({ success: true, data: reports.reverse() });
});

/** GET / — レポートサマリ */
reportsRoutes.get('/', async (c) => {
  const org = c.get('org');

  const accounts = await db
    .select({ id: cloudAccounts.id })
    .from(cloudAccounts)
    .where(eq(cloudAccounts.orgId, org.id));

  const accountIds = accounts.map((a) => a.id);
  const orgResources = accounts.length > 0
    ? await db.select({ id: resources.id }).from(resources).where(inArray(resources.cloudAccountId, accountIds))
    : [];

  const scheduledCount = orgResources.length > 0
    ? await db.select({ count: sql<number>`count(*)` }).from(schedules).where(inArray(schedules.resourceId, orgResources.map((r) => r.id)))
    : [{ count: 0 }];

  return c.json({
    success: true,
    data: {
      totalResources: orgResources.length,
      scheduledResources: scheduledCount[0]?.count ?? 0,
      cloudAccounts: accounts.length,
    },
  });
});
