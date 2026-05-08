/**
 * Cron auth helper — verifies that the request originates from
 * Vercel Cron (or another trusted scheduler).
 *
 * Defense in depth:
 *   1. `x-vercel-cron` header set by Vercel for scheduled invocations.
 *   2. Bearer token (`CRON_API_KEY`) for manual / self-hosted invocations.
 *
 * If neither succeeds, the request is rejected.
 */
export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const CRON_API_KEY = process.env.CRON_API_KEY || '';

export function verifyCronRequest(request: Request): CronAuthResult {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization') || '';
  const userAgent = request.headers.get('user-agent') || '';

  if (isVercelCron && userAgent.startsWith('vercel-cron/')) {
    return { ok: true };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!CRON_API_KEY || token !== CRON_API_KEY) {
    return { ok: false, status: 403, error: 'Invalid API key' };
  }
  return { ok: true };
}
