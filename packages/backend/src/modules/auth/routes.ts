// 認証ルート — LINE Login、トークンリフレッシュ、プロフィール取得
import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import type { AuthUser } from '../../middleware/auth';
import {
  verifyLineToken,
  exchangeLineCode,
  findOrCreateUser,
  generateJwt,
  generateRefreshToken,
  verifyJwt,
  getUserById,
  registerWithEmail,
  loginWithEmail,
  AuthError,
} from './service';

type AuthEnv = { Variables: { user: AuthUser } };

export const authRoutes = new Hono<AuthEnv>();

// ── POST /line-login ──
// LINEアクセストークンを受け取り、JWT を返す
authRoutes.post('/line-login', async (c) => {
  try {
    const body = await c.req.json<{ accessToken: string; orgId?: string }>();

    if (!body.accessToken) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'アクセストークンが必要です' } },
        400,
      );
    }

    // LINE API でトークン検証 → プロフィール取得
    const lineProfile = await verifyLineToken(body.accessToken);

    // ユーザー検索または新規作成
    const user = await findOrCreateUser(lineProfile, body.orgId);

    // JWT 発行
    const token = generateJwt({ userId: user.id, orgId: user.orgId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, orgId: user.orgId, role: user.role });

    return c.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          orgId: user.orgId,
          role: user.role,
          displayName: user.displayName,
        },
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { success: false, error: { code: err.code, message: err.message } },
        401,
      );
    }
    console.error('LINE login error:', err);
    return c.json(
      { success: false, error: { code: 'AUTH_FAILED', message: '認証処理中にエラーが発生しました' } },
      500,
    );
  }
});

// ── POST /line-callback ──
// LINE認可コードをアクセストークンに交換し、JWT を返す
authRoutes.post('/line-callback', async (c) => {
  try {
    const body = await c.req.json<{ code: string; redirectUri: string; orgId?: string }>();

    if (!body.code || !body.redirectUri) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '認可コードとリダイレクトURIが必要です' } },
        400,
      );
    }

    const accessToken = await exchangeLineCode(body.code, body.redirectUri);
    const lineProfile = await verifyLineToken(accessToken);
    const user = await findOrCreateUser(lineProfile, body.orgId);

    const token = generateJwt({ userId: user.id, orgId: user.orgId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, orgId: user.orgId, role: user.role });

    return c.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          orgId: user.orgId,
          role: user.role,
          displayName: user.displayName,
        },
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { success: false, error: { code: err.code, message: err.message } },
        401,
      );
    }
    console.error('LINE callback error:', err);
    return c.json(
      { success: false, error: { code: 'AUTH_FAILED', message: 'LINE認証処理中にエラーが発生しました' } },
      500,
    );
  }
});

// ── POST /refresh ──
// リフレッシュトークンで新しい JWT を発行
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json<{ refreshToken: string }>();

    if (!body.refreshToken) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'リフレッシュトークンが必要です' } },
        400,
      );
    }

    const payload = verifyJwt(body.refreshToken);
    if (!payload) {
      return c.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'リフレッシュトークンが無効または期限切れです' } },
        401,
      );
    }

    // ユーザーがまだ有効か確認
    const user = await getUserById(payload.sub);
    if (!user || !user.isActive) {
      return c.json(
        { success: false, error: { code: 'USER_DISABLED', message: 'ユーザーアカウントが無効です' } },
        403,
      );
    }

    const token = generateJwt({ userId: user.id, orgId: user.orgId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, orgId: user.orgId, role: user.role });

    return c.json({
      success: true,
      data: { token, refreshToken },
    });
  } catch {
    return c.json(
      { success: false, error: { code: 'REFRESH_FAILED', message: 'トークン更新に失敗しました' } },
      500,
    );
  }
});

// ── POST /register ──
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string; displayName: string; orgName: string }>();

    if (!body.email || !body.password || !body.displayName || !body.orgName) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '必須項目が不足しています' } },
        400,
      );
    }
    if (body.password.length < 8) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'パスワードは8文字以上で設定してください' } },
        400,
      );
    }

    const user = await registerWithEmail(body);
    const token = generateJwt({ userId: user.id, orgId: user.orgId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, orgId: user.orgId, role: user.role });

    return c.json({ success: true, data: { token, refreshToken, user } }, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 409);
    }
    console.error('Register error:', err);
    return c.json({ success: false, error: { code: 'REGISTER_FAILED', message: '登録処理中にエラーが発生しました' } }, 500);
  }
});

// ── POST /login ──
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();

    if (!body.email || !body.password) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'メールアドレスとパスワードが必要です' } },
        400,
      );
    }

    const user = await loginWithEmail(body.email, body.password);
    const token = generateJwt({ userId: user.id, orgId: user.orgId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, orgId: user.orgId, role: user.role });

    return c.json({ success: true, data: { token, refreshToken, user } });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 401);
    }
    console.error('Login error:', err);
    return c.json({ success: false, error: { code: 'LOGIN_FAILED', message: 'ログイン処理中にエラーが発生しました' } }, 500);
  }
});

// ── GET /me ──
// 認証済みユーザーのプロフィール取得
authRoutes.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user');
  const user = await getUserById(authUser.userId);

  if (!user) {
    return c.json(
      { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
      404,
    );
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      orgId: user.orgId,
      role: user.role,
      displayName: user.displayName,
      email: user.email,
      lineUserId: user.lineUserId,
      isActive: user.isActive,
    },
  });
});
