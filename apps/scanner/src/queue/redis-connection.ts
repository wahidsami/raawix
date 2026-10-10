import Redis from 'ioredis';
import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';

const logger = new StructuredLogger('redis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Connection config for BullMQ
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisConnection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis');
});

// For blocking operations (BullMQ workers need their own blocking connection)
export const createRedisConnection = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
};
