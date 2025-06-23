import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const setUserOnline = async (userId: string, ttl = 60) => {
  await redis.set(`presence:${userId}`, 'online', 'EX', ttl);
};

export const setUserOffline = async (userId: string) => {
  await redis.del(`presence:${userId}`);
};

export const isUserOnline = async (userId: string) => {
  return (await redis.get(`presence:${userId}`)) === 'online';
};

export const publishPresence = async (userId: string, status: 'online' | 'offline') => {
  await redis.publish(`presence-updates:${userId}`, status);
};

export default redis;