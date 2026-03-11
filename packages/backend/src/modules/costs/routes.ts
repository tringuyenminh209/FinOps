// Cost analytics API
import { Hono } from 'hono';
import { eq, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { costCarbonHistory, resources, cloudAccounts } from '../../db/schema';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import type { AppEnv } from '../../types';

export const costsRoutes = new Hono<AppEnv>();

costsRoutes.use('*', authMiddleware);
costsRoutes.use('*', tenantMiddleware);

/** GET / — コスト分析データ（月別集計） */
costsRoutes.get('/', async (c) => {
  const org = c.get('org');
  const { months = '6' } = c.req.query();

  const accounts = await db
    .select({ id: cloudAccounts.id })
    .from(cloudAccounts)
    .where(eq(cloudAccounts.orgId, org.id));

  if (accounts.length === 0) {
    return c.json({ success: true, data: { monthly: [], breakdown: [], total: 0 } });
  }

  const accountIds = accounts.map((a) => a.id);

  // Get all resources for this org
  const orgResources = await db
    .select({ id: resources.id, resourceType: resources.resourceType, monthlyCostJpy: resources.monthlyCostJpy })
    .from(resources)
    .where(inArray(resources.cloudAccountId, accountIds));

  if (orgResources.length === 0) {
    return c.json({ success: true, data: { monthly: [], breakdown: [], total: 0 } });
  }

  const resourceIds = orgResources.map((r) => r.id);
  const monthsBack = Math.min(12, Math.max(1, parseInt(months, 10)));
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const history = await db
    .select()
    .from(costCarbonHistory)
    .where(inArray(costCarbonHistory.resourceId, resourceIds))
    .orderBy(desc(costCarbonHistory.recordDate));

  // Group by month
  const byMonth = new Map<string, number>();
  for (const entry of history) {
    const key = entry.recordDate.toISOString().slice(0, 7); // YYYY-MM
    byMonth.set(key, (byMonth.get(key) ?? 0) + entry.amountJpy);
  }

  const monthly = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-monthsBack)
    .map(([month, amountJpy]) => ({ month, amountJpy }));

  // Breakdown by resource type (from current monthly cost)
  const breakdownMap = new Map<string, number>();
  for (const r of orgResources) {
    const t = r.resourceType.toUpperCase();
    breakdownMap.set(t, (breakdownMap.get(t) ?? 0) + (r.monthlyCostJpy ?? 0));
  }
  const breakdown = Array.from(breakdownMap.entries())
    .map(([type, amountJpy]) => ({ type, amountJpy }))
    .sort((a, b) => b.amountJpy - a.amountJpy);

  const total = orgResources.reduce((s, r) => s + (r.monthlyCostJpy ?? 0), 0);

  return c.json({ success: true, data: { monthly, breakdown, total } });
});

/** GET /summary — 今月のコストサマリ */
costsRoutes.get('/summary', async (c) => {
  const org = c.get('org');

  const accounts = await db
    .select({ id: cloudAccounts.id })
    .from(cloudAccounts)
    .where(eq(cloudAccounts.orgId, org.id));

  if (accounts.length === 0) {
    return c.json({ success: true, data: { currentMonthJpy: 0, previousMonthJpy: 0, changePercent: 0 } });
  }

  const accountIds = accounts.map((a) => a.id);
  const orgResources = await db
    .select({ id: resources.id })
    .from(resources)
    .where(inArray(resources.cloudAccountId, accountIds));

  if (orgResources.length === 0) {
    return c.json({ success: true, data: { currentMonthJpy: 0, previousMonthJpy: 0, changePercent: 0 } });
  }

  const resourceIds = orgResources.map((r) => r.id);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonth, lastMonth] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.amountJpy}), 0)` })
      .from(costCarbonHistory)
      .where(inArray(costCarbonHistory.resourceId, resourceIds)),
    db.select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.amountJpy}), 0)` })
      .from(costCarbonHistory)
      .where(inArray(costCarbonHistory.resourceId, resourceIds)),
  ]);

  const current = thisMonth[0]?.total ?? 0;
  const previous = lastMonth[0]?.total ?? 0;
  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return c.json({
    success: true,
    data: { currentMonthJpy: current, previousMonthJpy: previous, changePercent },
  });
});
