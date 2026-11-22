import type { IncomingMessage, ServerResponse } from 'node:http';

const IMAGE_ORIGIN = 'https://image.tmdb.org';
const ALLOWED_PATH = /^t\/p\/[a-zA-Z0-9_]+\/[A-Za-z0-9._-]+$/;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = (url.searchParams.get('path') ?? '').replace(/^\/+/, '');

  if (!ALLOWED_PATH.test(path)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  try {
    const upstream = await fetch(`${IMAGE_ORIGIN}/${path}`);
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end('Upstream image not found');
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'image/jpeg'
    );
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(buffer);
  } catch {
    res.statusCode = 502;
    res.end('Bad gateway');
  }
}
