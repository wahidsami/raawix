import { auditLogger } from '../audit/logger.js';

/**
 * Structured logger with scanId correlation
 */
export class StructuredLogger {
  private scanId?: string;

  constructor(scanId?: string) {
    this.scanId = scanId;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      scanId: this.scanId,
      message,
      ...metadata,
    };

    // Use console for structured logging (can be replaced with proper logger)
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }

  setScanId(scanId: string): void {
    this.scanId = scanId;
  }
}

