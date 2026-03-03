import type { ScheduledEvent } from 'aws-lambda';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { lineConfigs, organizations } from '../../db/schema';
import { sendWeeklyReport } from './service';

dayjs.extend(utc);
dayjs.extend(timezone);

interface CronResult {
  triggered: number;
  succeeded: number;
  failed: number;
  errors: { orgId: string; error: string }[];
}

/**
 * EventBridge Lambda ハンドラー
 * 毎時0分に実行し、weeklyReportDay / weeklyReportHour が現在時刻に一致する組織へ配信
 */
export async function handler(event: ScheduledEvent): Promise<{ statusCode: number; body: string }> {
  console.log('LINE 週次レポート cron 実行開始', JSON.stringify(event));

  try {
    const result = await executeWeeklyCron();

    console.log(
      `週次レポート cron 完了: ${result.triggered}件対象, ${result.succeeded}件成功, ${result.failed}件失敗`,
    );

    if (result.errors.length > 0) {
      console.warn('週次レポート cron エラー:', result.errors);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('週次レポート cron 実行失敗:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
    };
  }
}

export async function executeWeeklyCron(): Promise<CronResult> {
  const now = dayjs().tz('Asia/Tokyo');
  const currentDay = now.day();   // 0=日, 1=月, ...
  const currentHour = now.hour();

  const matchingConfigs = await db
    .select({
      orgId: lineConfigs.orgId,
    })
    .from(lineConfigs)
    .where(
      and(
        eq(lineConfigs.isEnabled, true),
        eq(lineConfigs.notifyOnWeeklyReport, true),
        eq(lineConfigs.weeklyReportDay, currentDay),
        eq(lineConfigs.weeklyReportHour, currentHour),
      ),
    )
    .groupBy(lineConfigs.orgId);

  const orgIds = [...new Set(matchingConfigs.map((c) => c.orgId))];

  const result: CronResult = {
    triggered: orgIds.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const orgId of orgIds) {
    try {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        result.errors.push({ orgId, error: '組織が見つかりません' });
        result.failed++;
        continue;
      }

      const { sent, failed } = await sendWeeklyReport(orgId);
      console.log(`orgId=${orgId}: ${sent}件配信成功, ${failed}件失敗`);

      if (failed > 0 && sent === 0) {
        result.failed++;
        result.errors.push({ orgId, error: `全${failed}件の配信に失敗` });
      } else {
        result.succeeded++;
      }
    } catch (err) {
      result.failed++;
      result.errors.push({
        orgId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return result;
}
