import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { schedules, resources, cloudAccounts } from '../../db/schema';
import { authMiddleware, type AuthUser } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import type { AppEnv } from '../../types';
import {
  extendSchedule,
  executeNightWatch,
  calculateSavings,
} from './service';
import type { ApiResponse } from '@finops/shared';

const createScheduleSchema = z.object({
  resourceId: z.string().uuid('リソースIDの形式が不正です'),
  startTimeJst: z.string().regex(/^\d{2}:\d{2}$/, '時刻はHH:mm形式で指定してください').default('09:00'),
  endTimeJst: z.string().regex(/^\d{2}:\d{2}$/, '時刻はHH:mm形式で指定してください').default('18:00'),
  daysOfWeek: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
});

const updateScheduleSchema = z.object({
  startTimeJst: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTimeJst: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  isActive: z.boolean().optional(),
});

const overrideSchema = z.object({
  hours: z.number().min(0.5).max(12, '延長は最大12時間までです').default(2),
});

const app = new Hono<AppEnv>();

app.use('*', authMiddleware);
app.use('*', tenantMiddleware);

/** GET /schedules → 組織のスケジュール一覧 */
app.get('/schedules', async (c) => {
  const user = c.get('user') as AuthUser;

  try {
    // 組織のアカウントに紐づくリソースのスケジュールを取得
    const orgAccounts = await db
      .select({ id: cloudAccounts.id })
      .from(cloudAccounts)
      .where(eq(cloudAccounts.orgId, user.orgId));

    if (orgAccounts.length === 0) {
      const res: ApiResponse = { success: true, data: [] };
      return c.json(res);
    }

    const accountIds = orgAccounts.map((a) => a.id);

    const orgResources = await db
      .select({ id: resources.id })
      .from(resources)
      .where(inArray(resources.cloudAccountId, accountIds));

    if (orgResources.length === 0) {
      const res: ApiResponse = { success: true, data: [] };
      return c.json(res);
    }

    const resourceIds = orgResources.map((r) => r.id);

    const scheduleList = await db
      .select({
        schedule: schedules,
        resourceName: resources.name,
        resourceType: resources.resourceType,
        resourceExternalId: resources.externalId,
        resourceStatus: resources.status,
      })
      .from(schedules)
      .innerJoin(resources, eq(schedules.resourceId, resources.id))
      .where(inArray(schedules.resourceId, resourceIds));

    const res: ApiResponse = { success: true, data: scheduleList };
    return c.json(res);
  } catch (err) {
    console.error('スケジュール一覧取得エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'スケジュール一覧の取得に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** POST /schedules → スケジュール作成 */
app.post('/schedules', zValidator('json', createScheduleSchema), async (c) => {
  const user = c.get('user') as AuthUser;
  const body = c.req.valid('json');

  try {
    // リソースの所有権チェック
    const [resource] = await db
      .select({
        id: resources.id,
        cloudAccountId: resources.cloudAccountId,
      })
      .from(resources)
      .where(eq(resources.id, body.resourceId))
      .limit(1);

    if (!resource) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'リソースが見つかりません' },
      };
      return c.json(res, 404);
    }

    // アカウント所有権チェック
    const [account] = await db
      .select()
      .from(cloudAccounts)
      .where(
        and(
          eq(cloudAccounts.id, resource.cloudAccountId),
          eq(cloudAccounts.orgId, user.orgId),
        ),
      )
      .limit(1);

    if (!account) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'FORBIDDEN', message: 'このリソースへのアクセス権がありません' },
      };
      return c.json(res, 403);
    }

    // 既存スケジュールの重複チェック
    const [existing] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.resourceId, body.resourceId),
          eq(schedules.isActive, true),
        ),
      )
      .limit(1);

    if (existing) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'DUPLICATE', message: 'このリソースには既にアクティブなスケジュールがあります' },
      };
      return c.json(res, 409);
    }

    const [schedule] = await db
      .insert(schedules)
      .values({
        resourceId: body.resourceId,
        startTimeJst: body.startTimeJst,
        endTimeJst: body.endTimeJst,
        daysOfWeek: body.daysOfWeek,
      })
      .returning();

    const res: ApiResponse = { success: true, data: schedule };
    return c.json(res, 201);
  } catch (err) {
    console.error('スケジュール作成エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'CREATE_FAILED', message: 'スケジュールの作成に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** PUT /schedules/:id → スケジュール更新 */
app.put('/schedules/:id', zValidator('json', updateScheduleSchema), async (c) => {
  const user = c.get('user') as AuthUser;
  const scheduleId = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'スケジュールが見つかりません' },
      };
      return c.json(res, 404);
    }

    // リソース → アカウント → 組織のチェーンで所有権検証
    const ownerCheck = await db
      .select({ orgId: cloudAccounts.orgId })
      .from(resources)
      .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
      .where(eq(resources.id, schedule.resourceId))
      .limit(1);

    if (!ownerCheck.length || ownerCheck[0].orgId !== user.orgId) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'FORBIDDEN', message: 'このスケジュールへのアクセス権がありません' },
      };
      return c.json(res, 403);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.startTimeJst !== undefined) updateData.startTimeJst = body.startTimeJst;
    if (body.endTimeJst !== undefined) updateData.endTimeJst = body.endTimeJst;
    if (body.daysOfWeek !== undefined) updateData.daysOfWeek = body.daysOfWeek;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db
      .update(schedules)
      .set(updateData)
      .where(eq(schedules.id, scheduleId))
      .returning();

    const res: ApiResponse = { success: true, data: updated };
    return c.json(res);
  } catch (err) {
    console.error('スケジュール更新エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'スケジュールの更新に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** POST /schedules/:id/override → 残業延長 */
app.post('/schedules/:id/override', zValidator('json', overrideSchema), async (c) => {
  const user = c.get('user') as AuthUser;
  const scheduleId = c.req.param('id');
  const { hours } = c.req.valid('json');

  try {
    // 所有権チェック
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'スケジュールが見つかりません' },
      };
      return c.json(res, 404);
    }

    const ownerCheck = await db
      .select({ orgId: cloudAccounts.orgId })
      .from(resources)
      .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
      .where(eq(resources.id, schedule.resourceId))
      .limit(1);

    if (!ownerCheck.length || ownerCheck[0].orgId !== user.orgId) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'FORBIDDEN', message: 'このスケジュールへのアクセス権がありません' },
      };
      return c.json(res, 403);
    }

    const result = await extendSchedule(scheduleId, hours, user.userId);

    const res: ApiResponse = {
      success: true,
      data: {
        message: `スケジュールを${hours}時間延長しました`,
        overrideUntil: result.overrideUntil,
      },
    };
    return c.json(res);
  } catch (err) {
    console.error('スケジュール延長エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'OVERRIDE_FAILED', message: 'スケジュール延長に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** DELETE /schedules/:id → スケジュール無効化 */
app.delete('/schedules/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const scheduleId = c.req.param('id');

  try {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'スケジュールが見つかりません' },
      };
      return c.json(res, 404);
    }

    const ownerCheck = await db
      .select({ orgId: cloudAccounts.orgId })
      .from(resources)
      .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
      .where(eq(resources.id, schedule.resourceId))
      .limit(1);

    if (!ownerCheck.length || ownerCheck[0].orgId !== user.orgId) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'FORBIDDEN', message: 'このスケジュールへのアクセス権がありません' },
      };
      return c.json(res, 403);
    }

    await db
      .update(schedules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schedules.id, scheduleId));

    const res: ApiResponse = {
      success: true,
      data: { message: 'スケジュールを無効化しました' },
    };
    return c.json(res);
  } catch (err) {
    console.error('スケジュール無効化エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'DELETE_FAILED', message: 'スケジュールの無効化に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** POST /execute → Night-Watch手動実行 */
app.post('/execute', async (c) => {
  const user = c.get('user') as AuthUser;

  if (user.role !== 'admin') {
    const res: ApiResponse = {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Night-Watch実行にはadmin権限が必要です' },
    };
    return c.json(res, 403);
  }

  try {
    const result = await executeNightWatch();

    const res: ApiResponse = {
      success: true,
      data: {
        message: `Night-Watch完了: ${result.stopped}台停止, ${result.started}台起動`,
        ...result,
      },
    };
    return c.json(res);
  } catch (err) {
    console.error('Night-Watch実行エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'EXECUTE_FAILED', message: 'Night-Watch実行に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** GET /savings → Night-Watchによるコスト削減実績 */
app.get('/savings', async (c) => {
  const user = c.get('user') as AuthUser;

  try {
    const savings = await calculateSavings(user.orgId);

    const res: ApiResponse = { success: true, data: savings };
    return c.json(res);
  } catch (err) {
    console.error('コスト削減実績取得エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'コスト削減実績の取得に失敗しました' },
    };
    return c.json(res, 500);
  }
});

export const nightWatchRoutes = app;
