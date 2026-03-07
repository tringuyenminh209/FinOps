-- Migration: 0004_approvals
-- 稟議システム (Approval Workflow)

CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('start', 'stop', 'resize', 'delete', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    urgency VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
    estimated_cost_jpy REAL DEFAULT 0,
    approver_comment TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_org_id ON approvals(org_id);
CREATE INDEX IF NOT EXISTS idx_approvals_requester_id ON approvals(requester_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(org_id, status);

COMMENT ON TABLE approvals IS '稟議申請テーブル — リソース操作の承認ワークフロー';
COMMENT ON COLUMN approvals.action_type IS 'start=起動, stop=停止, resize=スペック変更, delete=削除, other=その他';
COMMENT ON COLUMN approvals.urgency IS 'low=低, normal=通常, high=緊急';
