import type { Context, Next } from 'hono';
import { db } from '../db';
import { organizations } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * テナント分離ミドルウェア
 * orgIdの存在確認とプラン制限のチェック
 */
export async function tenantMiddleware(c: Context, next: Next) {
  const user = c.get('user') as { userId: string; orgId: string; role: string } | undefined;

  if (!user?.orgId) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: '組織情報が見つかりません' } },
      403,
    );
  }

  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.orgId))
      .limit(1);

    if (!org) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: '組織が存在しません' } },
        403,
      );
    }

    c.set('org', org);
    await next();
  } catch {
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'テナント検証に失敗しました' } },
      500,
    );
  }
}
