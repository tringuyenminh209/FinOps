import { eq, and, sql, isNull, or, lte } from 'drizzle-orm';
import { EC2Client, StopInstancesCommand, StartInstancesCommand } from '@aws-sdk/client-ec2';
import { RDSClient, StopDBInstanceCommand, StartDBInstanceCommand } from '@aws-sdk/client-rds';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '../../db';
import { resources, schedules, cloudAccounts, auditLogs } from '../../db/schema';
import { assumeRole } from '../cloud-connector/service';
import { DEFAULT_SCHEDULE } from '@finops/shared';

dayjs.extend(utc);
dayjs.extend(timezone);

const JST = 'Asia/Tokyo';

interface DueResource {
  scheduleId: string;
  resourceId: string;
  resourceExternalId: string;
  resourceType: string;
  resourceName: string | null;
  cloudAccountId: string;
  endTimeJst: string;
  overrideUntil: Date | null;
}

function getAwsConfig(region: string) {
  const config: Record<string, unknown> = { region };
  if (process.env.AWS_ENDPOINT_URL) {
    config.endpoint = process.env.AWS_ENDPOINT_URL;
    config.forcePathStyle = true;
  }
  return config;
}

/** スケジュール対象リソースの取得（停止すべきリソース） */
export async function getDueResources(now: Date): Promise<DueResource[]> {
  const jstNow = dayjs(now).tz(JST);
  const currentTime = jstNow.format('HH:mm');
  const currentDow = jstNow.day(); // 0=日, 1=月, ..., 6=土

  // アクティブスケジュールで、現在JSTがend_time以降、
  // リソースがrunning、オーバーライドが無効なものを取得
  const rows = await db
    .select({
      scheduleId: schedules.id,
      resourceId: resources.id,
      resourceExternalId: resources.externalId,
      resourceType: resources.resourceType,
      resourceName: resources.name,
      cloudAccountId: resources.cloudAccountId,
      endTimeJst: schedules.endTimeJst,
      overrideUntil: schedules.overrideUntil,
      daysOfWeek: schedules.daysOfWeek,
    })
    .from(schedules)
    .innerJoin(resources, eq(schedules.resourceId, resources.id))
    .where(
      and(
        eq(schedules.isActive, true),
        eq(resources.status, 'running'),
      ),
    );

  return rows.filter((row) => {
    // 曜日チェック
    const days = (row.daysOfWeek as number[]) || DEFAULT_SCHEDULE.daysOfWeek;
    if (!days.includes(currentDow)) return false;

    // end_time超過チェック
    if (currentTime < row.endTimeJst) return false;

    // オーバーライドチェック: override_untilが未来なら除外
    if (row.overrideUntil && dayjs(row.overrideUntil).isAfter(now)) return false;

    return true;
  }).map(({ daysOfWeek, ...rest }) => rest);
}

/** 起動対象リソースの取得（start_time到達済み） */
export async function getResourcesToStart(now: Date): Promise<DueResource[]> {
  const jstNow = dayjs(now).tz(JST);
  const currentTime = jstNow.format('HH:mm');
  const currentDow = jstNow.day();

  const rows = await db
    .select({
      scheduleId: schedules.id,
      resourceId: resources.id,
      resourceExternalId: resources.externalId,
      resourceType: resources.resourceType,
      resourceName: resources.name,
      cloudAccountId: resources.cloudAccountId,
      endTimeJst: schedules.endTimeJst,
      startTimeJst: schedules.startTimeJst,
      overrideUntil: schedules.overrideUntil,
      daysOfWeek: schedules.daysOfWeek,
    })
    .from(schedules)
    .innerJoin(resources, eq(schedules.resourceId, resources.id))
    .where(
      and(
        eq(schedules.isActive, true),
        eq(resources.status, 'stopped'),
      ),
    );

  return rows.filter((row) => {
    const days = (row.daysOfWeek as number[]) || DEFAULT_SCHEDULE.daysOfWeek;
    if (!days.includes(currentDow)) return false;

    // start_time 〜 end_time の間であれば起動対象
    if (currentTime < row.startTimeJst || currentTime >= row.endTimeJst) return false;

    return true;
  }).map(({ daysOfWeek, startTimeJst, ...rest }) => rest);
}

/** リソース停止実行 */
export async function stopResource(resourceId: string, triggeredBy?: string): Promise<void> {
  // 1. リソースとアカウント情報を取得
  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) throw new Error('リソースが見つかりません');

  const [account] = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, resource.cloudAccountId))
    .limit(1);

  if (!account || !account.arnRole) throw new Error('クラウドアカウント情報が不正です');

  // 2. AssumeRoleで顧客AWSに接続
  const credentials = await assumeRole({
    arnRole: account.arnRole,
    externalId: account.externalId,
    region: account.region,
  });

  const creds = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  // 3. リソースタイプに応じて停止コマンドを実行
  if (resource.resourceType === 'ec2') {
    const ec2 = new EC2Client({ ...getAwsConfig(account.region), credentials: creds });
    await ec2.send(new StopInstancesCommand({ InstanceIds: [resource.externalId] }));
  } else if (resource.resourceType === 'rds') {
    const rds = new RDSClient({ ...getAwsConfig(account.region), credentials: creds });
    await rds.send(new StopDBInstanceCommand({ DBInstanceIdentifier: resource.externalId }));
  } else {
    throw new Error(`未対応のリソースタイプ: ${resource.resourceType}`);
  }

  // 4. DBステータスを更新
  await db
    .update(resources)
    .set({ status: 'stopped' })
    .where(eq(resources.id, resourceId));

  // 5. 監査ログに記録
  await db.insert(auditLogs).values({
    orgId: account.orgId,
    userId: triggeredBy || null,
    action: 'resource.stop',
    targetType: resource.resourceType,
    targetId: resource.externalId,
    details: {
      resourceId,
      trigger: triggeredBy ? 'manual' : 'night-watch',
      timestamp: new Date().toISOString(),
    },
  });
}

/** リソース起動実行 */
export async function startResource(resourceId: string, triggeredBy?: string): Promise<void> {
  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) throw new Error('リソースが見つかりません');

  const [account] = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, resource.cloudAccountId))
    .limit(1);

  if (!account || !account.arnRole) throw new Error('クラウドアカウント情報が不正です');

  const credentials = await assumeRole({
    arnRole: account.arnRole,
    externalId: account.externalId,
    region: account.region,
  });

  const creds = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  if (resource.resourceType === 'ec2') {
    const ec2 = new EC2Client({ ...getAwsConfig(account.region), credentials: creds });
    await ec2.send(new StartInstancesCommand({ InstanceIds: [resource.externalId] }));
  } else if (resource.resourceType === 'rds') {
    const rds = new RDSClient({ ...getAwsConfig(account.region), credentials: creds });
    await rds.send(new StartDBInstanceCommand({ DBInstanceIdentifier: resource.externalId }));
  } else {
    throw new Error(`未対応のリソースタイプ: ${resource.resourceType}`);
  }

  await db
    .update(resources)
    .set({ status: 'running' })
    .where(eq(resources.id, resourceId));

  await db.insert(auditLogs).values({
    orgId: account.orgId,
    userId: triggeredBy || null,
    action: 'resource.start',
    targetType: resource.resourceType,
    targetId: resource.externalId,
    details: {
      resourceId,
      trigger: triggeredBy ? 'manual' : 'night-watch',
      timestamp: new Date().toISOString(),
    },
  });
}

/** 残業延長（Override） */
export async function extendSchedule(
  scheduleId: string,
  hours: number,
  userId: string,
): Promise<{ overrideUntil: Date }> {
  const overrideUntil = dayjs().add(hours, 'hour').toDate();

  const [schedule] = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .limit(1);

  if (!schedule) throw new Error('スケジュールが見つかりません');

  await db
    .update(schedules)
    .set({
      overrideUntil,
      overrideByUser: userId,
      updatedAt: new Date(),
    })
    .where(eq(schedules.id, scheduleId));

  // 監査ログ: 延長操作を記録
  const [resource] = await db
    .select({ cloudAccountId: resources.cloudAccountId })
    .from(resources)
    .where(eq(resources.id, schedule.resourceId))
    .limit(1);

  if (resource) {
    const [account] = await db
      .select({ orgId: cloudAccounts.orgId })
      .from(cloudAccounts)
      .where(eq(cloudAccounts.id, resource.cloudAccountId))
      .limit(1);

    if (account) {
      await db.insert(auditLogs).values({
        orgId: account.orgId,
        userId,
        action: 'schedule.override',
        targetType: 'schedule',
        targetId: scheduleId,
        details: {
          hours,
          overrideUntil: overrideUntil.toISOString(),
        },
      });
    }
  }

  return { overrideUntil };
}

/** Night-Watch実行（メインループ） */
export async function executeNightWatch(): Promise<{ stopped: number; started: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let stopped = 0;
  let started = 0;

  // 停止対象のリソースを取得・実行
  const dueForStop = await getDueResources(now);
  for (const resource of dueForStop) {
    try {
      await stopResource(resource.resourceId);
      stopped++;
      console.log(`Night-Watch: ${resource.resourceExternalId} (${resource.resourceType}) を停止`);
    } catch (err) {
      const msg = `停止失敗 ${resource.resourceExternalId}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`Night-Watch: ${msg}`);
    }
  }

  // 起動対象のリソースを取得・実行
  const dueForStart = await getResourcesToStart(now);
  for (const resource of dueForStart) {
    try {
      await startResource(resource.resourceId);
      started++;
      console.log(`Night-Watch: ${resource.resourceExternalId} (${resource.resourceType}) を起動`);
    } catch (err) {
      const msg = `起動失敗 ${resource.resourceExternalId}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`Night-Watch: ${msg}`);
    }
  }

  return { stopped, started, errors };
}

/** コスト削減実績の計算 */
export async function calculateSavings(orgId: string): Promise<{
  totalSavingsJpy: number;
  totalStoppedHours: number;
  resourceCount: number;
}> {
  // 監査ログからNight-Watch停止回数を集計
  const stopLogs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.orgId, orgId),
        eq(auditLogs.action, 'resource.stop'),
      ),
    );

  // 簡易計算: 停止回数 × 推定コスト削減（平均1時間あたり約50円と仮定）
  const estimatedSavingsPerStop = 50;
  const totalSavingsJpy = stopLogs.length * estimatedSavingsPerStop;

  return {
    totalSavingsJpy,
    totalStoppedHours: stopLogs.length,
    resourceCount: new Set(stopLogs.map((l) => (l.details as Record<string, unknown>)?.resourceId)).size,
  };
}
