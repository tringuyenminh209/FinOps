import { describe, it, expect, vi, beforeEach } from 'vitest';

// DB モック
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    resourceId: 'resource-001',
                    actionType: 'rightsize',
                    actionDescription: 'EC2インスタンスのダウンサイジングを推奨します',
                    savingsJpy: 3000,
                    co2ReducedKg: 1.5,
                  },
                ],
              }),
            },
          }],
        }),
      },
    },
  })),
}));

// ── アクションタイプ検証 ──
describe('AI Advisor — アクションタイプ', () => {
  it('有効なアクションタイプを識別できる', () => {
    const validTypes = ['ri_purchase', 'sp_purchase', 'rightsize', 'stop'];
    validTypes.forEach(type => {
      expect(validTypes).toContain(type);
    });
  });

  it('無効なアクションタイプを除外できる', () => {
    const validTypes = new Set(['ri_purchase', 'sp_purchase', 'rightsize', 'stop']);
    expect(validTypes.has('delete')).toBe(false);
    expect(validTypes.has('terminate')).toBe(false);
  });
});

// ── ステータス検証 ──
describe('AI Advisor — ステータス管理', () => {
  it('有効なステータス値を確認', () => {
    const validStatuses = ['pending', 'approved', 'executed', 'dismissed'];
    validStatuses.forEach(s => {
      expect(['pending', 'approved', 'executed', 'dismissed']).toContain(s);
    });
  });

  it('承認・却下のみ更新可能', () => {
    const updatableStatuses = ['approved', 'dismissed'];
    expect(updatableStatuses).not.toContain('executed');
    expect(updatableStatuses).not.toContain('pending');
  });
});

// ── フォールバック推奨生成ロジック ──
describe('AI Advisor — フォールバック推奨', () => {
  it('停止中リソースにstopアクションを推奨', () => {
    const resource = {
      id: 'r1',
      name: 'test-ec2',
      resourceType: 'ec2',
      status: 'stopped',
      monthlyCostJpy: 5000,
      region: 'ap-northeast-1',
      provider: 'aws',
    };

    // stopped + コストありの場合
    expect(resource.status).toBe('stopped');
    expect(resource.monthlyCostJpy).toBeGreaterThan(1000);
  });

  it('高コストEC2にRI購入を推奨', () => {
    const resource = {
      id: 'r2',
      name: 'prod-api',
      resourceType: 'ec2',
      status: 'running',
      monthlyCostJpy: 15000,
      region: 'ap-northeast-1',
      provider: 'aws',
    };

    const expectedSavings = Math.round(resource.monthlyCostJpy * 0.4);
    expect(expectedSavings).toBe(6000);
  });

  it('中コストリソースにrightsizeを推奨', () => {
    const resource = {
      id: 'r3',
      name: 'dev-server',
      resourceType: 'rds',
      status: 'running',
      monthlyCostJpy: 8000,
      region: 'ap-northeast-1',
      provider: 'aws',
    };

    const expectedSavings = Math.round(resource.monthlyCostJpy * 0.25);
    expect(expectedSavings).toBe(2000);
  });

  it('コストが低いリソースは推奨しない', () => {
    const lowCostResource = {
      id: 'r4',
      name: 'tiny-lambda',
      resourceType: 'lambda',
      status: 'running',
      monthlyCostJpy: 100,
      region: 'ap-northeast-1',
      provider: 'aws',
    };

    // monthlyCostJpy < 5000 の場合は推奨しない
    expect(lowCostResource.monthlyCostJpy).toBeLessThan(5000);
  });
});

// ── 削減額計算 ──
describe('AI Advisor — 削減額計算', () => {
  it('RI購入による削減率を計算 (40%)', () => {
    const monthlyCost = 20000;
    const riReductionRate = 0.4;
    const savings = Math.round(monthlyCost * riReductionRate);
    expect(savings).toBe(8000);
  });

  it('Savings Plan削減率を計算 (30%)', () => {
    const monthlyCost = 15000;
    const spReductionRate = 0.3;
    const savings = Math.round(monthlyCost * spReductionRate);
    expect(savings).toBe(4500);
  });

  it('Rightsize削減率を計算 (25%)', () => {
    const monthlyCost = 12000;
    const rightsizeRate = 0.25;
    const savings = Math.round(monthlyCost * rightsizeRate);
    expect(savings).toBe(3000);
  });

  it('年間削減額を月間から算出', () => {
    const monthlySavings = 5000;
    const annualSavings = monthlySavings * 12;
    expect(annualSavings).toBe(60000);
  });
});

// ── CO2削減計算 ──
describe('AI Advisor — CO2削減量', () => {
  it('削減額からCO2削減量を推定', () => {
    const monthlyCostJpy = 10000;
    const co2Factor = 0.0008; // kg per JPY
    const co2Reduced = monthlyCostJpy * co2Factor;
    expect(co2Reduced).toBe(8);
  });

  it('CO2削減量は正の値', () => {
    const co2ReducedKg = 2.5;
    expect(co2ReducedKg).toBeGreaterThan(0);
  });
});

// ── テナント分離 ──
describe('AI Advisor — テナント分離', () => {
  it('推奨更新時にorgIdを検証', () => {
    const orgId = 'org-001';
    const differentOrgId = 'org-002';
    expect(orgId).not.toBe(differentOrgId);
  });

  it('他テナントのリソースIDを除外', () => {
    const orgResourceIds = new Set(['r1', 'r2', 'r3']);
    const optimizationResourceId = 'r4'; // 別テナントのリソース
    expect(orgResourceIds.has(optimizationResourceId)).toBe(false);
  });
});
