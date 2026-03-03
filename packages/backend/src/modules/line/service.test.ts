import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'crypto';

describe('verifyWebhookSignature', () => {
  const CHANNEL_SECRET = 'test-channel-secret';

  it('正常: 有効な署名を検証', async () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', CHANNEL_SECRET);

    const { verifyWebhookSignature } = await import('./service');
    const body = '{"events":[]}';
    const validSig = createHmac('sha256', CHANNEL_SECRET).update(body).digest('base64');

    expect(verifyWebhookSignature(body, validSig)).toBe(true);

    vi.unstubAllEnvs();
  });

  it('異常: 不正な署名は false', async () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', CHANNEL_SECRET);

    const { verifyWebhookSignature } = await import('./service');
    expect(verifyWebhookSignature('{"events":[]}', 'invalid-signature')).toBe(false);

    vi.unstubAllEnvs();
  });

  it('異常: CHANNEL_SECRET 未設定は false', async () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', '');

    const mod = await import('./service');
    expect(mod.verifyWebhookSignature('body', 'sig')).toBe(false);

    vi.unstubAllEnvs();
  });
});

describe('Flex Message テンプレート', () => {
  it('buildWeeklyReportFlex: 正しい構造を返す', async () => {
    const { buildWeeklyReportFlex } = await import('./templates');

    const report = {
      id: 'r-001',
      orgId: 'org-001',
      periodStart: new Date('2026-02-23'),
      periodEnd: new Date('2026-03-02'),
      totalCostJpy: 125000,
      previousCostJpy: 130000,
      costChangePercent: -3.85,
      resourceCount: 15,
      stoppedHours: 42,
      savingsJpy: 2100,
      topResources: [],
      generatedAt: new Date(),
    };

    const flex = buildWeeklyReportFlex(report, 'テスト組織');

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('テスト組織');
    expect(flex.contents.type).toBe('bubble');
    expect(flex.contents.header).toBeDefined();
    expect(flex.contents.body).toBeDefined();
    expect(flex.contents.footer).toBeDefined();
  });

  it('buildWeeklyReportFlex: topResources がある場合もレンダリング', async () => {
    const { buildWeeklyReportFlex } = await import('./templates');

    const report = {
      id: 'r-002',
      orgId: 'org-001',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalCostJpy: 50000,
      previousCostJpy: 40000,
      costChangePercent: 25.0,
      resourceCount: 5,
      stoppedHours: 10,
      savingsJpy: 500,
      topResources: [
        { resourceId: 'res-1', name: 'web-server', type: 'ec2', costJpy: 30000, changePercent: 5.2 },
        { resourceId: 'res-2', name: 'db-server', type: 'rds', costJpy: 15000, changePercent: -2.1 },
      ],
      generatedAt: new Date(),
    };

    const flex = buildWeeklyReportFlex(report, 'Org');
    const bodyContents = flex.contents.body.contents;
    const hasResource = bodyContents.some(
      (c: Record<string, unknown>) =>
        c.type === 'text' && typeof c.text === 'string' && c.text.includes('コスト上位'),
    );
    expect(hasResource).toBe(true);
  });

  it('buildNightWatchNotifyFlex: 停止通知を生成', async () => {
    const { buildNightWatchNotifyFlex } = await import('./templates');

    const flex = buildNightWatchNotifyFlex('web-server', 'ec2', 'stopped', 'sched-001');

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('停止');
    // 停止の場合は延長ボタンがある
    const bodyContents = flex.contents.body.contents as Record<string, unknown>[];
    const hasButton = bodyContents.some((c) => c.type === 'button');
    expect(hasButton).toBe(true);
  });

  it('buildNightWatchNotifyFlex: 起動通知を生成（ボタンなし）', async () => {
    const { buildNightWatchNotifyFlex } = await import('./templates');

    const flex = buildNightWatchNotifyFlex('db-server', 'rds', 'started');

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('起動');
    const bodyContents = flex.contents.body.contents as Record<string, unknown>[];
    const hasButton = bodyContents.some((c) => c.type === 'button');
    expect(hasButton).toBe(false);
  });

  it('buildCostAlertFlex: コストアラートを生成', async () => {
    const { buildCostAlertFlex } = await import('./templates');

    const flex = buildCostAlertFlex('expensive-server', 150000, 100000);

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('コストアラート');
    expect(flex.altText).toContain('expensive-server');
  });
});
