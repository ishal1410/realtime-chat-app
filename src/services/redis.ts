import Redis from 'ioredis';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export async function connectRedis() {
  try {
    await redisClient.ping();
    console.log('Redis connected');
  } catch (err) {
    console.error('Redis connection error:', err);
    process.exit(1);
  }
}