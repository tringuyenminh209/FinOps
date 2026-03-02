import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://finops:finops_dev_password@localhost:5432/finops_dev';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { schema };
export type Database = typeof db;
