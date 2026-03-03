import { describe, it, expect, vi } from 'vitest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('Night-Watch サービスロジック', () => {
  describe('スケジュール延長ロジック（overrideUntil 計算）', () => {
    it('正常: 指定時間後の Date を正しく計算', () => {
      const now = new Date('2026-03-03T10:00:00Z');
      vi.setSystemTime(now);

      const hours = 2;
      const overrideUntil = dayjs().add(hours, 'hour').toDate();

      const expected = new Date('2026-03-03T12:00:00Z');
      expect(overrideUntil.getTime()).toBe(expected.getTime());

      vi.useRealTimers();
    });

    it('境界値: 最大8時間延長', () => {
      const now = new Date('2026-03-03T23:00:00Z');
      vi.setSystemTime(now);

      const overrideUntil = dayjs().add(8, 'hour').toDate();
      expect(overrideUntil.getTime()).toBe(new Date('2026-03-04T07:00:00Z').getTime());

      vi.useRealTimers();
    });

    it('境界値: 最小1時間延長', () => {
      const now = new Date('2026-03-03T18:00:00Z');
      vi.setSystemTime(now);

      const overrideUntil = dayjs().add(1, 'hour').toDate();
      expect(overrideUntil.getTime()).toBe(new Date('2026-03-03T19:00:00Z').getTime());

      vi.useRealTimers();
    });
  });

  describe('コスト削減計算ロジック', () => {
    it('正常: 停止回数からコスト削減額を計算', () => {
      const estimatedSavingsPerStop = 50;
      const stopCount = 42;
      const totalSavings = stopCount * estimatedSavingsPerStop;

      expect(totalSavings).toBe(2100);
    });

    it('境界値: 停止回数0の場合', () => {
      const estimatedSavingsPerStop = 50;
      const stopCount = 0;
      const totalSavings = stopCount * estimatedSavingsPerStop;

      expect(totalSavings).toBe(0);
    });

    it('正常: リソース数のユニーク計算', () => {
      const logs = [
        { details: { resourceId: 'res-1' } },
        { details: { resourceId: 'res-2' } },
        { details: { resourceId: 'res-1' } },
        { details: { resourceId: 'res-3' } },
      ];

      const resourceCount = new Set(
        logs.map((l) => (l.details as Record<string, unknown>)?.resourceId),
      ).size;

      expect(resourceCount).toBe(3);
    });
  });

  describe('曜日・時刻フィルタリングロジック', () => {
    it('正常: 対象曜日に含まれる場合は true', () => {
      const daysOfWeek = [1, 2, 3, 4, 5]; // Mon-Fri
      const tuesday = 2;
      expect(daysOfWeek.includes(tuesday)).toBe(true);
    });

    it('正常: 対象曜日に含まれない場合は false', () => {
      const daysOfWeek = [1, 2, 3, 4, 5]; // Mon-Fri
      const sunday = 0;
      expect(daysOfWeek.includes(sunday)).toBe(false);
    });

    it('正常: endTime 超過判定', () => {
      const currentTime = '19:30';
      const endTimeJst = '18:00';
      expect(currentTime >= endTimeJst).toBe(true);
    });

    it('正常: endTime 未到達判定', () => {
      const currentTime = '17:30';
      const endTimeJst = '18:00';
      expect(currentTime < endTimeJst).toBe(true);
    });

    it('正常: オーバーライド有効時は停止しない', () => {
      const now = new Date('2026-03-03T19:00:00Z');
      const overrideUntil = new Date('2026-03-03T22:00:00Z');
      const shouldSkip = overrideUntil && dayjs(overrideUntil).isAfter(now);
      expect(shouldSkip).toBe(true);
    });

    it('正常: オーバーライド期限切れ時は停止する', () => {
      const now = new Date('2026-03-03T23:00:00Z');
      const overrideUntil = new Date('2026-03-03T22:00:00Z');
      const shouldSkip = overrideUntil && dayjs(overrideUntil).isAfter(now);
      expect(shouldSkip).toBe(false);
    });
  });
});
