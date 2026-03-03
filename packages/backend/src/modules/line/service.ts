// LINE Integration サービス — Messaging API連携・配信管理・週次レポート生成
import { eq, and, sql, desc, between } from 'drizzle-orm';
import { createHmac } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '../../db';
import {
  lineConfigs, lineDeliveries, weeklyReports,
  users, organizations, resources, costCarbonHistory, auditLogs,
} from '../../db/schema';
import { LINE_API } from '@finops/shared';
import type { LineConfig, WeeklyReport, LineDeliveryStatus, LineMessageType } from '@finops/shared';
import { buildWeeklyReportFlex, buildNightWatchNotifyFlex, buildCostAlertFlex } from './templates';

dayjs.extend(utc);
dayjs.extend(timezone);

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// ── Webhook署名検証 ──
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return false;
  const hash = createHmac('sha256', CHANNEL_SECRET).update(body).digest('base64');
  return hash === signature;
}

// ── LINE Push Message ──
async function pushMessage(lineUserId: string, messages: unknown[]): Promise<boolean> {
  try {
    const res = await fetch(LINE_API.PUSH_MESSAGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    });
    return res.ok;
  } catch (err) {
    console.error('LINE Push Message failed:', err);
    return false;
  }
}

// ── LINE Reply Message ──
async function replyMessage(replyToken: string, messages: unknown[]): Promise<boolean> {
  try {
    const res = await fetch(LINE_API.REPLY_MESSAGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });
    return res.ok;
  } catch (err) {
    console.error('LINE Reply Message failed:', err);
    return false;
  }
}

// ── LINE Config CRUD ──

export async function getLineConfig(orgId: string, lineUserId: string): Promise<LineConfig | null> {
  const rows = await db
    .select()
    .from(lineConfigs)
    .where(and(eq(lineConfigs.orgId, orgId), eq(lineConfigs.lineUserId, lineUserId)))
    .limit(1);

  if (rows.length === 0) return null;
  return mapLineConfig(rows[0]);
}

export async function getLineConfigsByOrg(orgId: string): Promise<LineConfig[]> {
  const rows = await db
    .select()
    .from(lineConfigs)
    .where(eq(lineConfigs.orgId, orgId));
  return rows.map(mapLineConfig);
}

export async function upsertLineConfig(
  orgId: string,
  lineUserId: string,
  data: Partial<Omit<LineConfig, 'id' | 'orgId' | 'lineUserId' | 'createdAt' | 'updatedAt'>>,
): Promise<LineConfig> {
  const existing = await getLineConfig(orgId, lineUserId);

  if (existing) {
    await db
      .update(lineConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lineConfigs.id, existing.id));
    return { ...existing, ...data, updatedAt: new Date() };
  }

  const [inserted] = await db
    .insert(lineConfigs)
    .values({
      orgId,
      lineUserId,
      isEnabled: data.isEnabled ?? true,
      notifyOnCostAlert: data.notifyOnCostAlert ?? true,
      notifyOnNightWatch: data.notifyOnNightWatch ?? true,
      notifyOnWeeklyReport: data.notifyOnWeeklyReport ?? true,
      weeklyReportDay: data.weeklyReportDay ?? 1,
      weeklyReportHour: data.weeklyReportHour ?? 9,
    })
    .returning();

  return mapLineConfig(inserted);
}

// ── 配信記録管理 ──

async function recordDelivery(
  orgId: string,
  userId: string,
  lineUserId: string,
  messageType: LineMessageType,
  payload: unknown,
  status: LineDeliveryStatus,
  errorMessage?: string,
) {
  await db.insert(lineDeliveries).values({
    orgId,
    userId,
    lineUserId,
    messageType,
    status,
    flexMessagePayload: payload as Record<string, unknown>,
    errorMessage: errorMessage || null,
    deliveredAt: status === 'delivered' ? new Date() : null,
  });
}

export async function getDeliveryStatus(orgId: string, limit = 50) {
  return db
    .select()
    .from(lineDeliveries)
    .where(eq(lineDeliveries.orgId, orgId))
    .orderBy(desc(lineDeliveries.sentAt))
    .limit(limit);
}

// ── Night-Watch通知 ──

export async function sendNightWatchNotification(
  orgId: string,
  resourceName: string,
  resourceType: string,
  action: 'stopped' | 'started',
  scheduleId?: string,
): Promise<{ sent: number; failed: number }> {
  const configs = await db
    .select()
    .from(lineConfigs)
    .where(and(eq(lineConfigs.orgId, orgId), eq(lineConfigs.isEnabled, true), eq(lineConfigs.notifyOnNightWatch, true)));

  let sent = 0;
  let failed = 0;

  const flex = buildNightWatchNotifyFlex(resourceName, resourceType, action, scheduleId);

  for (const config of configs) {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.lineUserId, config.lineUserId))
      .limit(1);

    const userId = userRows[0]?.id || config.lineUserId;
    const ok = await pushMessage(config.lineUserId, [flex]);

    await recordDelivery(
      orgId, userId, config.lineUserId, 'night_watch_action', flex,
      ok ? 'delivered' : 'failed',
      ok ? undefined : 'Push message failed',
    );

    ok ? sent++ : failed++;
  }

  return { sent, failed };
}

// ── コストアラート通知 ──

export async function sendCostAlert(
  orgId: string,
  resourceName: string,
  currentCostJpy: number,
  thresholdJpy: number,
): Promise<{ sent: number; failed: number }> {
  const configs = await db
    .select()
    .from(lineConfigs)
    .where(and(eq(lineConfigs.orgId, orgId), eq(lineConfigs.isEnabled, true), eq(lineConfigs.notifyOnCostAlert, true)));

  let sent = 0;
  let failed = 0;

  const flex = buildCostAlertFlex(resourceName, currentCostJpy, thresholdJpy);

  for (const config of configs) {
    const userRows = await db.select({ id: users.id }).from(users).where(eq(users.lineUserId, config.lineUserId)).limit(1);
    const userId = userRows[0]?.id || config.lineUserId;
    const ok = await pushMessage(config.lineUserId, [flex]);

    await recordDelivery(orgId, userId, config.lineUserId, 'cost_alert', flex, ok ? 'delivered' : 'failed', ok ? undefined : 'Push message failed');
    ok ? sent++ : failed++;
  }

  return { sent, failed };
}

// ── 週次レポート生成・配信 ──

export async function generateWeeklyReport(orgId: string): Promise<WeeklyReport> {
  const now = dayjs().tz('Asia/Tokyo');
  const periodEnd = now.startOf('day').toDate();
  const periodStart = now.subtract(7, 'day').startOf('day').toDate();
  const prevStart = now.subtract(14, 'day').startOf('day').toDate();

  const currentCosts = await db
    .select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.amountJpy}), 0)` })
    .from(costCarbonHistory)
    .where(between(costCarbonHistory.timestamp, periodStart, periodEnd));

  const prevCosts = await db
    .select({ total: sql<number>`COALESCE(SUM(${costCarbonHistory.amountJpy}), 0)` })
    .from(costCarbonHistory)
    .where(between(costCarbonHistory.timestamp, prevStart, periodStart));

  const totalCostJpy = Number(currentCosts[0]?.total) || 0;
  const previousCostJpy = Number(prevCosts[0]?.total) || 0;
  const costChangePercent = previousCostJpy > 0
    ? ((totalCostJpy - previousCostJpy) / previousCostJpy) * 100
    : 0;

  const resourceRows = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${resources.id})` })
    .from(resources)
    .innerJoin(
      (await import('../../db/schema')).cloudAccounts,
      eq(resources.cloudAccountId, (await import('../../db/schema')).cloudAccounts.id),
    )
    .where(eq((await import('../../db/schema')).cloudAccounts.orgId, orgId));

  const resourceCount = Number(resourceRows[0]?.count) || 0;

  const stopLogs = await db
    .select()
    .from(auditLogs)
    .where(and(
      eq(auditLogs.orgId, orgId),
      eq(auditLogs.action, 'resource.stop'),
      between(auditLogs.createdAt, periodStart, periodEnd),
    ));

  const stoppedHours = stopLogs.length;
  const savingsJpy = stoppedHours * 50;

  const [inserted] = await db.insert(weeklyReports).values({
    orgId,
    periodStart,
    periodEnd,
    totalCostJpy,
    previousCostJpy,
    costChangePercent,
    resourceCount,
    stoppedHours,
    savingsJpy,
    topResources: [],
  }).returning();

  return {
    id: inserted.id,
    orgId,
    periodStart,
    periodEnd,
    totalCostJpy,
    previousCostJpy,
    costChangePercent,
    resourceCount,
    stoppedHours,
    savingsJpy,
    topResources: [],
    generatedAt: inserted.generatedAt,
  };
}

export async function sendWeeklyReport(orgId: string): Promise<{ report: WeeklyReport; sent: number; failed: number }> {
  const report = await generateWeeklyReport(orgId);

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const orgName = org?.name || 'FinOps';
  const flex = buildWeeklyReportFlex(report, orgName);

  const configs = await db
    .select()
    .from(lineConfigs)
    .where(and(eq(lineConfigs.orgId, orgId), eq(lineConfigs.isEnabled, true), eq(lineConfigs.notifyOnWeeklyReport, true)));

  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    const userRows = await db.select({ id: users.id }).from(users).where(eq(users.lineUserId, config.lineUserId)).limit(1);
    const userId = userRows[0]?.id || config.lineUserId;
    const ok = await pushMessage(config.lineUserId, [flex]);

    await recordDelivery(orgId, userId, config.lineUserId, 'weekly_report', flex, ok ? 'delivered' : 'failed', ok ? undefined : 'Push message failed');
    ok ? sent++ : failed++;
  }

  return { report, sent, failed };
}

export async function getWeeklyReports(orgId: string, limit = 12) {
  return db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.orgId, orgId))
    .orderBy(desc(weeklyReports.generatedAt))
    .limit(limit);
}

// ── Webhook処理 ──

export async function handleWebhookEvents(events: WebhookEvent[]): Promise<void> {
  for (const event of events) {
    try {
      if (event.type === 'postback') {
        await handlePostback(event);
      } else if (event.type === 'follow') {
        await handleFollow(event);
      }
    } catch (err) {
      console.error('Webhook event handling error:', err);
    }
  }
}

async function handlePostback(event: WebhookEvent): Promise<void> {
  const params = new URLSearchParams(event.postback?.data || '');
  const action = params.get('action');

  if (action === 'override') {
    const scheduleId = params.get('scheduleId');
    const hours = parseInt(params.get('hours') || '2', 10);
    if (!scheduleId) return;

    const { extendSchedule } = await import('../night-watch/service');
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.lineUserId, event.source.userId))
      .limit(1);

    if (userRows.length === 0) return;

    const result = await extendSchedule(scheduleId, hours, userRows[0].id);
    await replyMessage(event.replyToken, [{
      type: 'text',
      text: `⏰ 残業延長を承認しました。\n延長期限: ${dayjs(result.overrideUntil).tz('Asia/Tokyo').format('HH:mm')} JST`,
    }]);
  }
}

async function handleFollow(event: WebhookEvent): Promise<void> {
  await replyMessage(event.replyToken, [{
    type: 'text',
    text: '🎉 FinOps Platformへようこそ！\n\nダッシュボードからLINE通知の設定ができます。\n\n管理画面: ' +
      (process.env.FRONTEND_URL || 'https://finops.example.com') + '/dashboard/settings',
  }]);
}

// ── Types ──

interface WebhookEvent {
  type: 'message' | 'postback' | 'follow' | 'unfollow';
  replyToken: string;
  source: { type: string; userId: string };
  postback?: { data: string };
  message?: { type: string; text: string };
}

function mapLineConfig(row: typeof lineConfigs.$inferSelect): LineConfig {
  return {
    id: row.id,
    orgId: row.orgId,
    lineUserId: row.lineUserId,
    isEnabled: row.isEnabled,
    notifyOnCostAlert: row.notifyOnCostAlert,
    notifyOnNightWatch: row.notifyOnNightWatch,
    notifyOnWeeklyReport: row.notifyOnWeeklyReport,
    weeklyReportDay: row.weeklyReportDay,
    weeklyReportHour: row.weeklyReportHour,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
