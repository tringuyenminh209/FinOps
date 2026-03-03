import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, hashPII } from './crypto';

const TEST_KEY = 'super-secret-test-key-for-finops-platform-2026';

describe('AES-256-GCM 暗号化・復号', () => {
  it('正常: テキストを暗号化して復号できる', () => {
    const plaintext = 'テスト個人情報: 田中太郎';
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);

    expect(decrypted).toBe(plaintext);
  });

  it('正常: 同じ入力でも毎回異なる暗号文を生成（salt/IV のランダム性）', () => {
    const plaintext = 'Hello World';
    const enc1 = encrypt(plaintext, TEST_KEY);
    const enc2 = encrypt(plaintext, TEST_KEY);

    expect(enc1).not.toBe(enc2);

    expect(decrypt(enc1, TEST_KEY)).toBe(plaintext);
    expect(decrypt(enc2, TEST_KEY)).toBe(plaintext);
  });

  it('正常: 空でない文字列は暗号化可能', () => {
    const cases = ['a', '🎉', '日本語テスト', 'a'.repeat(10000)];

    for (const text of cases) {
      const encrypted = encrypt(text, TEST_KEY);
      const decrypted = decrypt(encrypted, TEST_KEY);
      expect(decrypted).toBe(text);
    }
  });

  it('正常: 暗号文は base64 エンコードされている', () => {
    const encrypted = encrypt('test', TEST_KEY);
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    expect(base64Regex.test(encrypted)).toBe(true);
  });

  it('異常: 空テキストは暗号化エラー', () => {
    expect(() => encrypt('', TEST_KEY)).toThrow('暗号化対象のテキストが空です');
  });

  it('異常: 空キーは暗号化エラー', () => {
    expect(() => encrypt('test', '')).toThrow('暗号化キーが指定されていません');
  });

  it('異常: 空テキストは復号エラー', () => {
    expect(() => decrypt('', TEST_KEY)).toThrow('復号対象のテキストが空です');
  });

  it('異常: 空キーは復号エラー', () => {
    const encrypted = encrypt('test', TEST_KEY);
    expect(() => decrypt(encrypted, '')).toThrow('復号キーが指定されていません');
  });

  it('異常: 不正なキーでは復号失敗', () => {
    const encrypted = encrypt('sensitive data', TEST_KEY);
    expect(() => decrypt(encrypted, 'wrong-key')).toThrow();
  });

  it('異常: 改竄された暗号文は復号失敗', () => {
    const encrypted = encrypt('test', TEST_KEY);
    const buf = Buffer.from(encrypted, 'base64');
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString('base64');

    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });

  it('異常: 短すぎるデータは復号エラー', () => {
    const shortData = Buffer.alloc(10).toString('base64');
    expect(() => decrypt(shortData, TEST_KEY)).toThrow('暗号化データの形式が不正です');
  });
});

describe('SHA-256 ハッシュ (PII)', () => {
  it('正常: 同じ入力は同じハッシュ', () => {
    const hash1 = hashPII('tanaka@example.com');
    const hash2 = hashPII('tanaka@example.com');
    expect(hash1).toBe(hash2);
  });

  it('正常: 異なる入力は異なるハッシュ', () => {
    const hash1 = hashPII('user-a@example.com');
    const hash2 = hashPII('user-b@example.com');
    expect(hash1).not.toBe(hash2);
  });

  it('正常: ハッシュは64文字の16進数', () => {
    const hash = hashPII('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('異常: 空値はエラー', () => {
    expect(() => hashPII('')).toThrow('ハッシュ対象の値が空です');
  });

  it('正常: 日本語もハッシュ可能', () => {
    const hash = hashPII('田中太郎');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
