-- Phase 3: LINE Integration マイグレーション
-- LINE通知設定・配信履歴・週次レポートテーブル

-- ── LINE Config ──
CREATE TABLE IF NOT EXISTS line_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    line_user_id VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    notify_on_cost_alert BOOLEAN NOT NULL DEFAULT true,
    notify_on_night_watch BOOLEAN NOT NULL DEFAULT true,
    notify_on_weekly_report BOOLEAN NOT NULL DEFAULT true,
    weekly_report_day INTEGER NOT NULL DEFAULT 1,
    weekly_report_hour INTEGER NOT NULL DEFAULT 9,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_configs_org_id ON line_configs(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_line_configs_line_user_id ON line_configs(line_user_id);

-- ── LINE Deliveries ──
CREATE TABLE IF NOT EXISTS line_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    line_user_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    flex_message_payload JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_line_deliveries_org_id ON line_deliveries(org_id);
CREATE INDEX IF NOT EXISTS idx_line_deliveries_user_id ON line_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_line_deliveries_sent_at ON line_deliveries(sent_at DESC);

-- ── Weekly Reports ──
CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_cost_jpy REAL NOT NULL DEFAULT 0,
    previous_cost_jpy REAL NOT NULL DEFAULT 0,
    cost_change_percent REAL NOT NULL DEFAULT 0,
    resource_count INTEGER NOT NULL DEFAULT 0,
    stopped_hours INTEGER NOT NULL DEFAULT 0,
    savings_jpy REAL NOT NULL DEFAULT 0,
    top_resources JSONB NOT NULL DEFAULT '[]',
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_org_id ON weekly_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_generated_at ON weekly_reports(generated_at DESC);

-- ── organizations.settings にデフォルト通知設定を追加 ──
COMMENT ON TABLE line_configs IS 'LINE Messaging API 通知設定 — ユーザーごとの通知プリファレンス';
COMMENT ON TABLE line_deliveries IS 'LINE メッセージ配信履歴 — Flex Message送信ログ';
COMMENT ON TABLE weekly_reports IS '週次コストレポート — Night-Watch実績・コスト推移サマリー';
