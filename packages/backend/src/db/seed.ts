/**
 * Development seed — inserts a complete test dataset.
 * Run: pnpm --filter @finops/backend db:seed
 *
 * Test credentials:
 *   Email    : dev@finops.test
 *   Password : password123
 */

import { scryptSync, randomBytes } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://finops:123qwecc@localhost:5432/finops';

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// ── helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database…');

  // ── 1. Organization ──────────────────────────────────────────────────────
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: 'FinOps テスト株式会社',
      jctId: 'T1234567890123',
      planType: 'pro',
      paymentMethod: 'stripe',
      settings: {},
    })
    .returning();
  console.log('✅ Organization:', org.id);

  // ── 2. Admin user ────────────────────────────────────────────────────────
  const [user] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      email: 'dev@finops.test',
      passwordHash: hashPassword('password123'),
      role: 'admin',
      displayName: 'テスト管理者',
      isActive: true,
    })
    .returning();
  console.log('✅ User:', user.email);

  // ── 3. Cloud account (AWS) ───────────────────────────────────────────────
  const [account] = await db
    .insert(schema.cloudAccounts)
    .values({
      orgId: org.id,
      provider: 'aws',
      arnRole: 'arn:aws:iam::123456789012:role/FinOpsRole',
      externalId: 'finops-ext-abc123',
      region: 'ap-northeast-1',
      accountAlias: 'dev-account',
      isActive: true,
      lastScanAt: daysAgo(1),
    })
    .returning();
  console.log('✅ Cloud account:', account.id);

  // ── 4. Resources ─────────────────────────────────────────────────────────
  const resourceRows = [
    {
      cloudAccountId: account.id,
      resourceType: 'ec2',
      externalId: 'i-0abc123def456001',
      name: 'web-server-prod',
      status: 'running',
      tags: { Environment: 'production', Team: 'backend' },
      metadata: { instanceType: 't3.medium', az: 'ap-northeast-1a' },
      monthlyCostJpy: 4500,
    },
    {
      cloudAccountId: account.id,
      resourceType: 'ec2',
      externalId: 'i-0abc123def456002',
      name: 'api-server-prod',
      status: 'running',
      tags: { Environment: 'production', Team: 'api' },
      metadata: { instanceType: 't3.large', az: 'ap-northeast-1a' },
      monthlyCostJpy: 8900,
    },
    {
      cloudAccountId: account.id,
      resourceType: 'ec2',
      externalId: 'i-0abc123def456003',
      name: 'batch-server-dev',
      status: 'stopped',
      tags: { Environment: 'development', Team: 'backend' },
      metadata: { instanceType: 't3.small', az: 'ap-northeast-1c' },
      monthlyCostJpy: 1200,
    },
    {
      cloudAccountId: account.id,
      resourceType: 'rds',
      externalId: 'db-finops-prod-001',
      name: 'finops-db-prod',
      status: 'running',
      tags: { Environment: 'production', Team: 'infra' },
      metadata: { instanceClass: 'db.t3.medium', engine: 'postgres', version: '15.4' },
      monthlyCostJpy: 12800,
    },
    {
      cloudAccountId: account.id,
      resourceType: 'rds',
      externalId: 'db-finops-dev-001',
      name: 'finops-db-dev',
      status: 'stopped',
      tags: { Environment: 'development', Team: 'infra' },
      metadata: { instanceClass: 'db.t3.small', engine: 'postgres', version: '15.4' },
      monthlyCostJpy: 3200,
    },
    {
      cloudAccountId: account.id,
      resourceType: 's3',
      externalId: 'finops-assets-prod',
      name: 'finops-assets-prod',
      status: 'running',
      tags: { Environment: 'production' },
      metadata: { sizeGb: 45.2, region: 'ap-northeast-1' },
      monthlyCostJpy: 680,
    },
    {
      cloudAccountId: account.id,
      resourceType: 's3',
      externalId: 'finops-logs-archive',
      name: 'finops-logs-archive',
      status: 'running',
      tags: { Environment: 'production', Purpose: 'logs' },
      metadata: { sizeGb: 210.5, region: 'ap-northeast-1' },
      monthlyCostJpy: 2100,
    },
    {
      cloudAccountId: account.id,
      resourceType: 'ec2',
      externalId: 'i-0abc123def456004',
      name: 'ml-training-server',
      status: 'stopped',
      tags: { Environment: 'development', Team: 'ml' },
      metadata: { instanceType: 'g4dn.xlarge', az: 'ap-northeast-1a' },
      monthlyCostJpy: 18500,
    },
  ];

  const insertedResources = await db
    .insert(schema.resources)
    .values(resourceRows.map((r) => ({ ...r, lastSeenAt: daysAgo(1) })))
    .returning();
  console.log('✅ Resources:', insertedResources.length);

  // ── 5. Cost & carbon history (6 months) ──────────────────────────────────
  const costRows: (typeof schema.costCarbonHistory.$inferInsert)[] = [];

  for (const resource of insertedResources) {
    for (let m = 5; m >= 0; m--) {
      // 4 records per month per resource (weekly ≈)
      for (let w = 0; w < 4; w++) {
        const base = resource.monthlyCostJpy / 4;
        const jitter = base * (0.85 + Math.random() * 0.3);
        const kwh = jitter / 30; // rough estimate
        costRows.push({
          resourceId: resource.id,
          amountJpy: Math.round(jitter),
          carbonFootprintKg: parseFloat((kwh * 0.000434).toFixed(4)),
          powerKwh: parseFloat(kwh.toFixed(2)),
          emissionFactor: 0.000434,
          emissionFactorSource: 'env_ministry_jp_2024',
          recordDate: (() => {
            const d = monthsAgo(m);
            d.setDate(1 + w * 7);
            return d;
          })(),
        });
      }
    }
  }

  await db.insert(schema.costCarbonHistory).values(costRows);
  console.log('✅ Cost history:', costRows.length, 'records');

  // ── 6. Schedules (Night-Watch) ───────────────────────────────────────────
  const schedulableResources = insertedResources.filter((r) =>
    ['ec2', 'rds'].includes(r.resourceType),
  );
  await db.insert(schema.schedules).values(
    schedulableResources.map((r) => ({
      resourceId: r.id,
      startTimeJst: '09:00',
      endTimeJst: '19:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      isActive: r.status === 'running',
    })),
  );
  console.log('✅ Schedules:', schedulableResources.length);

  // ── 7. Weekly reports (last 4 weeks) ─────────────────────────────────────
  const reportRows = Array.from({ length: 4 }, (_, i) => {
    const start = daysAgo(7 * (i + 1));
    const end = daysAgo(7 * i);
    const total = 35000 + Math.round(Math.random() * 8000);
    const prev = total * (0.9 + Math.random() * 0.2);
    return {
      orgId: org.id,
      periodStart: start,
      periodEnd: end,
      totalCostJpy: total,
      previousCostJpy: Math.round(prev),
      costChangePercent: parseFloat((((total - prev) / prev) * 100).toFixed(1)),
      resourceCount: insertedResources.length,
      stoppedHours: 40 + Math.round(Math.random() * 20),
      savingsJpy: 3000 + Math.round(Math.random() * 2000),
      topResources: insertedResources
        .slice(0, 3)
        .map((r) => ({ id: r.id, name: r.name, costJpy: r.monthlyCostJpy })),
    };
  });
  await db.insert(schema.weeklyReports).values(reportRows);
  console.log('✅ Weekly reports:', reportRows.length);

  // ── 8. AI Advisor optimizations ──────────────────────────────────────────
  await db.insert(schema.optimizations).values([
    {
      resourceId: insertedResources[7].id, // ml-training-server
      recommendedBy: 'gpt-4o-mini',
      actionType: 'stop',
      actionDescription:
        'ml-training-server は週末も稼働しています。自動停止スケジュールを設定すると月 ¥18,500 節約できます。',
      status: 'pending',
      savingsJpy: 18500,
      co2ReducedKg: 12.4,
    },
    {
      resourceId: insertedResources[1].id, // api-server-prod
      recommendedBy: 'gpt-4o-mini',
      actionType: 'rightsize',
      actionDescription:
        'api-server-prod の CPU 使用率が過去 30 日平均 18% です。t3.medium にダウンサイズすると月 ¥4,400 節約できます。',
      status: 'pending',
      savingsJpy: 4400,
      co2ReducedKg: 3.1,
    },
    {
      resourceId: insertedResources[6].id, // logs-archive
      recommendedBy: 'gpt-4o-mini',
      actionType: 'rightsize',
      actionDescription:
        'finops-logs-archive の 90 日以上アクセスのないオブジェクトを S3 Glacier に移行すると月 ¥900 節約できます。',
      status: 'approved',
      savingsJpy: 900,
      co2ReducedKg: 0.6,
    },
  ]);
  console.log('✅ Optimizations: 3');

  // ── 9. Billing records ───────────────────────────────────────────────────
  await db.insert(schema.billingRecords).values(
    Array.from({ length: 3 }, (_, i) => {
      const start = monthsAgo(i + 1);
      const end = monthsAgo(i);
      const amount = 9800;
      return {
        orgId: org.id,
        invoiceNumber: `INV-2026-${String(3 - i).padStart(3, '0')}`,
        amountJpy: amount,
        taxJpy: Math.round(amount * 0.1),
        totalJpy: Math.round(amount * 1.1),
        paymentMethod: 'stripe',
        status: 'paid',
        billingPeriodStart: start,
        billingPeriodEnd: end,
        paidAt: end,
      };
    }),
  );
  console.log('✅ Billing records: 3');

  console.log('\n🎉 Seed complete!');
  console.log('──────────────────────────────');
  console.log('  Email   : dev@finops.test');
  console.log('  Password: password123');
  console.log('──────────────────────────────');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => client.end());
