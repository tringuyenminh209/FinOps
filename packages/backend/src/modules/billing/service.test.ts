import { describe, it, expect } from 'vitest';
import { JCT_RATE } from '@finops/shared';

describe('JCT 計算ロジック', () => {
  it('正常: 標準税率10%の計算', () => {
    expect(JCT_RATE).toBe(0.10);
  });

  it('正常: 税額計算（切り捨て）', () => {
    const subtotal = 9800;
    const taxAmount = Math.floor(subtotal * JCT_RATE);
    expect(taxAmount).toBe(980);
  });

  it('正常: 合計金額計算', () => {
    const subtotal = 9800;
    const taxAmount = Math.floor(subtotal * JCT_RATE);
    const total = subtotal + taxAmount;
    expect(total).toBe(10780);
  });

  it('境界値: 小数点以下切り捨て', () => {
    const subtotal = 9999;
    const taxAmount = Math.floor(subtotal * JCT_RATE);
    // 9999 * 0.10 = 999.9 → 999
    expect(taxAmount).toBe(999);
    expect(subtotal + taxAmount).toBe(10998);
  });

  it('境界値: 金額0の場合', () => {
    const subtotal = 0;
    const taxAmount = Math.floor(subtotal * JCT_RATE);
    expect(taxAmount).toBe(0);
    expect(subtotal + taxAmount).toBe(0);
  });

  it('正常: Enterprise プラン料金', () => {
    const subtotal = 49800;
    const taxAmount = Math.floor(subtotal * JCT_RATE);
    expect(taxAmount).toBe(4980);
    expect(subtotal + taxAmount).toBe(54780);
  });

  it('境界値: 大額の場合も正しく計算', () => {
    const subtotal = 10_000_000; // 1千万円
    const taxAmount = Math.floor(subtotal * JCT_RATE);
    expect(taxAmount).toBe(1_000_000);
    expect(subtotal + taxAmount).toBe(11_000_000);
  });
});

describe('請求期間フォーマット', () => {
  function formatPeriod(start: Date, end: Date): string {
    const fmt = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${fmt(start)} - ${fmt(end)}`;
  }

  it('正常: 月次期間のフォーマット', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');
    expect(formatPeriod(start, end)).toBe('2026/01 - 2026/01');
  });

  it('正常: 年跨ぎの期間', () => {
    const start = new Date('2025-12-01');
    const end = new Date('2026-01-31');
    expect(formatPeriod(start, end)).toBe('2025/12 - 2026/01');
  });

  it('境界値: 同月の期間', () => {
    const start = new Date('2026-03-01');
    const end = new Date('2026-03-31');
    expect(formatPeriod(start, end)).toBe('2026/03 - 2026/03');
  });
});
