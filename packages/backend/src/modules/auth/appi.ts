// APPI（個人情報保護法）コンプライアンスユーティリティ
// 同意管理、データアクセス権、削除権への対応
import { sql } from 'drizzle-orm';
import { db } from '../../db';

// ── 同意目的の型定義 ──
export type ConsentPurpose =
  | 'data_collection'     // データ収集
  | 'analytics'           // 分析利用
  | 'marketing'           // マーケティング
  | 'third_party_sharing' // 第三者提供
  | 'ai_processing';      // AI処理

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: Date;
  revokedAt: Date | null;
  ipAddress: string | null;
}

// ── 同意記録 ──
// ユーザーの同意状況をデータベースに記録
export async function recordConsent(
  userId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  ipAddress?: string,
): Promise<void> {
  if (granted) {
    // 既存の同意を失効させてから新規記録
    await db.execute(
      sql`UPDATE consent_records
          SET revoked_at = NOW()
          WHERE user_id = ${userId}
            AND purpose = ${purpose}
            AND revoked_at IS NULL`,
    );

    await db.execute(
      sql`INSERT INTO consent_records (user_id, purpose, granted, granted_at, ip_address)
          VALUES (${userId}, ${purpose}, true, NOW(), ${ipAddress ?? null})`,
    );
  } else {
    await revokeConsent(userId, purpose);
  }
}

// ── 同意確認 ──
// 特定目的に対する有効な同意が存在するか確認
export async function checkConsent(
  userId: string,
  purpose: ConsentPurpose,
): Promise<boolean> {
  const rows = await db.execute<{ granted: boolean }>(
    sql`SELECT granted FROM consent_records
        WHERE user_id = ${userId}
          AND purpose = ${purpose}
          AND revoked_at IS NULL
          AND granted = true
        ORDER BY granted_at DESC
        LIMIT 1`,
  );

  return rows.length > 0 && rows[0].granted === true;
}

// ── 同意取消 ──
export async function revokeConsent(
  userId: string,
  purpose: ConsentPurpose,
): Promise<void> {
  await db.execute(
    sql`UPDATE consent_records
        SET revoked_at = NOW(), granted = false
        WHERE user_id = ${userId}
          AND purpose = ${purpose}
          AND revoked_at IS NULL`,
  );
}

// ── 全同意状況取得 ──
export async function getAllConsents(
  userId: string,
): Promise<Array<{ purpose: ConsentPurpose; granted: boolean; grantedAt: Date }>> {
  const rows = await db.execute<{
    purpose: ConsentPurpose;
    granted: boolean;
    granted_at: Date;
  }>(
    sql`SELECT purpose, granted, granted_at
        FROM consent_records
        WHERE user_id = ${userId}
          AND revoked_at IS NULL
        ORDER BY granted_at DESC`,
  );

  return rows.map((r) => ({
    purpose: r.purpose,
    granted: r.granted,
    grantedAt: r.granted_at,
  }));
}

// ── プライバシーレポート生成（アクセス権） ──
// APPI 第28条 — 本人がデータの開示を請求できる権利
export async function generatePrivacyReport(userId: string): Promise<{
  user: Record<string, unknown> | null;
  consents: Array<{ purpose: string; granted: boolean; grantedAt: Date }>;
  notifications: number;
  optimizations: number;
  exportedAt: Date;
}> {
  // ユーザー基本情報
  const userRows = await db.execute<Record<string, unknown>>(
    sql`SELECT id, org_id, email, display_name, line_user_id, is_active, preferences, last_login_at, created_at
        FROM users WHERE id = ${userId}`,
  );

  // 同意履歴（取消済みも含む全履歴）
  const consentRows = await db.execute<{
    purpose: string;
    granted: boolean;
    granted_at: Date;
    revoked_at: Date | null;
  }>(
    sql`SELECT purpose, granted, granted_at, revoked_at
        FROM consent_records
        WHERE user_id = ${userId}
        ORDER BY granted_at DESC`,
  );

  // 通知件数
  const notifCount = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = ${userId}`,
  );

  // 最適化提案件数（ユーザーのリソースに関連）
  const optCount = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count
        FROM optimizations o
        JOIN resources r ON o.resource_id = r.id
        JOIN cloud_accounts ca ON r.cloud_account_id = ca.id
        JOIN users u ON ca.org_id = u.org_id
        WHERE u.id = ${userId}`,
  );

  return {
    user: userRows.length > 0 ? userRows[0] : null,
    consents: consentRows.map((r) => ({
      purpose: r.purpose,
      granted: r.granted,
      grantedAt: r.granted_at,
    })),
    notifications: parseInt(notifCount[0]?.count ?? '0', 10),
    optimizations: parseInt(optCount[0]?.count ?? '0', 10),
    exportedAt: new Date(),
  };
}

// ── ユーザーデータ削除（削除権） ──
// APPI 第30条 — 本人がデータの削除を請求できる権利
// 関連データを論理削除 + 個人情報を匿名化
export async function deleteUserData(userId: string): Promise<{
  deletedRecords: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  // 1. 同意記録を全て取消
  const consentResult = await db.execute(
    sql`UPDATE consent_records SET revoked_at = NOW(), granted = false WHERE user_id = ${userId} AND revoked_at IS NULL`,
  );
  results.consents = Number(consentResult.count ?? 0);

  // 2. 通知を匿名化
  const notifResult = await db.execute(
    sql`UPDATE notifications SET user_id = 'deleted', metadata = '{}'::jsonb WHERE user_id = ${userId}`,
  );
  results.notifications = Number(notifResult.count ?? 0);

  // 3. ユーザー情報を匿名化（物理削除ではなく匿名化で監査証跡を保持）
  await db.execute(
    sql`UPDATE users
        SET display_name = '削除済みユーザー',
            email = NULL,
            line_user_id = NULL,
            is_active = false,
            preferences = '{"lang":"ja","tz":"Asia/Tokyo"}'::jsonb
        WHERE id = ${userId}`,
  );
  results.user = 1;

  return { deletedRecords: results };
}
