// GreenOps サービス — CO2排出量計算、Green-score、月次レポート
import { eq, and, sql, between, desc } from 'drizzle-orm';
import dayjs from 'dayjs';
import { db } from '../../db';
import {
  resources, cloudAccounts, costCarbonHistory, greenReports, auditLogs,
} from '../../db/schema';
import {
  EMISSION_FACTORS, PUE, RESOURCE_POWER_USAGE, getGreenGrade,
} from '@finops/shared';
import type {
  GreenReport, GreenScore, CarbonCalculation, GreenReportDetail,
} from '@finops/shared';

// ── CO2排出量計算 ──

export async function calculateCarbon(orgId: string): Promise<CarbonCalculation[]> {
  const rows = await db
    .select({
      resourceId: resources.id,
      resourceName: resources.name,
      resourceType: resources.resourceType,
      status: resources.status,
      region: cloudAccounts.region,
      provider: cloudAccounts.provider,
    })
    .from(resources)
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(eq(cloudAccounts.orgId, orgId));

  const calculations: CarbonCalculation[] = [];

  for (const row of rows) {
    const hoursPerMonth = row.status === 'running' ? 730 : 0;
    const basePower = RESOURCE_POWER_USAGE[row.resourceType] ?? 0.3;
    const pue = PUE[row.provider] ?? 1.15;
    const emissionFactor = EMISSION_FACTORS[row.region] ?? EMISSION_FACTORS['ap-northeast-1'];

    const powerKwh = basePower * hoursPerMonth;
    const carbonKg = powerKwh * pue * emissionFactor;

    if (powerKwh > 0) {
      await db.insert(costCarbonHistory).values({
        resourceId: row.resourceId,
        powerKwh,
        carbonFootprintKg: carbonKg,
        emissionFactor,
        emissionFactorSource: row.region,
      });
    }

    calculations.push({
      resourceId: row.resourceId,
      resourceName: row.resourceName ?? row.resourceType,
      resourceType: row.resourceType,
      region: row.region,
      provider: row.provider,
      powerKwh,
      carbonKg,
      emissionFactor,
      pue,
    });
  }

  return calculations;
}

// ── Green-score 算出 ──

export async function calculateGreenScore(orgId: string): Promise<GreenScore> {
  const now = dayjs();
  const currentMonthStart = now.startOf('month').toDate();
  const currentMonthEnd = now.endOf('month').toDate();
  const prevMonthStart = now.subtract(1, 'month').startOf('month').toDate();
  const prevMonthEnd = now.subtract(1, 'month').endOf('month').toDate();

  const [currentResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.carbonFootprintKg}), 0)` })
    .from(costCarbonHistory)
    .innerJoin(resources, eq(costCarbonHistory.resourceId, resources.id))
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(and(
      eq(cloudAccounts.orgId, orgId),
      between(costCarbonHistory.timestamp, currentMonthStart, currentMonthEnd),
    ));

  const [prevResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.carbonFootprintKg}), 0)` })
    .from(costCarbonHistory)
    .innerJoin(resources, eq(costCarbonHistory.resourceId, resources.id))
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(and(
      eq(cloudAccounts.orgId, orgId),
      between(costCarbonHistory.timestamp, prevMonthStart, prevMonthEnd),
    ));

  const totalCarbonKg = Number(currentResult?.total) || 0;
  const baselineCarbonKg = Number(prevResult?.total) || 0;

  const reductionPercent = baselineCarbonKg > 0
    ? ((baselineCarbonKg - totalCarbonKg) / baselineCarbonKg) * 100
    : 0;

  // スコア: 削減率に基づく 0-100。50%以上削減で100点
  const score = Math.min(100, Math.max(0, Math.round(
    baselineCarbonKg > 0 ? (reductionPercent / 50) * 100 : 50,
  )));

  return {
    score,
    grade: getGreenGrade(score),
    totalCarbonKg,
    baselineCarbonKg,
    reductionPercent: Math.round(reductionPercent * 10) / 10,
  };
}

// ── 月次レポート生成 ──

export async function generateGreenReport(orgId: string, month: string): Promise<GreenReport> {
  const monthStart = dayjs(`${month}-01`).startOf('month').toDate();
  const monthEnd = dayjs(`${month}-01`).endOf('month').toDate();

  const regionBreakdown = await db
    .select({
      region: cloudAccounts.region,
      provider: cloudAccounts.provider,
      carbonKg: sql<number>`COALESCE(SUM(${costCarbonHistory.carbonFootprintKg}), 0)`,
      powerKwh: sql<number>`COALESCE(SUM(${costCarbonHistory.powerKwh}), 0)`,
      resourceCount: sql<number>`COUNT(DISTINCT ${resources.id})`,
    })
    .from(costCarbonHistory)
    .innerJoin(resources, eq(costCarbonHistory.resourceId, resources.id))
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(and(
      eq(cloudAccounts.orgId, orgId),
      between(costCarbonHistory.timestamp, monthStart, monthEnd),
    ))
    .groupBy(cloudAccounts.region, cloudAccounts.provider);

  const totalCarbonKg = regionBreakdown.reduce((s, r) => s + Number(r.carbonKg), 0);
  const totalPowerKwh = regionBreakdown.reduce((s, r) => s + Number(r.powerKwh), 0);

  const [costResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.amountJpy}), 0)` })
    .from(costCarbonHistory)
    .innerJoin(resources, eq(costCarbonHistory.resourceId, resources.id))
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(and(
      eq(cloudAccounts.orgId, orgId),
      between(costCarbonHistory.timestamp, monthStart, monthEnd),
    ));

  const totalCostJpy = Number(costResult?.total) || 0;

  // Night-Watch による停止時間 → CO2 削減量を推定
  const stopLogs = await db
    .select()
    .from(auditLogs)
    .where(and(
      eq(auditLogs.orgId, orgId),
      eq(auditLogs.action, 'resource.stop'),
      between(auditLogs.createdAt, monthStart, monthEnd),
    ));

  const avgEmissionFactor = EMISSION_FACTORS['ap-northeast-1'];
  const avgPue = PUE['aws'];
  const avgPower = RESOURCE_POWER_USAGE['ec2'];
  const savingsCarbonKg = stopLogs.length * avgPower * avgPue * avgEmissionFactor;
  const savingsCostJpy = stopLogs.length * 50;

  const greenScore = await calculateGreenScore(orgId);

  const details: GreenReportDetail[] = regionBreakdown.map((r) => ({
    region: r.region,
    provider: r.provider,
    carbonKg: Number(r.carbonKg),
    powerKwh: Number(r.powerKwh),
    resourceCount: Number(r.resourceCount),
  }));

  const existing = await db
    .select()
    .from(greenReports)
    .where(and(eq(greenReports.orgId, orgId), eq(greenReports.reportMonth, month)))
    .limit(1);

  let reportId: string;

  if (existing.length > 0) {
    await db
      .update(greenReports)
      .set({
        totalCarbonKg,
        totalPowerKwh,
        totalCostJpy,
        savingsCarbonKg,
        savingsCostJpy,
        details,
      })
      .where(eq(greenReports.id, existing[0].id));
    reportId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(greenReports)
      .values({
        orgId,
        reportMonth: month,
        totalCarbonKg,
        totalPowerKwh,
        totalCostJpy,
        savingsCarbonKg,
        savingsCostJpy,
        details,
      })
      .returning();
    reportId = inserted.id;
  }

  return {
    id: reportId,
    orgId,
    reportMonth: month,
    totalCarbonKg,
    totalPowerKwh,
    totalCostJpy,
    savingsCarbonKg,
    savingsCostJpy,
    greenScore: greenScore.score,
    details,
    createdAt: existing[0]?.createdAt ?? new Date(),
  };
}

// ── レポート取得 ──

export async function getGreenReports(orgId: string, limit = 12): Promise<GreenReport[]> {
  const rows = await db
    .select()
    .from(greenReports)
    .where(eq(greenReports.orgId, orgId))
    .orderBy(desc(greenReports.reportMonth))
    .limit(limit);

  return rows.map(mapGreenReport);
}

export async function getGreenReport(orgId: string, month: string): Promise<GreenReport | null> {
  const [row] = await db
    .select()
    .from(greenReports)
    .where(and(eq(greenReports.orgId, orgId), eq(greenReports.reportMonth, month)))
    .limit(1);

  return row ? mapGreenReport(row) : null;
}

function mapGreenReport(row: typeof greenReports.$inferSelect): GreenReport {
  const details = (row.details as GreenReportDetail[]) || [];
  return {
    id: row.id,
    orgId: row.orgId,
    reportMonth: row.reportMonth,
    totalCarbonKg: row.totalCarbonKg,
    totalPowerKwh: row.totalPowerKwh,
    totalCostJpy: row.totalCostJpy,
    savingsCarbonKg: row.savingsCarbonKg,
    savingsCostJpy: row.savingsCostJpy,
    greenScore: 0,
    details,
    createdAt: row.createdAt,
  };
}
