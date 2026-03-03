import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJwt, verifyJwt } from '../../middleware/auth';
import type { JwtPayload } from '../../middleware/auth';

describe('JWT 生成・検証', () => {
  const payload = { userId: 'user-001', orgId: 'org-001', role: 'admin' as const };

  it('正常: JWT を生成して検証に成功する', () => {
    const token = createJwt(payload);
    const decoded = verifyJwt(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe(payload.userId);
    expect(decoded!.org_id).toBe(payload.orgId);
    expect(decoded!.role).toBe(payload.role);
  });

  it('正常: カスタム有効期限でトークン生成', () => {
    const token = createJwt(payload, 60 * 60 * 24 * 7);
    const decoded = verifyJwt(token);

    expect(decoded).not.toBeNull();
    const sevenDays = 60 * 60 * 24 * 7;
    expect(decoded!.exp - decoded!.iat).toBe(sevenDays);
  });

  it('異常: 不正な形式のトークンは null を返す', () => {
    expect(verifyJwt('invalid')).toBeNull();
    expect(verifyJwt('a.b')).toBeNull();
    expect(verifyJwt('')).toBeNull();
  });

  it('異常: 改竄されたトークンは null を返す', () => {
    const token = createJwt(payload);
    const parts = token.split('.');
    // ペイロードを改竄
    const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ sub: 'hacker', org_id: 'evil', role: 'admin', iat: 0, exp: 9999999999 })).toString('base64url')}.${parts[2]}`;
    expect(verifyJwt(tampered)).toBeNull();
  });

  it('異常: 有効期限切れのトークンは null を返す', () => {
    const token = createJwt(payload, -1);
    expect(verifyJwt(token)).toBeNull();
  });

  it('正常: viewer/operator ロールでもトークン生成可能', () => {
    for (const role of ['viewer', 'operator'] as const) {
      const token = createJwt({ ...payload, role });
      const decoded = verifyJwt(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.role).toBe(role);
    }
  });
});

describe('exchangeLineCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('正常: LINE Token API からアクセストークンを取得', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'line-access-token-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { exchangeLineCode } = await import('./service');
    const token = await exchangeLineCode('auth-code-xyz', 'http://localhost:3000/auth/line/callback');

    expect(token).toBe('line-access-token-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.line.me/oauth2/v2.1/token');
  });

  it('異常: LINE Token API エラー時は AuthError を throw', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('{"error":"invalid_grant"}'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { exchangeLineCode, AuthError } = await import('./service');

    await expect(exchangeLineCode('bad-code', 'http://localhost:3000/callback'))
      .rejects.toThrow();
  });
});

describe('verifyLineToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('正常: LINE Profile API からプロフィールを取得', async () => {
    const profile = { userId: 'U123', displayName: 'テストユーザー', pictureUrl: 'https://example.com/pic.jpg' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(profile),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { verifyLineToken } = await import('./service');
    const result = await verifyLineToken('valid-access-token');

    expect(result).toEqual(profile);
    expect(mockFetch.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer valid-access-token' });
  });

  it('異常: 無効なアクセストークンは AuthError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Unauthorized'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { verifyLineToken } = await import('./service');
    await expect(verifyLineToken('invalid-token')).rejects.toThrow();
  });
});
