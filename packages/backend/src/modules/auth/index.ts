// 認証モジュール — LINE Login、JWT、セッション管理、APPI対応
export { authRoutes } from './routes';
export { authMiddleware, requireRole, createJwt, verifyJwt } from '../../middleware/auth';
export type { AuthUser, JwtPayload } from '../../middleware/auth';
export { tenantMiddleware } from '../../middleware/tenant';
export {
  verifyLineToken,
  findOrCreateUser,
  generateJwt,
  generateRefreshToken,
  getUserById,
  AuthError,
} from './service';
export type { LineProfile } from './service';
export {
  recordConsent,
  checkConsent,
  revokeConsent,
  getAllConsents,
  generatePrivacyReport,
  deleteUserData,
} from './appi';
export type { ConsentPurpose, ConsentRecord } from './appi';
