import { Queue } from 'bullmq';
import { redisConnection } from './redis-connection.js';
import { ScanRequest } from '@raawi-x/core';
import { StructuredLogger } from '../utils/logger.js';

export const SCAN_QUEUE_NAME = 'raawi-x-scan-queue';

export interface ScanJobData {
  scanId: string;
  request: ScanRequest;
  isDiscoveryOnly?: boolean;
}

export const scanQueue = new Queue<ScanJobData>(SCAN_QUEUE_NAME, {
  connection: redisConnection,
});

const logger = new StructuredLogger('scan-queue');

export const scanQueueApi = {
  submitScanJob: async function(scanId: string, request: ScanRequest, isDiscoveryOnly = false): Promise<void> {
    logger.info('Submitting job to BullMQ', { scanId, isDiscoveryOnly });
    
    await scanQueue.add(
      'scan',
      { scanId, request, isDiscoveryOnly },
      {
        jobId: scanId, // Ensures idempotency - you cannot submit the same scanId twice concurrently
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true, // Keep Redis clean
        removeOnFail: false, // Keep failed jobs for inspection
      }
    );
  },

  cancelScanJob: async function(scanId: string): Promise<boolean> {
    try {
      const job = await scanQueue.getJob(scanId);
      if (job) {
        if (await job.isActive()) {
          logger.info('Job is active, attempting to cancel via worker', { scanId });
        } else {
          await job.remove();
          logger.info('Removed queued job from BullMQ', { scanId });
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to cancel job in BullMQ', { scanId, error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  },

  shutdownQueue: async function(): Promise<void> {
    await scanQueue.close();
  }
};

export const { submitScanJob, cancelScanJob, shutdownQueue } = scanQueueApi;
