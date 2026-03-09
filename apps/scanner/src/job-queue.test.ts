import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobQueue } from './job-queue.js';
import type { ScanRequest } from '@raawi-x/core';
import { config } from './config.js';

describe('JobQueue', () => {
  let jobQueue: JobQueue;

  beforeEach(() => {
    jobQueue = new JobQueue();
  });

  describe('Concurrency', () => {
    it('should respect maxConcurrentScans limit', async () => {
      const maxConcurrent = config.maxConcurrentScans;
      const promises: Promise<string>[] = [];

      // Create more jobs than the limit
      for (let i = 0; i < maxConcurrent + 3; i++) {
        const request: ScanRequest = {
          seedUrl: `https://example${i}.com`,
          maxPages: 1,
          maxDepth: 0,
        };
        promises.push(jobQueue.addJob(request));
      }

      const scanIds = await Promise.all(promises);

      // All jobs should be queued
      expect(scanIds.length).toBe(maxConcurrent + 3);

      // Check that only maxConcurrent are running
      // Note: This is a timing-dependent test, so we check the structure
      const jobs = scanIds.map((id) => jobQueue.getJob(id));
      const runningJobs = jobs.filter((job) => job?.status === 'running');
      
      // Should have at most maxConcurrent running
      expect(runningJobs.length).toBeLessThanOrEqual(maxConcurrent);
      
      // Clean up - wait a bit for jobs to potentially complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Quotas', () => {
    it('should enforce maxPages hard limit', async () => {
      const request: ScanRequest = {
        seedUrl: 'https://example.com',
        maxPages: 1000, // Exceeds limit
      };

      const scanId = await jobQueue.addJob(request);
      const job = jobQueue.getJob(scanId);
      
      // Should be capped at hard limit
      expect(job?.request.maxPages).toBeLessThanOrEqual(config.quotas.maxPagesHardLimit);
    });

    it('should accept maxPages within limit', async () => {
      const request: ScanRequest = {
        seedUrl: 'https://example.com',
        maxPages: 50,
      };

      const scanId = await jobQueue.addJob(request);
      const job = jobQueue.getJob(scanId);
      
      expect(job?.request.maxPages).toBe(50);
    });
  });

  describe('Dry Run', () => {
    it('should complete immediately in dry run mode', async () => {
      const request: ScanRequest = {
        seedUrl: 'https://example.com',
        maxPages: 10,
      };

      const scanId = await jobQueue.addJob({ ...request, dryRun: true } as any);
      const job = jobQueue.getJob(scanId);
      
      expect(job?.status).toBe('completed');
      expect(job?.scanRun?.completedAt).toBeDefined();
      expect(job?.scanRun?.summary?.totalPages).toBe(0);
    });
  });
});

