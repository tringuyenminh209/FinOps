/**
 * FinOps Platform — Zod バリデーションスキーマ
 * API入力の検証に使用
 */
import { z } from 'zod';

// ── 共通バリデーター ──

const uuidSchema = z.string().uuid();

/** HH:MM 形式のJST時刻 */
const timeJstSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '時刻はHH:MM形式で入力してください');

/** 曜日配列（0=日, 1=月 ... 6=土）*/
const daysOfWeekSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1, '少なくとも1つの曜日を選択してください')
  .max(7);

// ── Cloud Account ──

export const createCloudAccountSchema = z.object({
  provider: z.enum(['aws', 'azure'], {
    required_error: 'プロバイダーを選択してください',
  }),
  arnRole: z.string().max(512).optional(),
  externalId: z.string().min(1, '外部IDは必須です').max(255),
  region: z.string().min(1, 'リージョンは必須です').max(50),
  accountAlias: z.string().max(255).optional(),
});

export const updateCloudAccountSchema = createCloudAccountSchema.partial();

export type CreateCloudAccountInput = z.infer<typeof createCloudAccountSchema>;
export type UpdateCloudAccountInput = z.infer<typeof updateCloudAccountSchema>;

// ── Schedule（Night-Watch）──

export const createScheduleSchema = z.object({
  resourceId: uuidSchema,
  startTimeJst: timeJstSchema,
  endTimeJst: timeJstSchema,
  daysOfWeek: daysOfWeekSchema,
});

export const updateScheduleSchema = createScheduleSchema
  .omit({ resourceId: true })
  .partial();

/** 延長リクエスト（1〜8時間）*/
export const overrideScheduleSchema = z.object({
  hours: z
    .number()
    .int()
    .min(1, '延長時間は1時間以上です')
    .max(8, '延長時間は8時間以内です'),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type OverrideScheduleInput = z.infer<typeof overrideScheduleSchema>;

// ── Organization ──

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, '組織名は必須です')
    .max(255, '組織名は255文字以内です'),
  jctId: z
    .string()
    .max(20)
    .regex(/^T\d{13}$/, '適格請求書発行事業者番号はT+13桁の数字です')
    .optional(),
  planType: z.enum(['free', 'pro', 'enterprise']).default('free'),
  paymentMethod: z.enum(['stripe', 'furikomi']).default('stripe'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// ── ページネーション ──

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ── 日付範囲 ──

export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine(
    (data) => data.endDate > data.startDate,
    { message: '終了日は開始日より後の日付を指定してください' },
  );

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

// ── LINE Integration ──

export const lineConfigSchema = z.object({
  isEnabled: z.boolean().default(true),
  notifyOnCostAlert: z.boolean().default(true),
  notifyOnNightWatch: z.boolean().default(true),
  notifyOnWeeklyReport: z.boolean().default(true),
  weeklyReportDay: z.number().int().min(0).max(6).default(1),
  weeklyReportHour: z.number().int().min(0).max(23).default(9),
});

export const updateLineConfigSchema = lineConfigSchema.partial();

export const sendReportSchema = z.object({
  orgId: uuidSchema.optional(),
  targetUserIds: z.array(uuidSchema).optional(),
});

export type LineConfigInput = z.infer<typeof lineConfigSchema>;
export type UpdateLineConfigInput = z.infer<typeof updateLineConfigSchema>;
export type SendReportInput = z.infer<typeof sendReportSchema>;

// ── Organization Settings ──

export const updateOrgSettingsSchema = z.object({
  lineIntegration: z.object({
    enabled: z.boolean(),
  }).partial().optional(),
  notifications: z.object({
    costAlertThresholdJpy: z.number().int().min(0).max(10_000_000),
    weeklyReportEnabled: z.boolean(),
    weeklyReportDay: z.number().int().min(0).max(6),
    weeklyReportHour: z.number().int().min(0).max(23),
  }).partial().optional(),
  nightWatch: z.object({
    defaultWarningMinutes: z.number().int().min(5).max(60),
    defaultExtendHours: z.number().int().min(1).max(8),
  }).partial().optional(),
});

export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;

// ── GreenOps ──

export const carbonCalculateSchema = z.object({
  orgId: z.string().uuid().optional(),
});

/** YYYY-MM 形式の月指定 */
export const greenReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '月はYYYY-MM形式で入力してください'),
});

export type CarbonCalculateInput = z.infer<typeof carbonCalculateSchema>;
export type GreenReportQueryInput = z.infer<typeof greenReportQuerySchema>;
