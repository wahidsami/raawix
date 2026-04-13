import { describe, expect, it } from 'vitest';
import {
  decryptAuthSecret,
  encryptAuthSecret,
  isEncryptedAuthSecret,
} from './auth-secret-crypto.js';

describe('auth-secret-crypto', () => {
  const key = 'test-auth-credential-key';

  it('encrypts and decrypts auth secrets', () => {
    const encrypted = encryptAuthSecret('super-secret-password', key);
    expect(isEncryptedAuthSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain('super-secret-password');
    expect(decryptAuthSecret(encrypted, key)).toBe('super-secret-password');
  });

  it('passes through non-encrypted values during decrypt', () => {
    expect(decryptAuthSecret('plain-legacy-secret', key)).toBe('plain-legacy-secret');
    expect(isEncryptedAuthSecret('plain-legacy-secret')).toBe(false);
  });

  it('throws when trying to encrypt without a key', () => {
    expect(() => encryptAuthSecret('secret', '')).toThrow('AUTH_CREDENTIAL_ENCRYPTION_KEY');
  });
});
