-- ============================================================================
-- FinOps Platform — コアテーブル マイグレーション
-- 設計書: docs/03-database-design.md 準拠
-- ============================================================================

-- ── Enum型 ──

DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stripe', 'furikomi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'viewer', 'operator');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cloud_provider AS ENUM ('aws', 'azure');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM (
    'ec2', 'rds', 's3', 'lambda', 'ebs', 'ecs',
    'vm', 'sql', 'functions', 'blob'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE resource_status AS ENUM ('running', 'stopped', 'terminated', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE optimization_action AS ENUM ('ri_purchase', 'sp_purchase', 'rightsize', 'stop');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE optimization_status AS ENUM ('pending', 'approved', 'executed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('line', 'email', 'dashboard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('alert', 'report', 'approval');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'login', 'logout',
    'approve', 'execute', 'override', 'export'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── uuid-ossp 拡張（UUID生成用）──

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- テーブル作成
-- ============================================================================

-- ── organizations（組織）──

CREATE TABLE IF NOT EXISTS organizations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  jct_id         VARCHAR(20),
  plan_type      plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  payment_method payment_method NOT NULL DEFAULT 'stripe',
  settings       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_jct_id ON organizations (jct_id);
CREATE INDEX IF NOT EXISTS idx_org_stripe_customer ON organizations (stripe_customer_id);

-- ── users（ユーザー）──

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  line_user_id   VARCHAR(64),
  email          VARCHAR(320),
  role           user_role NOT NULL DEFAULT 'viewer',
  display_name   VARCHAR(255),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  preferences    JSONB NOT NULL DEFAULT '{"lang": "ja", "tz": "Asia/Tokyo"}',
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_line_id ON users (line_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_user_org ON users (org_id);

-- ── cloud_accounts（クラウドアカウント）──

CREATE TABLE IF NOT EXISTS cloud_accounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider       cloud_provider NOT NULL,
  arn_role       VARCHAR(512),
  external_id    VARCHAR(255) NOT NULL,
  region         VARCHAR(50) NOT NULL,
  account_alias  VARCHAR(255),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_scan_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_account_org ON cloud_accounts (org_id);
CREATE INDEX IF NOT EXISTS idx_cloud_account_provider ON cloud_accounts (provider);

-- ── resources（リソース）──

CREATE TABLE IF NOT EXISTS resources (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cloud_account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
  resource_type    resource_type NOT NULL,
  external_id      VARCHAR(512) NOT NULL,
  name             VARCHAR(255),
  status           resource_status NOT NULL DEFAULT 'unknown',
  tags             JSONB NOT NULL DEFAULT '{}',
  metadata         JSONB NOT NULL DEFAULT '{}',
  monthly_cost_jpy NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_seen_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_external ON resources (cloud_account_id, external_id);
CREATE INDEX IF NOT EXISTS idx_resource_type ON resources (resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_status ON resources (status);

-- ── schedules（Night-Watch スケジュール）──

CREATE TABLE IF NOT EXISTS schedules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id      UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  start_time_jst   VARCHAR(5) NOT NULL,
  end_time_jst     VARCHAR(5) NOT NULL,
  days_of_week     JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  override_until   TIMESTAMPTZ,
  override_by_user UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_schedule_time_format CHECK (
    start_time_jst ~ '^[0-2][0-9]:[0-5][0-9]$'
    AND end_time_jst ~ '^[0-2][0-9]:[0-5][0-9]$'
  )
);

CREATE INDEX IF NOT EXISTS idx_schedule_resource ON schedules (resource_id);
CREATE INDEX IF NOT EXISTS idx_schedule_active ON schedules (is_active);

-- ── cost_carbon_history（コスト・CO2履歴）──

CREATE TABLE IF NOT EXISTS cost_carbon_history (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id            UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  record_date            TIMESTAMPTZ NOT NULL,
  amount_jpy             NUMERIC(12, 2) NOT NULL,
  carbon_footprint_kg    NUMERIC(10, 4),
  power_kwh              NUMERIC(10, 4),
  emission_factor_source VARCHAR(100),
  emission_factor        NUMERIC(8, 6),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cost_positive CHECK (amount_jpy >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cost_resource_date ON cost_carbon_history (resource_id, record_date);
CREATE INDEX IF NOT EXISTS idx_cost_date ON cost_carbon_history (record_date);

-- ── optimizations（AI最適化提案）──

CREATE TABLE IF NOT EXISTS optimizations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id        UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  recommended_by     VARCHAR(100),
  action_type        optimization_action NOT NULL,
  action_description TEXT NOT NULL,
  status             optimization_status NOT NULL DEFAULT 'pending',
  savings_jpy        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  co2_reduced_kg     NUMERIC(10, 4) NOT NULL DEFAULT 0,
  details            JSONB NOT NULL DEFAULT '{}',
  recommended_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at        TIMESTAMPTZ,
  CONSTRAINT chk_savings_positive CHECK (savings_jpy >= 0)
);

CREATE INDEX IF NOT EXISTS idx_optimization_resource ON optimizations (resource_id);
CREATE INDEX IF NOT EXISTS idx_optimization_status ON optimizations (status);

-- ── notifications（通知）──

CREATE TABLE IF NOT EXISTS notifications (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel   notification_channel NOT NULL,
  type      notification_type NOT NULL,
  title     VARCHAR(500) NOT NULL,
  body      TEXT NOT NULL,
  status    notification_status NOT NULL DEFAULT 'sent',
  metadata  JSONB NOT NULL DEFAULT '{}',
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notification_sent ON notifications (sent_at);

-- ── audit_logs（監査ログ）──

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   UUID,
  details     JSONB NOT NULL DEFAULT '{}',
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);

-- ── billing_records（請求記録 — 適格請求書対応）──

CREATE TABLE IF NOT EXISTS billing_records (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number       VARCHAR(50) NOT NULL,
  amount_jpy           NUMERIC(12, 2) NOT NULL,
  tax_jpy              NUMERIC(12, 2) NOT NULL,
  total_jpy            NUMERIC(12, 2) NOT NULL,
  payment_method       payment_method NOT NULL,
  status               billing_status NOT NULL DEFAULT 'pending',
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end   TIMESTAMPTZ NOT NULL,
  stripe_invoice_id    VARCHAR(255),
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_billing_amounts CHECK (
    amount_jpy >= 0 AND tax_jpy >= 0 AND total_jpy >= 0
  ),
  CONSTRAINT chk_billing_period CHECK (
    billing_period_end > billing_period_start
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoice ON billing_records (invoice_number);
CREATE INDEX IF NOT EXISTS idx_billing_org ON billing_records (org_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_records (status);
CREATE INDEX IF NOT EXISTS idx_billing_period ON billing_records (billing_period_start, billing_period_end);

-- ── green_reports（GreenOpsレポート）──

CREATE TABLE IF NOT EXISTS green_reports (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_month           VARCHAR(7) NOT NULL,
  total_carbon_kg        NUMERIC(12, 4) NOT NULL,
  total_power_kwh        NUMERIC(12, 4) NOT NULL,
  total_cost_jpy         NUMERIC(14, 2) NOT NULL,
  savings_vs_baseline_jpy NUMERIC(14, 2),
  carbon_reduction_kg    NUMERIC(12, 4),
  resource_breakdown     JSONB NOT NULL DEFAULT '[]',
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_green_report_org_month ON green_reports (org_id, report_month);
CREATE INDEX IF NOT EXISTS idx_green_report_month ON green_reports (report_month);

-- ============================================================================
-- Row Level Security（RLS）— マルチテナント分離
-- ============================================================================

ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_carbon_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_reports        ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 組織ベースの分離
-- current_setting('app.current_org_id') でリクエスト毎にorg_idを設定

CREATE POLICY org_isolation ON organizations
  USING (id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY user_org_isolation ON users
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY cloud_account_org_isolation ON cloud_accounts
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY resource_org_isolation ON resources
  USING (cloud_account_id IN (
    SELECT id FROM cloud_accounts
    WHERE org_id = current_setting('app.current_org_id', true)::uuid
  ));

CREATE POLICY schedule_org_isolation ON schedules
  USING (resource_id IN (
    SELECT r.id FROM resources r
    JOIN cloud_accounts ca ON r.cloud_account_id = ca.id
    WHERE ca.org_id = current_setting('app.current_org_id', true)::uuid
  ));

CREATE POLICY cost_org_isolation ON cost_carbon_history
  USING (resource_id IN (
    SELECT r.id FROM resources r
    JOIN cloud_accounts ca ON r.cloud_account_id = ca.id
    WHERE ca.org_id = current_setting('app.current_org_id', true)::uuid
  ));

CREATE POLICY optimization_org_isolation ON optimizations
  USING (resource_id IN (
    SELECT r.id FROM resources r
    JOIN cloud_accounts ca ON r.cloud_account_id = ca.id
    WHERE ca.org_id = current_setting('app.current_org_id', true)::uuid
  ));

CREATE POLICY notification_org_isolation ON notifications
  USING (user_id IN (
    SELECT id FROM users
    WHERE org_id = current_setting('app.current_org_id', true)::uuid
  ));

CREATE POLICY audit_org_isolation ON audit_logs
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY billing_org_isolation ON billing_records
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY green_report_org_isolation ON green_reports
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ============================================================================
-- updated_at 自動更新トリガー
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
