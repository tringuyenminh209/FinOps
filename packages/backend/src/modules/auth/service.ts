// 認証サービス — LINE認証、JWT管理、ユーザー管理
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { createJwt, verifyJwt } from '../../middleware/auth';
import type { AuthUser, JwtPayload } from '../../middleware/auth';
import type { User } from '@finops/shared';

// ── LINE プロフィール型定義 ──
export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// ── LINE トークン検証 ──
// LINE Profile API を呼び出してアクセストークンの有効性を確認
export async function verifyLineToken(accessToken: string): Promise<LineProfile> {
  const res = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AuthError('LINE_TOKEN_INVALID', `LINEトークンの検証に失敗しました: ${body}`);
  }

  return res.json() as Promise<LineProfile>;
}

// ── LINE Authorization Code → Access Token 交換 ──
export async function exchangeLineCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env.LINE_CLIENT_ID || process.env.NEXT_PUBLIC_LINE_CLIENT_ID || '';
  const clientSecret = process.env.LINE_CLIENT_SECRET || '';

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AuthError('LINE_CODE_EXCHANGE_FAILED', `LINE認可コードの交換に失敗しました: ${body}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ── JWT 生成 ──
export function generateJwt(payload: { userId: string; orgId: string; role: AuthUser['role'] }): string {
  return createJwt(payload);
}

// ── JWT リフレッシュ用トークン生成（有効期限7日） ──
export function generateRefreshToken(payload: { userId: string; orgId: string; role: AuthUser['role'] }): string {
  return createJwt(payload, 60 * 60 * 24 * 7);
}

// ── JWT 検証（re-export） ──
export { verifyJwt } from '../../middleware/auth';

// ── ユーザー検索・作成 ──
// LINE プロフィールを基にユーザーを検索、なければ新規作成
export async function findOrCreateUser(
  lineProfile: LineProfile,
  orgId?: string,
): Promise<Pick<User, 'id' | 'orgId' | 'role' | 'displayName' | 'lineUserId'>> {
  // 既存ユーザー検索
  const existing = await db.execute<{
    id: string;
    org_id: string;
    role: AuthUser['role'];
    display_name: string | null;
    line_user_id: string | null;
  }>(
    sql`SELECT id, org_id, role, display_name, line_user_id
        FROM users
        WHERE line_user_id = ${lineProfile.userId}
        LIMIT 1`,
  );

  if (existing.length > 0) {
    const row = existing[0];
    // 最終ログイン日時を更新
    await db.execute(
      sql`UPDATE users SET last_login_at = NOW(), display_name = ${lineProfile.displayName} WHERE id = ${row.id}`,
    );
    return {
      id: row.id,
      orgId: row.org_id,
      role: row.role,
      displayName: row.display_name,
      lineUserId: row.line_user_id,
    };
  }

  // 新規ユーザー作成（組織が指定されていない場合は個人組織を自動生成）
  const targetOrgId = orgId ?? await createPersonalOrg(lineProfile.displayName);

  const inserted = await db.execute<{ id: string }>(
    sql`INSERT INTO users (org_id, line_user_id, display_name, role, is_active, preferences, last_login_at, created_at)
        VALUES (${targetOrgId}, ${lineProfile.userId}, ${lineProfile.displayName}, 'admin', true, '{"lang":"ja","tz":"Asia/Tokyo"}'::jsonb, NOW(), NOW())
        RETURNING id`,
  );

  return {
    id: inserted[0].id,
    orgId: targetOrgId,
    role: 'admin',
    displayName: lineProfile.displayName,
    lineUserId: lineProfile.userId,
  };
}

// ── 個人組織の自動作成 ──
async function createPersonalOrg(displayName: string): Promise<string> {
  const result = await db.execute<{ id: string }>(
    sql`INSERT INTO organizations (name, plan_type, payment_method, settings, created_at, updated_at)
        VALUES (${`${displayName}の組織`}, 'free', 'stripe', '{}'::jsonb, NOW(), NOW())
        RETURNING id`,
  );
  return result[0].id;
}

// ── ユーザー取得 ──
export async function getUserById(userId: string): Promise<Pick<User, 'id' | 'orgId' | 'role' | 'displayName' | 'email' | 'lineUserId' | 'isActive'> | null> {
  const rows = await db.execute<{
    id: string;
    org_id: string;
    role: AuthUser['role'];
    display_name: string | null;
    email: string | null;
    line_user_id: string | null;
    is_active: boolean;
  }>(
    sql`SELECT id, org_id, role, display_name, email, line_user_id, is_active
        FROM users WHERE id = ${userId}`,
  );

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    orgId: row.org_id,
    role: row.role,
    displayName: row.display_name,
    email: row.email,
    lineUserId: row.line_user_id,
    isActive: row.is_active,
  };
}

// ── 認証エラークラス ──
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ── パスワードハッシュ ──
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashBuf = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  return hashBuf.length === derived.length && timingSafeEqual(hashBuf, derived);
}

// ── メール登録 ──
export async function registerWithEmail(data: {
  email: string;
  password: string;
  displayName: string;
  orgName: string;
}): Promise<Pick<User, 'id' | 'orgId' | 'role' | 'displayName' | 'email'>> {
  // メール重複チェック
  const existing = await db.execute<{ id: string }>(
    sql`SELECT id FROM users WHERE email = ${data.email} LIMIT 1`,
  );
  if (existing.length > 0) {
    throw new AuthError('EMAIL_TAKEN', 'このメールアドレスはすでに使用されています');
  }

  // 組織作成
  const orgResult = await db.execute<{ id: string }>(
    sql`INSERT INTO organizations (name, plan_type, payment_method, settings, created_at, updated_at)
        VALUES (${data.orgName}, 'free', 'stripe', '{}'::jsonb, NOW(), NOW())
        RETURNING id`,
  );
  const orgId = orgResult[0].id;

  // ユーザー作成
  const passwordHash = hashPassword(data.password);
  const userResult = await db.execute<{ id: string }>(
    sql`INSERT INTO users (org_id, email, password_hash, display_name, role, is_active, preferences, last_login_at, created_at)
        VALUES (${orgId}, ${data.email}, ${passwordHash}, ${data.displayName}, 'admin', true, '{"lang":"ja","tz":"Asia/Tokyo"}'::jsonb, NOW(), NOW())
        RETURNING id`,
  );

  return {
    id: userResult[0].id,
    orgId,
    role: 'admin',
    displayName: data.displayName,
    email: data.email,
  };
}

// ── メールログイン ──
export async function loginWithEmail(email: string, password: string): Promise<Pick<User, 'id' | 'orgId' | 'role' | 'displayName' | 'email'>> {
  const rows = await db.execute<{
    id: string;
    org_id: string;
    role: AuthUser['role'];
    display_name: string | null;
    password_hash: string | null;
    is_active: boolean;
  }>(
    sql`SELECT id, org_id, role, display_name, password_hash, is_active
        FROM users WHERE email = ${email} LIMIT 1`,
  );

  if (rows.length === 0) {
    throw new AuthError('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません');
  }

  const user = rows[0];
  if (!user.is_active) {
    throw new AuthError('USER_DISABLED', 'アカウントが無効です');
  }
  if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
    throw new AuthError('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません');
  }

  await db.execute(sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`);

  return {
    id: user.id,
    orgId: user.org_id,
    role: user.role,
    displayName: user.display_name,
    email,
  };
}
