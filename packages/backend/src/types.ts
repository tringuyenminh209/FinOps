// Shared Hono environment types for typed context variables
import type { AuthUser } from './middleware/auth';
import type { organizations } from './db/schema';

export type OrgRow = typeof organizations.$inferSelect;

export type AppEnv = {
  Variables: {
    user: AuthUser;
    org: OrgRow;
  };
};
