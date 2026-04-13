import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const AUTH_SECRET_PREFIX = 'enc:v1:';
const IV_BYTES = 12;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function isEncryptedAuthSecret(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(AUTH_SECRET_PREFIX);
}

export function encryptAuthSecret(plainText: string, encryptionKey: string): string {
  if (!plainText) return plainText;
  if (!encryptionKey) {
    throw new Error('AUTH_CREDENTIAL_ENCRYPTION_KEY is required to store raw auth secrets');
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${AUTH_SECRET_PREFIX}${toBase64Url(iv)}.${toBase64Url(authTag)}.${toBase64Url(encrypted)}`;
}

export function decryptAuthSecret(value: string, encryptionKey: string): string {
  if (!isEncryptedAuthSecret(value)) return value;
  if (!encryptionKey) {
    throw new Error('AUTH_CREDENTIAL_ENCRYPTION_KEY is required to read encrypted auth secrets');
  }

  const payload = value.slice(AUTH_SECRET_PREFIX.length);
  const [ivPart, authTagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Encrypted auth secret is malformed');
  }

  const decipher = createDecipheriv('aes-256-gcm', deriveKey(encryptionKey), fromBase64Url(ivPart));
  decipher.setAuthTag(fromBase64Url(authTagPart));
  const decrypted = Buffer.concat([decipher.update(fromBase64Url(encryptedPart)), decipher.final()]);
  return decrypted.toString('utf8');
}
