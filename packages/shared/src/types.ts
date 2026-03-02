// FinOps Platform - Shared Type Definitions

// ── Organizations ──
export interface Organization {
    id: string;
    name: string;
    jctId: string | null;
    planType: 'free' | 'pro' | 'enterprise';
    stripeCustomerId: string | null;
    paymentMethod: 'stripe' | 'furikomi';
    settings: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// ── Users ──
export interface User {
    id: string;
    orgId: string;
    lineUserId: string | null;
    email: string | null;
    role: 'admin' | 'viewer' | 'operator';
    displayName: string | null;
    isActive: boolean;
    preferences: UserPreferences;
    lastLoginAt: Date | null;
    createdAt: Date;
}

export interface UserPreferences {
    lang: 'ja' | 'en';
    tz: string;
}

// ── Cloud Accounts ──
export interface CloudAccount {
    id: string;
    orgId: string;
    provider: 'aws' | 'azure';
    arnRole: string | null;
    externalId: string;
    region: string;
    accountAlias: string | null;
    isActive: boolean;
    lastScanAt: Date | null;
    createdAt: Date;
}

// ── Resources ──
export type ResourceType = 'ec2' | 'rds' | 's3' | 'lambda' | 'ebs' | 'ecs' | 'vm' | 'sql' | 'functions' | 'blob';
export type ResourceStatus = 'running' | 'stopped' | 'terminated' | 'unknown';

export interface Resource {
    id: string;
    cloudAccountId: string;
    resourceType: ResourceType;
    externalId: string;
    name: string | null;
    status: ResourceStatus;
    tags: Record<string, string>;
    metadata: ResourceMetadata;
    monthlyCostJpy: number;
    lastSeenAt: Date | null;
    createdAt: Date;
}

export interface ResourceMetadata {
    instanceType?: string;
    region?: string;
    az?: string;
    [key: string]: unknown;
}

// ── Schedules (Night-Watch) ──
export interface Schedule {
    id: string;
    resourceId: string;
    startTimeJst: string;   // "09:00"
    endTimeJst: string;     // "18:00"
    daysOfWeek: number[];   // [1,2,3,4,5]
    isActive: boolean;
    overrideUntil: Date | null;
    overrideByUser: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ── Cost & Carbon History ──
export interface CostCarbonEntry {
    id: string;
    resourceId: string;
    amountJpy: number;
    carbonFootprintKg: number | null;
    powerKwh: number | null;
    emissionFactorSource: string | null;
    emissionFactor: number | null;
    timestamp: Date;
}

// ── Optimizations (AI Advisor) ──
export type OptimizationAction = 'ri_purchase' | 'sp_purchase' | 'rightsize' | 'stop';
export type OptimizationStatus = 'pending' | 'approved' | 'executed' | 'dismissed';

export interface Optimization {
    id: string;
    resourceId: string;
    recommendedBy: string | null;
    actionType: OptimizationAction;
    actionDescription: string;
    status: OptimizationStatus;
    savingsJpy: number;
    co2ReducedKg: number;
    details: Record<string, unknown>;
    recommendedAt: Date;
    executedAt: Date | null;
}

// ── Notifications ──
export interface Notification {
    id: string;
    userId: string;
    channel: 'line' | 'email' | 'dashboard';
    type: 'alert' | 'report' | 'approval';
    title: string;
    body: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    metadata: Record<string, unknown>;
    sentAt: Date;
    readAt: Date | null;
}

// ── Billing ──
export interface BillingRecord {
    id: string;
    orgId: string;
    invoiceNumber: string;
    amountJpy: number;
    taxJpy: number;
    totalJpy: number;
    paymentMethod: 'stripe' | 'furikomi';
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    stripeInvoiceId: string | null;
    paidAt: Date | null;
    createdAt: Date;
}

// ── API Responses ──
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
    meta?: { page: number; total: number; limit: number };
}
