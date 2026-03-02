// FinOps Platform - Hono App Configuration

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Module routes (to be implemented)
// import { accountRoutes } from './modules/cloud-connector/routes';
// import { scheduleRoutes } from './modules/night-watch/routes';
// import { carbonRoutes } from './modules/greenops/routes';
// import { aiRoutes } from './modules/ai-advisor/routes';
// import { lineRoutes } from './modules/line/routes';
// import { billingRoutes } from './modules/billing/routes';
// import { authRoutes } from './modules/auth/routes';

export const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API v1 routes (uncomment as modules are implemented)
// app.route('/api/v1/auth', authRoutes);
// app.route('/api/v1/accounts', accountRoutes);
// app.route('/api/v1/resources', resourceRoutes);
// app.route('/api/v1/schedules', scheduleRoutes);
// app.route('/api/v1/costs', costRoutes);
// app.route('/api/v1/carbon', carbonRoutes);
// app.route('/api/v1/ai', aiRoutes);
// app.route('/api/v1/billing', billingRoutes);
// app.route('/api/v1/line', lineRoutes);
// app.route('/api/v1/org', orgRoutes);

// 404 handler
app.notFound((c) => c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
});
