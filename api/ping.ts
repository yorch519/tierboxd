import type { IncomingMessage, ServerResponse } from 'node:http';
import { checkRateLimit } from './_lib/rateLimit';

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const result = await checkRateLimit('probe');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, result }));
}
