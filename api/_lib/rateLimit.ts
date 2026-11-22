import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  reset: number;
}

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!limiter) {
    const parsed = Number(process.env.RATE_LIMIT_PER_MIN ?? 600);
    const perMinute = Number.isFinite(parsed) && parsed > 0 ? parsed : 600;
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(perMinute, '1 m'),
      prefix: 'tierboxd:ratelimit',
    });
  }

  return limiter;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const activeLimiter = getLimiter();
  if (!activeLimiter) return { success: true, reset: Date.now() };

  try {
    const result = await activeLimiter.limit(identifier);
    return { success: result.success, reset: result.reset };
  } catch {
    return { success: true, reset: Date.now() };
  }
}
