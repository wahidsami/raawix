import { Worker, Job } from 'bullmq';
import { SCAN_QUEUE_NAME, ScanJobData } from './scan-queue.js';
import { createRedisConnection } from './redis-connection.js';
import { StructuredLogger } from '../utils/logger.js';
import { isJobCanceled, clearCancellationFlag } from './cancel-manager.js';
import { scanRepository } from '../db/scan-repository.js';
import { config } from '../config.js';
// We will need to pull in the actual crawling logic. For now, we stub it 
// or import JobQueue to handle the processing part.

const logger = new StructuredLogger('scan-worker');

// Store active page captures to allow closing them upon cancellation
export const activePageCaptures = new Map<string, any>();

export function createWorker() {
  const connection = createRedisConnection();

  const worker = new Worker<ScanJobData>(
    SCAN_QUEUE_NAME,
    async (job: Job<ScanJobData>) => {
      const { scanId, request, isDiscoveryOnly } = job.data;
      
      logger.info('Worker picked up job', { scanId, isDiscoveryOnly, attempt: job.attemptsMade });

      // 1. Check if it was canceled while queued
      if (await isJobCanceled(scanId)) {
        logger.info('Job was canceled before execution started', { scanId });
        await scanRepository.updateScanStatus(scanId, 'canceled');
        await clearCancellationFlag(scanId);
        return;
      }

      // 2. Mark as running in DB
      await scanRepository.updateScanStatus(scanId, 'running');

      try {
        const { jobQueue } = await import('../index.js');
        
        // Find or create the job in the legacy queue so executeJob has state
        let legacyJob = jobQueue.getJob(scanId);
        if (!legacyJob) {
          legacyJob = {
            id: scanId,
            request,
            status: 'queued',
            ttl: Date.now() + config.quotas.maxRuntimeMs + 5 * 60 * 1000,
          };
          // Cast to any to access private queue
          (jobQueue as any).queue.push(legacyJob);
        }

        // Apply cancellation flag dynamically so executeJob observes it
        if (await isJobCanceled(scanId)) {
          (jobQueue as any).canceled.add(scanId);
        }

        // We execute the job by passing it to the jobQueue orchestrator
        // executeJob is private, so we use any
        await (jobQueue as any).executeJob(legacyJob, logger);

        // If the job was marked canceled by executeJob (which checks this.canceled), we handle it
        if ((jobQueue as any).canceled.has(scanId)) {
          await scanRepository.updateScanStatus(scanId, 'canceled');
        }

      } catch (error) {
        logger.error('Job execution failed', { scanId, error: error instanceof Error ? error.message : 'Unknown' });
        
        // If it's the final attempt, mark as failed in DB
        if (job.attemptsMade >= (job.opts.attempts || 1)) {
           await scanRepository.updateScanStatus(scanId, 'failed');
        }
        
        throw error; // Let BullMQ handle retries
      }
    },
    {
      connection,
      concurrency: config.maxConcurrentScans || 2,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('Worker failed job', { jobId: job?.id, error: err.message });
  });

  worker.on('completed', (job) => {
    logger.info('Worker completed job', { jobId: job.id });
  });

  return worker;
}
