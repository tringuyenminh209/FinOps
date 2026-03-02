-- ============================================
-- FinOps Platform - Initial Database Migration
-- Core tables from docs/03-database-design.md
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. organizations ──
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    jct_id VARCHAR(20),
    plan_type VARCHAR(20) DEFAULT 'free'
        CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    stripe_customer_id VARCHAR(255),
    payment_method VARCHAR(20) DEFAULT 'stripe'
        CHECK (payment_method IN ('stripe', 'furikomi')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. users ──
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    line_user_id VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'viewer'
        CHECK (role IN ('admin', 'viewer', 'operator')),
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{"lang": "ja", "tz": "Asia/Tokyo"}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE UNIQUE INDEX idx_users_line ON users(line_user_id) WHERE line_user_id IS NOT NULL;

-- ── 3. cloud_accounts ──
CREATE TABLE cloud_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(10) NOT NULL CHECK (provider IN ('aws', 'azure')),
    arn_role VARCHAR(512),
    external_id VARCHAR(255) NOT NULL,
    region VARCHAR(50) DEFAULT 'ap-northeast-1',
    account_alias VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_scan_at TIMESTAMPTZ,
    scan_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cloud_accounts_org ON cloud_accounts(org_id);

-- ── 4. resources ──
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cloud_account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    resource_type VARCHAR(30) NOT NULL
        CHECK (resource_type IN ('ec2','rds','s3','lambda','ebs','ecs','vm','sql','functions','blob')),
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'unknown',
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    monthly_cost_jpy DECIMAL(12,2) DEFAULT 0,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cloud_account_id, external_id)
);

CREATE INDEX idx_resources_account ON resources(cloud_account_id);
CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);

-- ── 5. schedules (Night-Watch) ──
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    start_time_jst TIME DEFAULT '09:00',
    end_time_jst TIME DEFAULT '18:00',
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}',
    is_active BOOLEAN DEFAULT true,
    override_until TIMESTAMPTZ,
    override_by_user UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_resource ON schedules(resource_id);
CREATE INDEX idx_schedules_active ON schedules(is_active) WHERE is_active = true;

-- ── 6. cost_carbon_history (partitioned) ──
CREATE TABLE cost_carbon_history (
    id UUID DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    amount_jpy DECIMAL(12,2) NOT NULL,
    carbon_footprint_kg DECIMAL(10,4),
    power_kwh DECIMAL(10,4),
    emission_factor_source VARCHAR(50),
    emission_factor DECIMAL(6,4),
    recorded_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create partitions for current year
CREATE TABLE cost_carbon_history_2026_01 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE cost_carbon_history_2026_02 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE cost_carbon_history_2026_03 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE cost_carbon_history_2026_04 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE cost_carbon_history_2026_05 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE cost_carbon_history_2026_06 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE cost_carbon_history_2026_07 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE cost_carbon_history_2026_08 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE cost_carbon_history_2026_09 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE cost_carbon_history_2026_10 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE cost_carbon_history_2026_11 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE cost_carbon_history_2026_12 PARTITION OF cost_carbon_history FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX idx_cch_resource ON cost_carbon_history(resource_id);
CREATE INDEX idx_cch_recorded ON cost_carbon_history(recorded_at);

-- ── 7. optimizations (AI Advisor) ──
CREATE TABLE optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    recommended_by VARCHAR(50),
    action_type VARCHAR(30) NOT NULL
        CHECK (action_type IN ('ri_purchase', 'sp_purchase', 'rightsize', 'stop')),
    action_description TEXT,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'executed', 'dismissed')),
    savings_jpy DECIMAL(12,2) DEFAULT 0,
    co2_reduced_kg DECIMAL(10,4) DEFAULT 0,
    details JSONB DEFAULT '{}',
    recommended_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

CREATE INDEX idx_optimizations_resource ON optimizations(resource_id);
CREATE INDEX idx_optimizations_status ON optimizations(status);

-- ── 8. notifications ──
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('line', 'email', 'dashboard')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('alert', 'report', 'approval')),
    title VARCHAR(500) NOT NULL,
    body TEXT,
    status VARCHAR(20) DEFAULT 'sent'
        CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ── 9. billing_records ──
CREATE TABLE billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50),
    amount_jpy DECIMAL(12,2) NOT NULL,
    tax_jpy DECIMAL(12,2) NOT NULL,
    total_jpy DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('stripe', 'furikomi')),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    stripe_invoice_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_org ON billing_records(org_id);

-- ── 10. green_reports ──
CREATE TABLE green_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_month DATE NOT NULL,
    total_co2_kg DECIMAL(12,4) DEFAULT 0,
    total_power_kwh DECIMAL(12,4) DEFAULT 0,
    total_cost_jpy DECIMAL(12,2) DEFAULT 0,
    green_score DECIMAL(5,2) DEFAULT 0,
    breakdown_by_resource JSONB DEFAULT '[]',
    breakdown_by_region JSONB DEFAULT '[]',
    pdf_url VARCHAR(500),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_green_reports_org ON green_reports(org_id);

-- ── 11. audit_logs ──
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- Migration complete: 11 tables created
-- ============================================
