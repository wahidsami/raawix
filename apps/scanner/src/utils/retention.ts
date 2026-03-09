import { readdir, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import { StructuredLogger } from './logger.js';
import { getPrismaClient } from '../db/client.js';

/**
 * Scan retention policy: Delete scans older than retention period
 */
export class RetentionManager {
  private logger: StructuredLogger;

  constructor() {
    this.logger = new StructuredLogger();
  }

  /**
   * Clean up old scans based on retention policy
   * Deletes from both database and file system
   */
  async cleanupOldScans(): Promise<{ deleted: number; errors: number }> {
    if (!config.retention.enabled) {
      return { deleted: 0, errors: 0 };
    }

    const retentionMs = config.retention.days * 24 * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - retentionMs);
    let deleted = 0;
    let errors = 0;

    const prisma = await getPrismaClient();

    // Delete from database first
    if (prisma) {
      try {
        const oldScans = await prisma.scan.findMany({
          where: {
            completedAt: {
              lt: cutoffTime,
            },
            status: {
              in: ['completed', 'failed'],
            },
          },
          select: {
            scanId: true,
          },
        });

        for (const scan of oldScans) {
          try {
            // Delete from database (cascade will delete related records)
            await prisma.scan.delete({
              where: { scanId: scan.scanId },
            });

            // Delete from file system
            const scanPath = join(config.outputDir, scan.scanId);
            try {
              await rm(scanPath, { recursive: true, force: true });
            } catch (fsError) {
              this.logger.warn('Failed to delete scan directory', {
                scanId: scan.scanId,
                error: fsError instanceof Error ? fsError.message : 'Unknown error',
              });
            }

            this.logger.info('Deleted old scan', {
              scanId: scan.scanId,
              retentionDays: config.retention.days,
            });

            deleted++;
          } catch (error) {
            this.logger.error('Failed to delete scan', {
              scanId: scan.scanId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            errors++;
          }
        }
      } catch (error) {
        this.logger.error('Failed to cleanup old scans from database', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Also clean up file system scans that might not be in DB
    try {
      const outputDir = config.outputDir;
      const scanDirs = await readdir(outputDir, { withFileTypes: true });

      for (const dir of scanDirs) {
        if (!dir.isDirectory() || !dir.name.startsWith('scan_')) {
          continue;
        }

        try {
          const scanPath = join(outputDir, dir.name);
          const reportPath = join(scanPath, 'report.json');

          // Check report.json modification time (or directory creation time)
          let mtime: number;
          try {
            const stats = await stat(reportPath);
            mtime = stats.mtime.getTime();
          } catch {
            // If report.json doesn't exist, use directory mtime
            const dirStats = await stat(scanPath);
            mtime = dirStats.mtime.getTime();
          }

          // If scan is older than retention period, delete it
          if (mtime < cutoffTime.getTime()) {
            // Check if it's already deleted from DB
            if (prisma) {
              const dbScan = await prisma.scan.findUnique({
                where: { scanId: dir.name },
              });
              if (dbScan) {
                continue; // Already handled by DB cleanup
              }
            }

            this.logger.info('Deleting old scan from file system', {
              scanId: dir.name,
              ageDays: Math.floor((Date.now() - mtime) / (24 * 60 * 60 * 1000)),
              retentionDays: config.retention.days,
            });

            await rm(scanPath, { recursive: true, force: true });
            deleted++;
          }
        } catch (error) {
          this.logger.error('Failed to process scan for retention', {
            scanId: dir.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          errors++;
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old scans from file system', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (deleted > 0 || errors > 0) {
      this.logger.info('Retention cleanup completed', { deleted, errors });
    }

    return { deleted, errors };
  }
}

export const retentionManager = new RetentionManager();

// Run cleanup every 24 hours
setInterval(() => {
  retentionManager.cleanupOldScans().catch((error) => {
    console.error('Retention cleanup failed:', error);
  });
}, 24 * 60 * 60 * 1000);

