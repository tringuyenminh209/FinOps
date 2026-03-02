// FinOps Platform - Backend Entry Point

import { serve } from '@hono/node-server';
import { app } from './app';

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`🚀 FinOps Backend starting on port ${port}...`);

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
});
