// 稟議サービス ユニットテスト
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB Mock ──
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// ── Schema Mock ──
vi.mock('../../db/schema', () => ({
  approvals: { id: 'id', orgId: 'org_id', status: 'status', requesterId: 'requester_id', urgency: 'urgency', expiresAt: 'expires_at' },
  users: {},
  resources: {},
}));

import { getApprovalStats, respondToApproval } from './service';
import { db } from '../../db';

// Helper: create mock approval
const makeApproval = (overrides: Record<string, any> = {}) => ({
  id: 'approval-1',
  orgId: 'org-1',
  requesterId: 'user-a',
  approverId: null,
  resourceId: null,
  title: 'EC2インスタンス起動申請',
  description: '本番環境の追加リソースが必要です',
  actionType: 'start',
  status: 'pending',
  urgency: 'normal',
  estimatedCostJpy: 15000,
  approverComment: null,
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── getApprovalStats ──
describe('getApprovalStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常: 全ステータスの集計が正確', async () => {
    const mockApprovals = [
      makeApproval({ status: 'pending', urgency: 'normal' }),
      makeApproval({ id: '2', status: 'approved', urgency: 'high' }),
      makeApproval({ id: '3', status: 'rejected', urgency: 'low' }),
      makeApproval({ id: '4', status: 'expired', urgency: 'normal' }),
      makeApproval({ id: '5', status: 'pending', urgency: 'high' }),
    ];

    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockApprovals),
    };
    vi.mocked(db.select).mockReturnValue(selectMock as any);

    const stats = await getApprovalStats('org-1');

    expect(stats.total).toBe(5);
    expect(stats.approved).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.expired).toBe(1);
    expect(stats.urgent).toBe(1); // only pending high urgency
  });

  it('正常: 空の組織は全て0', async () => {
    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(selectMock as any);

    const stats = await getApprovalStats('org-empty');

    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.approved).toBe(0);
    expect(stats.urgent).toBe(0);
  });

  it('正常: 期限切れpending は expiredとしてカウント', async () => {
    const expired = makeApproval({
      status: 'pending',
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
    });
    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([expired]),
    };
    vi.mocked(db.select).mockReturnValue(selectMock as any);

    const stats = await getApprovalStats('org-1');
    expect(stats.expired).toBe(1);
    expect(stats.pending).toBe(0);
  });
});

// ── respondToApproval ──
describe('respondToApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSelectMock = (approval: any) => {
    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(approval ? [approval] : []),
    };
    vi.mocked(db.select).mockReturnValue(selectMock as any);
  };

  const setupUpdateMock = (result: any) => {
    const updateMock = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([result]),
    };
    vi.mocked(db.update).mockReturnValue(updateMock as any);
  };

  it('正常: 承認できる', async () => {
    const approval = makeApproval({ status: 'pending' });
    const updated = { ...approval, status: 'approved', approverId: 'user-b' };

    setupSelectMock(approval);
    setupUpdateMock(updated);

    const result = await respondToApproval('org-1', 'approval-1', 'user-b', {
      status: 'approved',
      comment: '問題ありません',
    });

    expect(result.status).toBe('approved');
  });

  it('正常: 却下できる', async () => {
    const approval = makeApproval({ status: 'pending' });
    const updated = { ...approval, status: 'rejected', approverId: 'user-b' };

    setupSelectMock(approval);
    setupUpdateMock(updated);

    const result = await respondToApproval('org-1', 'approval-1', 'user-b', {
      status: 'rejected',
      comment: '予算超過のため却下',
    });

    expect(result.status).toBe('rejected');
  });

  it('エラー: 存在しない稟議はNOT_FOUNDをスロー', async () => {
    setupSelectMock(null);

    await expect(
      respondToApproval('org-1', 'nonexistent', 'user-b', { status: 'approved' }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('エラー: すでに承認済みはALREADY_RESPONDEDをスロー', async () => {
    const approval = makeApproval({ status: 'approved' });
    setupSelectMock(approval);

    await expect(
      respondToApproval('org-1', 'approval-1', 'user-b', { status: 'approved' }),
    ).rejects.toThrow('ALREADY_RESPONDED');
  });

  it('エラー: 自分の申請を承認しようとするとSELF_APPROVAL_NOT_ALLOWEDをスロー', async () => {
    const approval = makeApproval({ status: 'pending', requesterId: 'user-a' });
    setupSelectMock(approval);

    await expect(
      respondToApproval('org-1', 'approval-1', 'user-a', { status: 'approved' }),
    ).rejects.toThrow('SELF_APPROVAL_NOT_ALLOWED');
  });

  it('エラー: 有効期限切れはEXPIREDをスロー', async () => {
    const approval = makeApproval({
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000),
    });
    setupSelectMock(approval);

    const expiredUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.update).mockReturnValue(expiredUpdate as any);

    await expect(
      respondToApproval('org-1', 'approval-1', 'user-b', { status: 'approved' }),
    ).rejects.toThrow('EXPIRED');
  });
});

// ── LINE Flex Message テンプレート ──
describe('buildApprovalRequestFlex', () => {
  it('正常: Flex Messageオブジェクトが構築される', async () => {
    const { buildApprovalRequestFlex } = await import('../line/templates');

    const flex = buildApprovalRequestFlex({
      approvalId: 'approval-1',
      title: 'EC2停止申請',
      description: 'コスト削減のため停止します',
      actionType: 'stop',
      urgency: 'high',
      requesterName: '田中太郎',
      resourceName: 'web-api-prod-01',
      estimatedCostJpy: 12500,
      liffUrl: 'https://liff.line.me/1234567890',
    });

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('EC2停止申請');
    expect(flex.contents.type).toBe('bubble');
    expect(flex.contents.footer).toBeDefined();
  });

  it('正常: 承認・却下ボタンにapprovalIdが含まれる', async () => {
    const { buildApprovalRequestFlex } = await import('../line/templates');

    const flex = buildApprovalRequestFlex({
      approvalId: 'test-id-123',
      title: '申請',
      description: '説明',
      actionType: 'start',
      urgency: 'normal',
      requesterName: '鈴木花子',
      liffUrl: 'https://liff.line.me/xxx',
    });

    const footer = flex.contents.footer as any;
    const approveUri = footer.contents[0].action.uri;
    const rejectUri = footer.contents[1].action.uri;

    expect(approveUri).toContain('test-id-123');
    expect(approveUri).toContain('action=approve');
    expect(rejectUri).toContain('action=reject');
  });
});

describe('buildApprovalResultFlex', () => {
  it('正常: 承認結果Flex Messageが構築される', async () => {
    const { buildApprovalResultFlex } = await import('../line/templates');

    const flex = buildApprovalResultFlex({
      title: 'EC2起動申請',
      status: 'approved',
      approverName: '山田部長',
      comment: '問題なし',
    });

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('承認されました');
  });

  it('正常: 却下結果のaltTextに却下が含まれる', async () => {
    const { buildApprovalResultFlex } = await import('../line/templates');

    const flex = buildApprovalResultFlex({
      title: 'テスト申請',
      status: 'rejected',
      approverName: '佐藤部長',
    });

    expect(flex.altText).toContain('却下されました');
  });
});
