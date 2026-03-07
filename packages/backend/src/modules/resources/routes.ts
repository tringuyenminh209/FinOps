// Cross-account resource aggregation API
import { Hono } from 'hono';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '../../db';
import { resources, cloudAccounts } from '../../db/schema';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import type { AppEnv } from '../../types';

export const resourcesRoutes = new Hono<AppEnv>();

resourcesRoutes.use('*', authMiddleware);
resourcesRoutes.use('*', tenantMiddleware);

/** GET / — 全アカウントのリソース一覧 */
resourcesRoutes.get('/', async (c) => {
  const org = c.get('org');
  const { status, type, search, page = '1', limit = '50' } = c.req.query();

  // Get all cloud accounts for this org
  const accounts = await db
    .select({ id: cloudAccounts.id, provider: cloudAccounts.provider, region: cloudAccounts.region, accountAlias: cloudAccounts.accountAlias })
    .from(cloudAccounts)
    .where(eq(cloudAccounts.orgId, org.id));

  if (accounts.length === 0) {
    return c.json({ success: true, data: { resources: [], total: 0, page: 1, limit: 50 } });
  }

  const accountIds = accounts.map((a) => a.id);
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const rows = await db
    .select()
    .from(resources)
    .where(inArray(resources.cloudAccountId, accountIds))
    .orderBy(desc(resources.monthlyCostJpy));

  // Apply in-memory filters (simple approach for now)
  let filtered = rows;
  if (status && status !== 'all') filtered = filtered.filter((r) => r.status === status);
  if (type && type !== 'all') filtered = filtered.filter((r) => r.resourceType.includes(type));
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (r) => r.name?.toLowerCase().includes(s) || r.externalId.toLowerCase().includes(s),
    );
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const total = filtered.length;
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const result = paginated.map((r) => {
    const account = accountMap.get(r.cloudAccountId);
    return {
      id: r.id,
      cloudAccountId: r.cloudAccountId,
      provider: account?.provider ?? 'aws',
      region: account?.region ?? 'ap-northeast-1',
      accountAlias: account?.accountAlias,
      resourceType: r.resourceType,
      externalId: r.externalId,
      name: r.name,
      status: r.status,
      tags: r.tags,
      monthlyCostJpy: r.monthlyCostJpy,
      lastSeenAt: r.lastSeenAt,
      createdAt: r.createdAt,
    };
  });

  return c.json({
    success: true,
    data: { resources: result, total, page: pageNum, limit: limitNum },
  });
});

/** GET /summary — リソースサマリ統計 */
resourcesRoutes.get('/summary', async (c) => {
  const org = c.get('org');

  const accounts = await db
    .select({ id: cloudAccounts.id })
    .from(cloudAccounts)
    .where(eq(cloudAccounts.orgId, org.id));

  if (accounts.length === 0) {
    return c.json({ success: true, data: { total: 0, running: 0, stopped: 0, totalMonthlyCostJpy: 0, byType: {} } });
  }

  const accountIds = accounts.map((a) => a.id);
  const rows = await db
    .select()
    .from(resources)
    .where(inArray(resources.cloudAccountId, accountIds));

  const running = rows.filter((r) => r.status === 'running').length;
  const stopped = rows.filter((r) => r.status === 'stopped').length;
  const totalMonthlyCostJpy = rows.reduce((s, r) => s + (r.monthlyCostJpy ?? 0), 0);

  const byType: Record<string, number> = {};
  for (const r of rows) {
    byType[r.resourceType] = (byType[r.resourceType] ?? 0) + 1;
  }

  return c.json({
    success: true,
    data: { total: rows.length, running, stopped, totalMonthlyCostJpy, byType },
  });
});
