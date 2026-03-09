import { describe, it, expect } from 'vitest';
import { validateUrl } from './ssrf.js';
import { config } from '../config.js';

describe('SSRF Protection', () => {
  it('should allow valid http URL', async () => {
    await expect(validateUrl('http://example.com', config.allowedPorts)).resolves.not.toThrow();
  });

  it('should allow valid https URL', async () => {
    await expect(validateUrl('https://example.com', config.allowedPorts)).resolves.not.toThrow();
  });

  it('should reject file:// protocol', async () => {
    await expect(validateUrl('file:///etc/passwd', config.allowedPorts)).rejects.toThrow();
  });

  it('should reject ftp:// protocol', async () => {
    await expect(validateUrl('ftp://example.com', config.allowedPorts)).rejects.toThrow();
  });

  it('should reject localhost', async () => {
    await expect(validateUrl('http://localhost', config.allowedPorts)).rejects.toThrow();
  });

  it('should reject 127.0.0.1', async () => {
    await expect(validateUrl('http://127.0.0.1', config.allowedPorts)).rejects.toThrow();
  });

  it('should reject private IP ranges', async () => {
    await expect(validateUrl('http://192.168.1.1', config.allowedPorts)).rejects.toThrow();
    await expect(validateUrl('http://10.0.0.1', config.allowedPorts)).rejects.toThrow();
    await expect(validateUrl('http://172.16.0.1', config.allowedPorts)).rejects.toThrow();
  });

  it('should reject non-standard ports', async () => {
    await expect(validateUrl('http://example.com:8080', config.allowedPorts)).rejects.toThrow();
    await expect(validateUrl('http://example.com:22', config.allowedPorts)).rejects.toThrow();
  });

  it('should allow port 80', async () => {
    await expect(validateUrl('http://example.com:80', config.allowedPorts)).resolves.not.toThrow();
  });

  it('should allow port 443', async () => {
    await expect(validateUrl('https://example.com:443', config.allowedPorts)).resolves.not.toThrow();
  });

  it('should reject invalid URL format', async () => {
    await expect(validateUrl('not-a-url', config.allowedPorts)).rejects.toThrow();
  });
});

