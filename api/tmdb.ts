import type { IncomingMessage, ServerResponse } from 'node:http';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const TMDB_ORIGIN = 'https://api.themoviedb.org/3';
const ALLOWED_PATH = /^(?:search\/movie|search\/tv|movie\/\d+|tv\/\d+)$/;
const TMDB_KEY_PATTERN = /^[a-f0-9]{32,64}$/i;

let limiter: Ratelimit | null = null;
const ephemeralCache = new Map<string, number>();

function getLimiter(): Ratelimit | null {
  if (process.env.RATE_LIMIT_ENABLED === 'false') return null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!limiter) {
    const parsed = Number(process.env.RATE_LIMIT_PER_MIN ?? 600);
    const perMinute = Number.isFinite(parsed) && parsed > 0 ? parsed : 600;
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.cachedFixedWindow(perMinute, '1 m'),
      ephemeralCache,
      prefix: 'tierboxd:ratelimit',
    });
  }

  return limiter;
}

async function checkRateLimit(identifier: string): Promise<{ success: boolean; reset: number }> {
  const activeLimiter = getLimiter();
  if (!activeLimiter) return { success: true, reset: Date.now() };

  try {
    const result = await activeLimiter.limit(identifier);
    return { success: result.success, reset: result.reset };
  } catch {
    return { success: true, reset: Date.now() };
  }
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function getOwnKey(req: IncomingMessage): string | null {
  const header = req.headers['x-tmdb-key'];
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === 'string' && TMDB_KEY_PATTERN.test(value) ? value : null;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const rawPath = url.searchParams.get('path') ?? '';
  const path = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');

  if (!ALLOWED_PATH.test(path)) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const ownKey = getOwnKey(req);
  const apiKey = ownKey ?? process.env.TMDB_API_KEY ?? '';

  if (!apiKey) {
    sendJson(res, 500, { error: 'TMDB API key is not configured' });
    return;
  }

  if (!ownKey) {
    const { success, reset } = await checkRateLimit(getClientIp(req));
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      sendJson(res, 429, { error: 'Too many requests' }, {
        'Retry-After': String(retryAfter),
      });
      return;
    }
  }

  const upstream = new URL(`${TMDB_ORIGIN}/${path}`);
  for (const [key, value] of url.searchParams) {
    if (key === 'path' || key === 'api_key') continue;
    upstream.searchParams.append(key, value);
  }
  upstream.searchParams.set('api_key', apiKey);

  try {
    const upstreamRes = await fetch(upstream, {
      headers: { Accept: 'application/json' },
    });
    const body = await upstreamRes.text();

    res.statusCode = upstreamRes.status;
    res.setHeader(
      'Content-Type',
      upstreamRes.headers.get('content-type') ?? 'application/json; charset=utf-8'
    );
    const cacheable = !ownKey && upstreamRes.status === 200;
    res.setHeader(
      'Cache-Control',
      cacheable
        ? 'public, s-maxage=604800, stale-while-revalidate=86400'
        : 'no-store'
    );
    res.end(body);
  } catch {
    sendJson(res, 502, { error: 'Upstream TMDB request failed' });
  }
}
