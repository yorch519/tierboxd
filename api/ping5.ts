import type { IncomingMessage, ServerResponse } from 'node:http';
import { Ratelimit } from '@upstash/ratelimit';

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, ratelimit: typeof Ratelimit }));
}
