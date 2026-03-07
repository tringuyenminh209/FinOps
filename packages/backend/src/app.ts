// FinOps Platform — Hono App Configuration

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Module routes
import { authRoutes } from './modules/auth';
import { cloudConnectorRoutes } from './modules/cloud-connector';
import { nightWatchRoutes } from './modules/night-watch';
import { billingRoutes } from './modules/billing';
import { lineRoutes } from './modules/line';
import { carbonRoutes } from './modules/greenops';
import { aiRoutes } from './modules/ai-advisor';
import { orgRoutes } from './modules/org';
import { resourcesRoutes } from './modules/resources';
import { costsRoutes } from './modules/costs';
import { reportsRoutes } from './modules/reports';
import { approvalsRoutes } from './modules/approvals';

export const app = new Hono();

// ── グローバルミドルウェア ──
app.use('*', logger());
app.use('*', cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

// ── ヘルスチェック ──
app.get('/health', (c) => c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
}));

// ── API v1 ルート ──
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/accounts', cloudConnectorRoutes);
app.route('/api/v1/schedules', nightWatchRoutes);
app.route('/api/v1/billing', billingRoutes);

app.route('/api/v1/line', lineRoutes);
app.route('/api/v1/carbon', carbonRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/org', orgRoutes);
app.route('/api/v1/resources', resourcesRoutes);
app.route('/api/v1/costs', costsRoutes);
app.route('/api/v1/reports', reportsRoutes);
app.route('/api/v1/approvals', approvalsRoutes);

// ── 404 ──
app.notFound((c) => c.json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'ルートが見つかりません' },
}, 404));

// ── エラーハンドラ ──
app.onError((err, c) => {
    console.error('未処理エラー:', err);
    return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'サーバー内部エラーが発生しました' },
    }, 500);
});
