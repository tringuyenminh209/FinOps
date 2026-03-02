import type { Context, Next } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'finops-dev-secret-change-in-production';
const JWT_EXPIRY = 60 * 60; // 1 hour default

// ── Types ──
export interface AuthUser {
  userId: string;
  orgId: string;
  role: 'admin' | 'viewer' | 'operator';
}

export interface JwtPayload {
  sub: string;
  org_id: string;
  role: AuthUser['role'];
  iat: number;
  exp: number;
}

// ── JWT 生成 ──
export function createJwt(
  payload: { userId: string; orgId: string; role: AuthUser['role'] },
  expiresInSec: number = JWT_EXPIRY,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body: JwtPayload = {
    sub: payload.userId,
    org_id: payload.orgId,
    role: payload.role,
    iat: now,
    exp: now + expiresInSec,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Body = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${b64Header}.${b64Body}`)
    .digest('base64url');

  return `${b64Header}.${b64Body}.${signature}`;
}

// ── JWT 検証 ──
export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [b64Header, b64Body, signature] = parts;

    // Verify signature
    const expected = createHmac('sha256', JWT_SECRET)
      .update(`${b64Header}.${b64Body}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    // Decode and check expiry
    const payload = JSON.parse(Buffer.from(b64Body, 'base64url').toString('utf-8')) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ── JWT認証ミドルウェア ──
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '認証トークンが必要です' } },
      401,
    );
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);

  if (!payload) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '無効なトークンです' } },
      401,
    );
  }

  const user: AuthUser = {
    userId: payload.sub,
    orgId: payload.org_id,
    role: payload.role || 'viewer',
  };

  c.set('user', user);
  await next();
}

// ── ロールベースアクセス制御 ──
export function requireRole(...allowedRoles: AuthUser['role'][]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!user) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        401,
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: '権限が不足しています' } },
        403,
      );
    }

    await next();
  };
}
