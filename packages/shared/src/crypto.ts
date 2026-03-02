/**
 * FinOps Platform — APPI準拠 暗号化ユーティリティ
 * AES-256-GCM による個人情報の暗号化・復号
 * 個人情報保護法（APPI）のデータ保護要件に対応
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

function deriveKey(secretKey: string, salt: Buffer): Buffer {
  return scryptSync(secretKey, salt, KEY_LENGTH, SCRYPT_PARAMS);
}

/**
 * AES-256-GCM でテキストを暗号化
 * 出力形式: base64(salt + iv + authTag + ciphertext)
 */
export function encrypt(text: string, secretKey: string): string {
  if (!text) throw new Error('暗号化対象のテキストが空です');
  if (!secretKey) throw new Error('暗号化キーが指定されていません');

  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secretKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * AES-256-GCM で暗号化テキストを復号
 */
export function decrypt(encryptedText: string, secretKey: string): string {
  if (!encryptedText) throw new Error('復号対象のテキストが空です');
  if (!secretKey) throw new Error('復号キーが指定されていません');

  const combined = Buffer.from(encryptedText, 'base64');

  const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
  if (combined.length < minLength) {
    throw new Error('暗号化データの形式が不正です');
  }

  let offset = 0;
  const salt = combined.subarray(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  const iv = combined.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const authTag = combined.subarray(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;
  const ciphertext = combined.subarray(offset);

  const key = deriveKey(secretKey, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * SHA-256 ハッシュ生成（個人情報の検索用）
 * 不可逆変換のため、検索インデックスに使用可能
 */
export function hashPII(value: string): string {
  if (!value) throw new Error('ハッシュ対象の値が空です');
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
