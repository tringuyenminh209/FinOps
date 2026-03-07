// 稟議ワークフロー サービス
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { approvals, users, resources } from '../../db/schema';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ApprovalActionType = 'start' | 'stop' | 'resize' | 'delete' | 'other';
export type ApprovalUrgency = 'low' | 'normal' | 'high';

export interface CreateApprovalInput {
  resourceId?: string;
  title: string;
  description: string;
  actionType: ApprovalActionType;
  urgency: ApprovalUrgency;
  estimatedCostJpy?: number;
  expiresInHours?: number;
}

export interface RespondApprovalInput {
  status: 'approved' | 'rejected';
  comment?: string;
}

/** 稟議申請作成 */
export async function createApproval(
  orgId: string,
  requesterId: string,
  input: CreateApprovalInput,
) {
  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
    : new Date(Date.now() + 48 * 60 * 60 * 1000); // default 48h

  const [approval] = await db
    .insert(approvals)
    .values({
      orgId,
      requesterId,
      resourceId: input.resourceId ?? null,
      title: input.title,
      description: input.description,
      actionType: input.actionType,
      urgency: input.urgency,
      estimatedCostJpy: input.estimatedCostJpy ?? 0,
      expiresAt,
      status: 'pending',
    })
    .returning();

  return approval;
}

/** 組織の稟議一覧取得 */
export async function getApprovals(
  orgId: string,
  filters: { status?: ApprovalStatus; requesterId?: string; limit?: number } = {},
) {
  const { limit = 50 } = filters;

  const rows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.orgId, orgId))
    .orderBy(desc(approvals.createdAt))
    .limit(limit);

  // Apply in-memory filters
  let filtered = rows;
  if (filters.status) filtered = filtered.filter((a) => a.status === filters.status);
  if (filters.requesterId) filtered = filtered.filter((a) => a.requesterId === filters.requesterId);

  // Auto-expire
  const now = new Date();
  const withExpiry = filtered.map((a) => {
    if (a.status === 'pending' && a.expiresAt && a.expiresAt < now) {
      return { ...a, status: 'expired' as ApprovalStatus };
    }
    return a;
  });

  return withExpiry;
}

/** 稟議詳細取得 */
export async function getApprovalById(orgId: string, approvalId: string) {
  const [approval] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.id, approvalId), eq(approvals.orgId, orgId)))
    .limit(1);

  return approval ?? null;
}

/** 稟議に回答 (承認/却下) */
export async function respondToApproval(
  orgId: string,
  approvalId: string,
  approverId: string,
  input: RespondApprovalInput,
) {
  const approval = await getApprovalById(orgId, approvalId);
  if (!approval) throw new Error('NOT_FOUND');
  if (approval.status !== 'pending') throw new Error('ALREADY_RESPONDED');
  if (approval.requesterId === approverId) throw new Error('SELF_APPROVAL_NOT_ALLOWED');

  // Check expiry
  if (approval.expiresAt && approval.expiresAt < new Date()) {
    await db
      .update(approvals)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(approvals.id, approvalId));
    throw new Error('EXPIRED');
  }

  const [updated] = await db
    .update(approvals)
    .set({
      status: input.status,
      approverId,
      approverComment: input.comment ?? null,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(approvals.id, approvalId))
    .returning();

  return updated;
}

/** 稟議サマリ統計 */
export async function getApprovalStats(orgId: string) {
  const all = await db
    .select()
    .from(approvals)
    .where(eq(approvals.orgId, orgId));

  const now = new Date();
  const pending = all.filter(
    (a) => a.status === 'pending' && (!a.expiresAt || a.expiresAt > now),
  ).length;
  const approved = all.filter((a) => a.status === 'approved').length;
  const rejected = all.filter((a) => a.status === 'rejected').length;
  const expired = all.filter(
    (a) => a.status === 'expired' || (a.status === 'pending' && a.expiresAt && a.expiresAt <= now),
  ).length;
  const urgent = all.filter(
    (a) => a.status === 'pending' && a.urgency === 'high' && (!a.expiresAt || a.expiresAt > now),
  ).length;

  return { total: all.length, pending, approved, rejected, expired, urgent };
}
