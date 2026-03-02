import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── Organizations ──
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  jctId: varchar('jct_id', { length: 50 }),
  planType: varchar('plan_type', { length: 20 }).notNull().default('free'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('stripe'),
  settings: jsonb('settings').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Users ──
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  lineUserId: varchar('line_user_id', { length: 255 }),
  email: varchar('email', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('viewer'),
  displayName: varchar('display_name', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  preferences: jsonb('preferences').default({ lang: 'ja', tz: 'Asia/Tokyo' }).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_users_org_id').on(table.orgId),
  uniqueIndex('idx_users_line_user_id').on(table.lineUserId),
]);

// ── Cloud Accounts ──
export const cloudAccounts = pgTable('cloud_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  provider: varchar('provider', { length: 10 }).notNull().default('aws'),
  arnRole: varchar('arn_role', { length: 512 }),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  region: varchar('region', { length: 50 }).notNull().default('ap-northeast-1'),
  accountAlias: varchar('account_alias', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  lastScanAt: timestamp('last_scan_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_cloud_accounts_org_id').on(table.orgId),
]);

// ── Resources ──
export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  cloudAccountId: uuid('cloud_account_id').notNull().references(() => cloudAccounts.id),
  resourceType: varchar('resource_type', { length: 20 }).notNull(),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('unknown'),
  tags: jsonb('tags').default({}).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  monthlyCostJpy: real('monthly_cost_jpy').notNull().default(0),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_resources_cloud_account_id').on(table.cloudAccountId),
  uniqueIndex('idx_resources_external_id_account').on(table.cloudAccountId, table.externalId),
]);

// ── Schedules (Night-Watch) ──
export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  startTimeJst: varchar('start_time_jst', { length: 5 }).notNull().default('09:00'),
  endTimeJst: varchar('end_time_jst', { length: 5 }).notNull().default('18:00'),
  daysOfWeek: jsonb('days_of_week').default([1, 2, 3, 4, 5]).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  overrideUntil: timestamp('override_until'),
  overrideByUser: uuid('override_by_user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_schedules_resource_id').on(table.resourceId),
]);

// ── Cost & Carbon History ──
export const costCarbonHistory = pgTable('cost_carbon_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  amountJpy: real('amount_jpy').notNull().default(0),
  carbonFootprintKg: real('carbon_footprint_kg'),
  powerKwh: real('power_kwh'),
  emissionFactorSource: varchar('emission_factor_source', { length: 100 }),
  emissionFactor: real('emission_factor'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('idx_cost_carbon_resource_id').on(table.resourceId),
]);

// ── Optimizations (AI Advisor) ──
export const optimizations = pgTable('optimizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  recommendedBy: varchar('recommended_by', { length: 50 }),
  actionType: varchar('action_type', { length: 20 }).notNull(),
  actionDescription: text('action_description').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  savingsJpy: real('savings_jpy').notNull().default(0),
  co2ReducedKg: real('co2_reduced_kg').notNull().default(0),
  details: jsonb('details').default({}).notNull(),
  recommendedAt: timestamp('recommended_at').defaultNow().notNull(),
  executedAt: timestamp('executed_at'),
});

// ── Notifications ──
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  body: text('body').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  metadata: jsonb('metadata').default({}).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
});

// ── Audit Logs ──
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: varchar('target_id', { length: 255 }),
  details: jsonb('details').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_audit_logs_org_id').on(table.orgId),
]);

// ── Billing Records ──
export const billingRecords = pgTable('billing_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  amountJpy: real('amount_jpy').notNull(),
  taxJpy: real('tax_jpy').notNull(),
  totalJpy: real('total_jpy').notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  billingPeriodStart: timestamp('billing_period_start').notNull(),
  billingPeriodEnd: timestamp('billing_period_end').notNull(),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_billing_records_org_id').on(table.orgId),
]);

// ── Green Reports ──
export const greenReports = pgTable('green_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  reportMonth: varchar('report_month', { length: 7 }).notNull(),
  totalCarbonKg: real('total_carbon_kg').notNull().default(0),
  totalPowerKwh: real('total_power_kwh').notNull().default(0),
  totalCostJpy: real('total_cost_jpy').notNull().default(0),
  savingsCarbonKg: real('savings_carbon_kg').notNull().default(0),
  savingsCostJpy: real('savings_cost_jpy').notNull().default(0),
  details: jsonb('details').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_green_reports_org_id').on(table.orgId),
]);
