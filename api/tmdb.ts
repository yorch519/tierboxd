import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleTmdb } from './_lib/tmdbProxy';

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleTmdb(req, res);
}
