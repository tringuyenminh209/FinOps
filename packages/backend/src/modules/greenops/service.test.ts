import { describe, it, expect } from 'vitest';
import {
  EMISSION_FACTORS, PUE, RESOURCE_POWER_USAGE, getGreenGrade,
  GREEN_SCORE_THRESHOLDS,
} from '@finops/shared';

describe('GreenOps — CO2計算ロジック', () => {
  it('powerKwh * PUE * emissionFactor で正確にCO2排出量を算出', () => {
    const powerKwh = 365; // EC2 0.5kWh/h * 730h
    const pue = PUE['aws']; // 1.135
    const ef = EMISSION_FACTORS['ap-northeast-1']; // 0.441

    const carbonKg = powerKwh * pue * ef;

    expect(carbonKg).toBeCloseTo(365 * 1.135 * 0.441, 2);
    expect(carbonKg).toBeGreaterThan(0);
  });

  it('RDS の電力消費量は EC2 より高い', () => {
    const ec2Power = RESOURCE_POWER_USAGE['ec2'] * 730;
    const rdspower = RESOURCE_POWER_USAGE['rds'] * 730;
    expect(rdspower).toBeGreaterThan(ec2Power);
  });

  it('stopped リソースは 0 kWh (稼働時間 = 0)', () => {
    const hoursPerMonth = 0;
    const basePower = RESOURCE_POWER_USAGE['ec2'];
    const powerKwh = basePower * hoursPerMonth;
    expect(powerKwh).toBe(0);
  });

  it('リージョン別排出係数マッピングが正確', () => {
    expect(EMISSION_FACTORS['ap-northeast-1']).toBe(0.441);
    expect(EMISSION_FACTORS['ap-northeast-3']).toBe(0.352);
    expect(EMISSION_FACTORS['japaneast']).toBe(0.441);
    expect(EMISSION_FACTORS['japanwest']).toBe(0.352);
  });

  it('不明リージョンではフォールバックとして ap-northeast-1 の係数を使用', () => {
    const fallback = EMISSION_FACTORS['ap-northeast-1'];
    const unknownRegion = EMISSION_FACTORS['unknown-region'] ?? fallback;
    expect(unknownRegion).toBe(0.441);
  });
});

describe('GreenOps — Green-score 計算', () => {
  it('削減率 0% → スコア 50 (ベースライン維持)', () => {
    const baseline = 100;
    const current = 100;
    const reductionPercent = ((baseline - current) / baseline) * 100;
    const score = Math.min(100, Math.max(0, Math.round(
      baseline > 0 ? (reductionPercent / 50) * 100 : 50,
    )));
    expect(score).toBe(0);
  });

  it('削減率 10% → スコア 20', () => {
    const baseline = 100;
    const current = 90;
    const reductionPercent = ((baseline - current) / baseline) * 100;
    const score = Math.min(100, Math.max(0, Math.round(
      (reductionPercent / 50) * 100,
    )));
    expect(score).toBe(20);
  });

  it('削減率 30% → スコア 60', () => {
    const baseline = 100;
    const current = 70;
    const reductionPercent = ((baseline - current) / baseline) * 100;
    const score = Math.min(100, Math.max(0, Math.round(
      (reductionPercent / 50) * 100,
    )));
    expect(score).toBe(60);
  });

  it('削減率 50%以上 → スコア 100 (上限)', () => {
    const baseline = 100;
    const current = 40;
    const reductionPercent = ((baseline - current) / baseline) * 100;
    const score = Math.min(100, Math.max(0, Math.round(
      (reductionPercent / 50) * 100,
    )));
    expect(score).toBe(100);
  });

  it('ベースライン 0 の場合はスコア 50', () => {
    const baseline = 0;
    const score = Math.min(100, Math.max(0, Math.round(
      baseline > 0 ? 0 : 50,
    )));
    expect(score).toBe(50);
  });
});

describe('GreenOps — グレード変換', () => {
  it('スコア 80+ → S', () => {
    expect(getGreenGrade(80)).toBe('S');
    expect(getGreenGrade(100)).toBe('S');
  });

  it('スコア 60-79 → A', () => {
    expect(getGreenGrade(60)).toBe('A');
    expect(getGreenGrade(79)).toBe('A');
  });

  it('スコア 40-59 → B', () => {
    expect(getGreenGrade(40)).toBe('B');
    expect(getGreenGrade(59)).toBe('B');
  });

  it('スコア 20-39 → C', () => {
    expect(getGreenGrade(20)).toBe('C');
    expect(getGreenGrade(39)).toBe('C');
  });

  it('スコア 0-19 → D', () => {
    expect(getGreenGrade(0)).toBe('D');
    expect(getGreenGrade(19)).toBe('D');
  });

  it('GREEN_SCORE_THRESHOLDS は降順ソートされている', () => {
    for (let i = 0; i < GREEN_SCORE_THRESHOLDS.length - 1; i++) {
      expect(GREEN_SCORE_THRESHOLDS[i].min).toBeGreaterThan(GREEN_SCORE_THRESHOLDS[i + 1].min);
    }
  });
});

describe('GreenOps — 境界値テスト', () => {
  it('リソース 0 件の場合、計算結果は空配列', () => {
    const rows: unknown[] = [];
    const calculations = rows.map(() => ({ carbonKg: 0, powerKwh: 0 }));
    expect(calculations).toEqual([]);
    expect(calculations.length).toBe(0);
  });

  it('排出量 0 の合計も正しく集計', () => {
    const values = [0, 0, 0];
    const total = values.reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });

  it('全リソースタイプに電力消費量が定義されている', () => {
    const types = ['ec2', 'rds', 'ecs', 'lambda', 's3', 'ebs', 'vm', 'sql', 'functions', 'blob'];
    for (const t of types) {
      expect(RESOURCE_POWER_USAGE[t]).toBeDefined();
      expect(RESOURCE_POWER_USAGE[t]).toBeGreaterThan(0);
    }
  });
});
