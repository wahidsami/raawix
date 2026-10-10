import { redisConnection } from './redis-connection.js';

const CANCEL_PREFIX = 'raawi-x:cancel:';

export async function markJobAsCanceled(scanId: string): Promise<void> {
  // Set a key with a TTL of 24 hours to mark the job as canceled
  await redisConnection.setex(`${CANCEL_PREFIX}${scanId}`, 86400, '1');
}

export async function isJobCanceled(scanId: string): Promise<boolean> {
  const result = await redisConnection.get(`${CANCEL_PREFIX}${scanId}`);
  return result === '1';
}

export async function clearCancellationFlag(scanId: string): Promise<void> {
  await redisConnection.del(`${CANCEL_PREFIX}${scanId}`);
}
