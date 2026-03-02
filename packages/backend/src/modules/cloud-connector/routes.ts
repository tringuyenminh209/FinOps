import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { cloudAccounts, resources } from '../../db/schema';
import { authMiddleware, type AuthUser } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { scanAllResources } from './service';
import { PLAN_LIMITS, type ApiResponse } from '@finops/shared';

const createAccountSchema = z.object({
  provider: z.enum(['aws', 'azure']).default('aws'),
  arnRole: z.string().min(20, 'ARN Role は必須です'),
  externalId: z.string().min(1, 'External ID は必須です'),
  region: z.string().default('ap-northeast-1'),
  accountAlias: z.string().optional(),
});

const app = new Hono();

app.use('*', authMiddleware);
app.use('*', tenantMiddleware);

/** POST / → クラウドアカウント新規登録 */
app.post('/', zValidator('json', createAccountSchema), async (c) => {
  const user = c.get('user') as AuthUser;
  const org = c.get('org') as { id: string; planType: string };
  const body = c.req.valid('json');

  try {
    // プラン制限チェック
    const planKey = org.planType as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

    const existingAccounts = await db
      .select()
      .from(cloudAccounts)
      .where(and(eq(cloudAccounts.orgId, user.orgId), eq(cloudAccounts.isActive, true)));

    if (existingAccounts.length >= limits.maxCloudAccounts) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'PLAN_LIMIT', message: `現在のプランではクラウドアカウントは${limits.maxCloudAccounts}個までです` },
      };
      return c.json(res, 403);
    }

    const [account] = await db
      .insert(cloudAccounts)
      .values({
        orgId: user.orgId,
        provider: body.provider,
        arnRole: body.arnRole,
        externalId: body.externalId,
        region: body.region,
        accountAlias: body.accountAlias || null,
      })
      .returning();

    const res: ApiResponse = { success: true, data: account };
    return c.json(res, 201);
  } catch (err) {
    console.error('クラウドアカウント作成エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'CREATE_FAILED', message: 'クラウドアカウントの作成に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** GET / → 組織のクラウドアカウント一覧 */
app.get('/', async (c) => {
  const user = c.get('user') as AuthUser;

  try {
    const accounts = await db
      .select()
      .from(cloudAccounts)
      .where(and(eq(cloudAccounts.orgId, user.orgId), eq(cloudAccounts.isActive, true)));

    const res: ApiResponse = { success: true, data: accounts };
    return c.json(res);
  } catch (err) {
    console.error('アカウント一覧取得エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'アカウント一覧の取得に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** GET /:id → アカウント詳細 */
app.get('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const accountId = c.req.param('id');

  try {
    const [account] = await db
      .select()
      .from(cloudAccounts)
      .where(
        and(
          eq(cloudAccounts.id, accountId),
          eq(cloudAccounts.orgId, user.orgId),
          eq(cloudAccounts.isActive, true),
        ),
      )
      .limit(1);

    if (!account) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'クラウドアカウントが見つかりません' },
      };
      return c.json(res, 404);
    }

    const res: ApiResponse = { success: true, data: account };
    return c.json(res);
  } catch (err) {
    console.error('アカウント詳細取得エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'アカウント詳細の取得に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** GET /:id/resources → アカウントのリソース一覧 */
app.get('/:id/resources', async (c) => {
  const user = c.get('user') as AuthUser;
  const accountId = c.req.param('id');

  try {
    // 所有権チェック
    const [account] = await db
      .select()
      .from(cloudAccounts)
      .where(
        and(
          eq(cloudAccounts.id, accountId),
          eq(cloudAccounts.orgId, user.orgId),
        ),
      )
      .limit(1);

    if (!account) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'クラウドアカウントが見つかりません' },
      };
      return c.json(res, 404);
    }

    const resourceList = await db
      .select()
      .from(resources)
      .where(eq(resources.cloudAccountId, accountId));

    const res: ApiResponse = {
      success: true,
      data: resourceList,
      meta: { page: 1, total: resourceList.length, limit: resourceList.length },
    };
    return c.json(res);
  } catch (err) {
    console.error('リソース一覧取得エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'リソース一覧の取得に失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** POST /:id/scan → 手動スキャン実行 */
app.post('/:id/scan', async (c) => {
  const user = c.get('user') as AuthUser;
  const accountId = c.req.param('id');

  try {
    // 所有権チェック
    const [account] = await db
      .select()
      .from(cloudAccounts)
      .where(
        and(
          eq(cloudAccounts.id, accountId),
          eq(cloudAccounts.orgId, user.orgId),
          eq(cloudAccounts.isActive, true),
        ),
      )
      .limit(1);

    if (!account) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'クラウドアカウントが見つかりません' },
      };
      return c.json(res, 404);
    }

    const result = await scanAllResources(accountId);

    const res: ApiResponse = {
      success: true,
      data: { message: `スキャン完了: ${result.scanned}個のリソースを検出`, ...result },
    };
    return c.json(res);
  } catch (err) {
    console.error('スキャン実行エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'SCAN_FAILED', message: 'リソーススキャンに失敗しました' },
    };
    return c.json(res, 500);
  }
});

/** DELETE /:id → アカウント無効化（ソフトデリート） */
app.delete('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const accountId = c.req.param('id');

  // admin権限チェック
  if (user.role !== 'admin') {
    const res: ApiResponse = {
      success: false,
      error: { code: 'FORBIDDEN', message: 'アカウント削除にはadmin権限が必要です' },
    };
    return c.json(res, 403);
  }

  try {
    const [account] = await db
      .select()
      .from(cloudAccounts)
      .where(
        and(
          eq(cloudAccounts.id, accountId),
          eq(cloudAccounts.orgId, user.orgId),
          eq(cloudAccounts.isActive, true),
        ),
      )
      .limit(1);

    if (!account) {
      const res: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'クラウドアカウントが見つかりません' },
      };
      return c.json(res, 404);
    }

    await db
      .update(cloudAccounts)
      .set({ isActive: false })
      .where(eq(cloudAccounts.id, accountId));

    const res: ApiResponse = {
      success: true,
      data: { message: 'クラウドアカウントを無効化しました' },
    };
    return c.json(res);
  } catch (err) {
    console.error('アカウント無効化エラー:', err);
    const res: ApiResponse = {
      success: false,
      error: { code: 'DELETE_FAILED', message: 'アカウントの無効化に失敗しました' },
    };
    return c.json(res, 500);
  }
});

export const cloudConnectorRoutes = app;
