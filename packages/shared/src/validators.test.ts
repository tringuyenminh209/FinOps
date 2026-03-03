import { describe, it, expect } from 'vitest';
import {
  createCloudAccountSchema,
  createScheduleSchema,
  updateScheduleSchema,
  overrideScheduleSchema,
  createOrganizationSchema,
  paginationSchema,
  dateRangeSchema,
  lineConfigSchema,
  updateLineConfigSchema,
  sendReportSchema,
  updateOrgSettingsSchema,
} from './validators';

describe('createCloudAccountSchema', () => {
  it('正常: 有効な AWS アカウント', () => {
    const result = createCloudAccountSchema.safeParse({
      provider: 'aws',
      externalId: 'ext-123',
      region: 'ap-northeast-1',
      arnRole: 'arn:aws:iam::123456789:role/FinOps',
    });
    expect(result.success).toBe(true);
  });

  it('異常: provider が不正', () => {
    const result = createCloudAccountSchema.safeParse({
      provider: 'gcp',
      externalId: 'ext-123',
      region: 'us-east-1',
    });
    expect(result.success).toBe(false);
  });

  it('異常: externalId が空', () => {
    const result = createCloudAccountSchema.safeParse({
      provider: 'aws',
      externalId: '',
      region: 'ap-northeast-1',
    });
    expect(result.success).toBe(false);
  });

  it('異常: region が空', () => {
    const result = createCloudAccountSchema.safeParse({
      provider: 'aws',
      externalId: 'ext-123',
      region: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('createScheduleSchema', () => {
  it('正常: 有効なスケジュール', () => {
    const result = createScheduleSchema.safeParse({
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
      startTimeJst: '09:00',
      endTimeJst: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5],
    });
    expect(result.success).toBe(true);
  });

  it('異常: 不正な時刻形式', () => {
    const result = createScheduleSchema.safeParse({
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
      startTimeJst: '9:00',
      endTimeJst: '18:00',
      daysOfWeek: [1],
    });
    expect(result.success).toBe(false);
  });

  it('異常: 曜日が空配列', () => {
    const result = createScheduleSchema.safeParse({
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
      startTimeJst: '09:00',
      endTimeJst: '18:00',
      daysOfWeek: [],
    });
    expect(result.success).toBe(false);
  });

  it('境界値: 曜日 0(日) と 6(土)', () => {
    const result = createScheduleSchema.safeParse({
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
      startTimeJst: '00:00',
      endTimeJst: '23:59',
      daysOfWeek: [0, 6],
    });
    expect(result.success).toBe(true);
  });

  it('異常: 曜日が範囲外', () => {
    const result = createScheduleSchema.safeParse({
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
      startTimeJst: '09:00',
      endTimeJst: '18:00',
      daysOfWeek: [7],
    });
    expect(result.success).toBe(false);
  });
});

describe('overrideScheduleSchema', () => {
  it('正常: 2時間延長', () => {
    expect(overrideScheduleSchema.safeParse({ hours: 2 }).success).toBe(true);
  });

  it('境界値: 最小1時間', () => {
    expect(overrideScheduleSchema.safeParse({ hours: 1 }).success).toBe(true);
  });

  it('境界値: 最大8時間', () => {
    expect(overrideScheduleSchema.safeParse({ hours: 8 }).success).toBe(true);
  });

  it('異常: 0時間', () => {
    expect(overrideScheduleSchema.safeParse({ hours: 0 }).success).toBe(false);
  });

  it('異常: 9時間超過', () => {
    expect(overrideScheduleSchema.safeParse({ hours: 9 }).success).toBe(false);
  });

  it('異常: 小数', () => {
    expect(overrideScheduleSchema.safeParse({ hours: 1.5 }).success).toBe(false);
  });
});

describe('createOrganizationSchema', () => {
  it('正常: 有効な組織', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'テスト株式会社',
    });
    expect(result.success).toBe(true);
  });

  it('正常: JCT ID 付き', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'テスト株式会社',
      jctId: 'T1234567890123',
    });
    expect(result.success).toBe(true);
  });

  it('異常: 名前が空', () => {
    expect(createOrganizationSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('異常: JCT ID 形式が不正', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'テスト',
      jctId: '1234567890123',
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('正常: デフォルト値', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortOrder).toBe('desc');
  });

  it('正常: カスタム値', () => {
    const result = paginationSchema.parse({ page: 3, limit: 50 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('境界値: limit 最大100', () => {
    expect(paginationSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe('dateRangeSchema', () => {
  it('正常: 有効な日付範囲', () => {
    const result = dateRangeSchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    });
    expect(result.success).toBe(true);
  });

  it('異常: 終了日が開始日より前', () => {
    const result = dateRangeSchema.safeParse({
      startDate: '2026-03-01',
      endDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('異常: 同日', () => {
    const result = dateRangeSchema.safeParse({
      startDate: '2026-03-01',
      endDate: '2026-03-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('lineConfigSchema', () => {
  it('正常: デフォルト値', () => {
    const result = lineConfigSchema.parse({});
    expect(result.isEnabled).toBe(true);
    expect(result.weeklyReportDay).toBe(1);
    expect(result.weeklyReportHour).toBe(9);
  });

  it('正常: カスタム値', () => {
    const result = lineConfigSchema.parse({
      isEnabled: false,
      weeklyReportDay: 5,
      weeklyReportHour: 17,
    });
    expect(result.isEnabled).toBe(false);
    expect(result.weeklyReportDay).toBe(5);
    expect(result.weeklyReportHour).toBe(17);
  });

  it('境界値: weeklyReportDay 0-6', () => {
    expect(lineConfigSchema.safeParse({ weeklyReportDay: 0 }).success).toBe(true);
    expect(lineConfigSchema.safeParse({ weeklyReportDay: 6 }).success).toBe(true);
    expect(lineConfigSchema.safeParse({ weeklyReportDay: 7 }).success).toBe(false);
    expect(lineConfigSchema.safeParse({ weeklyReportDay: -1 }).success).toBe(false);
  });

  it('境界値: weeklyReportHour 0-23', () => {
    expect(lineConfigSchema.safeParse({ weeklyReportHour: 0 }).success).toBe(true);
    expect(lineConfigSchema.safeParse({ weeklyReportHour: 23 }).success).toBe(true);
    expect(lineConfigSchema.safeParse({ weeklyReportHour: 24 }).success).toBe(false);
  });
});

describe('updateLineConfigSchema', () => {
  it('正常: 部分更新', () => {
    const result = updateLineConfigSchema.safeParse({
      notifyOnCostAlert: false,
    });
    expect(result.success).toBe(true);
  });

  it('正常: 空オブジェクト', () => {
    expect(updateLineConfigSchema.safeParse({}).success).toBe(true);
  });
});

describe('sendReportSchema', () => {
  it('正常: orgId のみ', () => {
    const result = sendReportSchema.safeParse({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('正常: 空オブジェクト', () => {
    expect(sendReportSchema.safeParse({}).success).toBe(true);
  });
});

describe('updateOrgSettingsSchema', () => {
  it('正常: LINE Integration 設定', () => {
    const result = updateOrgSettingsSchema.safeParse({
      lineIntegration: { enabled: true },
    });
    expect(result.success).toBe(true);
  });

  it('正常: 通知設定', () => {
    const result = updateOrgSettingsSchema.safeParse({
      notifications: {
        costAlertThresholdJpy: 100000,
        weeklyReportEnabled: true,
        weeklyReportDay: 1,
        weeklyReportHour: 9,
      },
    });
    expect(result.success).toBe(true);
  });

  it('正常: Night-Watch 設定', () => {
    const result = updateOrgSettingsSchema.safeParse({
      nightWatch: {
        defaultWarningMinutes: 15,
        defaultExtendHours: 3,
      },
    });
    expect(result.success).toBe(true);
  });

  it('境界値: warningMinutes 5-60', () => {
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultWarningMinutes: 5 } }).success).toBe(true);
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultWarningMinutes: 60 } }).success).toBe(true);
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultWarningMinutes: 4 } }).success).toBe(false);
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultWarningMinutes: 61 } }).success).toBe(false);
  });

  it('境界値: extendHours 1-8', () => {
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultExtendHours: 1 } }).success).toBe(true);
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultExtendHours: 8 } }).success).toBe(true);
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultExtendHours: 0 } }).success).toBe(false);
    expect(updateOrgSettingsSchema.safeParse({ nightWatch: { defaultExtendHours: 9 } }).success).toBe(false);
  });

  it('境界値: costAlertThresholdJpy 0-10,000,000', () => {
    expect(updateOrgSettingsSchema.safeParse({ notifications: { costAlertThresholdJpy: 0 } }).success).toBe(true);
    expect(updateOrgSettingsSchema.safeParse({ notifications: { costAlertThresholdJpy: 10_000_000 } }).success).toBe(true);
    expect(updateOrgSettingsSchema.safeParse({ notifications: { costAlertThresholdJpy: -1 } }).success).toBe(false);
    expect(updateOrgSettingsSchema.safeParse({ notifications: { costAlertThresholdJpy: 10_000_001 } }).success).toBe(false);
  });
});
