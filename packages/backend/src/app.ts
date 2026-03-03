// FinOps Platform — Hono App Configuration

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Module routes
import { authRoutes } from './modules/auth';
import { cloudConnectorRoutes } from './modules/cloud-connector';
import { nightWatchRoutes } from './modules/night-watch';
import { billingRoutes } from './modules/billing';
// Phase 3
import { lineRoutes } from './modules/line';
// Phase 4+
// import { carbonRoutes } from './modules/greenops';
// import { aiRoutes } from './modules/ai-advisor';

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
    version: '0.5.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
}));

// ── API v1 ルート ──
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/accounts', cloudConnectorRoutes);
app.route('/api/v1/schedules', nightWatchRoutes);
app.route('/api/v1/billing', billingRoutes);

// Phase 3
app.route('/api/v1/line', lineRoutes);
// Phase 4+
// app.route('/api/v1/carbon', carbonRoutes);
// app.route('/api/v1/ai', aiRoutes);

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
