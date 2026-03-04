import { describe, it, expect } from 'vitest';
import {
  EMISSION_FACTORS, PUE, RESOURCE_POWER_USAGE,
  GREEN_SCORE_THRESHOLDS, getGreenGrade,
  PLAN_LIMITS, JCT_RATE, DEFAULT_SCHEDULE,
} from './constants';

describe('EMISSION_FACTORS', () => {
  it('全ての値が正の数', () => {
    for (const [key, value] of Object.entries(EMISSION_FACTORS)) {
      expect(value, `${key} should be positive`).toBeGreaterThan(0);
    }
  });

  it('日本の電力会社が含まれる', () => {
    expect(EMISSION_FACTORS['TEPCO']).toBeDefined();
    expect(EMISSION_FACTORS['KEPCO']).toBeDefined();
    expect(EMISSION_FACTORS['CHUBU']).toBeDefined();
    expect(EMISSION_FACTORS['TOHOKU']).toBeDefined();
  });

  it('AWS リージョンが含まれる', () => {
    expect(EMISSION_FACTORS['ap-northeast-1']).toBeDefined();
    expect(EMISSION_FACTORS['ap-northeast-3']).toBeDefined();
  });

  it('Azure リージョンが含まれる', () => {
    expect(EMISSION_FACTORS['japaneast']).toBeDefined();
    expect(EMISSION_FACTORS['japanwest']).toBeDefined();
  });

  it('係数は 0〜1 の範囲内', () => {
    for (const [key, value] of Object.entries(EMISSION_FACTORS)) {
      expect(value, `${key}`).toBeGreaterThan(0);
      expect(value, `${key}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('PUE', () => {
  it('全ての値が 1.0 以上', () => {
    for (const [key, value] of Object.entries(PUE)) {
      expect(value, `${key} should be >= 1.0`).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('AWS と Azure が定義されている', () => {
    expect(PUE['aws']).toBeDefined();
    expect(PUE['azure']).toBeDefined();
  });

  it('PUE は現実的な範囲 (1.0〜2.0) 内', () => {
    for (const [key, value] of Object.entries(PUE)) {
      expect(value, `${key}`).toBeLessThanOrEqual(2.0);
    }
  });
});

describe('RESOURCE_POWER_USAGE', () => {
  it('全ての値が正の数', () => {
    for (const [key, value] of Object.entries(RESOURCE_POWER_USAGE)) {
      expect(value, `${key} should be positive`).toBeGreaterThan(0);
    }
  });

  it('主要リソースタイプが定義されている', () => {
    const required = ['ec2', 'rds', 'ecs', 'lambda', 's3', 'ebs'];
    for (const key of required) {
      expect(RESOURCE_POWER_USAGE[key], `${key} should be defined`).toBeDefined();
    }
  });

  it('RDS は EC2 より消費電力が高い', () => {
    expect(RESOURCE_POWER_USAGE['rds']).toBeGreaterThan(RESOURCE_POWER_USAGE['ec2']);
  });

  it('サーバーレス (Lambda) は EC2 より消費電力が低い', () => {
    expect(RESOURCE_POWER_USAGE['lambda']).toBeLessThan(RESOURCE_POWER_USAGE['ec2']);
  });
});

describe('GREEN_SCORE_THRESHOLDS', () => {
  it('5 つのグレード (S/A/B/C/D) が定義されている', () => {
    expect(GREEN_SCORE_THRESHOLDS).toHaveLength(5);
    const grades = GREEN_SCORE_THRESHOLDS.map((t) => t.grade);
    expect(grades).toEqual(['S', 'A', 'B', 'C', 'D']);
  });

  it('min 値が降順にソートされている', () => {
    for (let i = 0; i < GREEN_SCORE_THRESHOLDS.length - 1; i++) {
      expect(GREEN_SCORE_THRESHOLDS[i].min).toBeGreaterThan(GREEN_SCORE_THRESHOLDS[i + 1].min);
    }
  });

  it('最低閾値は 0', () => {
    const last = GREEN_SCORE_THRESHOLDS[GREEN_SCORE_THRESHOLDS.length - 1];
    expect(last.min).toBe(0);
  });
});

describe('getGreenGrade', () => {
  it('境界値で正しいグレードを返す', () => {
    expect(getGreenGrade(100)).toBe('S');
    expect(getGreenGrade(80)).toBe('S');
    expect(getGreenGrade(79)).toBe('A');
    expect(getGreenGrade(60)).toBe('A');
    expect(getGreenGrade(59)).toBe('B');
    expect(getGreenGrade(40)).toBe('B');
    expect(getGreenGrade(39)).toBe('C');
    expect(getGreenGrade(20)).toBe('C');
    expect(getGreenGrade(19)).toBe('D');
    expect(getGreenGrade(0)).toBe('D');
  });

  it('負の値は D を返す', () => {
    expect(getGreenGrade(-10)).toBe('D');
  });
});

describe('PLAN_LIMITS — GreenOps', () => {
  it('free プランは greenOps が false', () => {
    expect(PLAN_LIMITS.free.greenOps).toBe(false);
  });

  it('pro プランは greenOps が true', () => {
    expect(PLAN_LIMITS.pro.greenOps).toBe(true);
  });

  it('enterprise プランは greenOps が true', () => {
    expect(PLAN_LIMITS.enterprise.greenOps).toBe(true);
  });
});
