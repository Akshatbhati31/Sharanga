import { handleTinyFishSearch, validateSearchParams } from '../../src/worker/tinyfishHandler.js';
import { checkRateLimit, getClientIp } from '../../src/worker/rateLimiter.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
};

export default async function handler(req: any, res?: any) {
  try {
    // Support Web standard Request / Edge / local tests
    if (req instanceof Request || (!res || typeof res.status !== 'function')) {
      const request = req as Request;
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      const clientIp = getClientIp(request);
      const rateCheck = checkRateLimit(`search:${clientIp}`, 60, 60000);
      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please wait before searching again.',
            retryAfterSec: rateCheck.retryAfterSec,
          }),
          {
            status: 429,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
              'Retry-After': String(rateCheck.retryAfterSec || 1),
            },
          }
        );
      }

      let rawParams: Record<string, unknown> = {};
      if (request.method === 'POST') {
        try {
          rawParams = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid JSON request payload.' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const url = new URL(request.url);
        rawParams = {
          topic: url.searchParams.get('topic') || '',
          grade: url.searchParams.get('grade') || undefined,
          resourceType: url.searchParams.get('resourceType') || 'any',
          language: url.searchParams.get('language') || 'English',
        };
      }

      const validation = validateSearchParams(rawParams);
      if (!validation.valid || !validation.sanitized) {
        return new Response(
          JSON.stringify({
            success: false,
            error: validation.error || 'Invalid search parameters.',
          }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const result = await handleTinyFishSearch(validation.sanitized, process.env.TINYFISH_API_KEY);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Node.js Serverless runtime (Vercel)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`search:${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec || 1));
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please wait before searching again.',
        retryAfterSec: rateCheck.retryAfterSec,
      });
    }

    let rawParams: Record<string, unknown> = {};
    if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        try {
          rawParams = JSON.parse(req.body);
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid JSON request payload.' });
        }
      } else if (typeof req.body === 'object' && req.body !== null) {
        rawParams = req.body;
      } else {
        rawParams = {};
      }
    } else {
      rawParams = {
        topic: req.query?.topic || '',
        grade: req.query?.grade || undefined,
        resourceType: req.query?.resourceType || 'any',
        language: req.query?.language || 'English',
      };
    }

    const validation = validateSearchParams(rawParams);
    if (!validation.valid || !validation.sanitized) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid search parameters.',
      });
    }

    const result = await handleTinyFishSearch(validation.sanitized, process.env.TINYFISH_API_KEY);
    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error processing TinyFish search.';
    if (res && typeof res.status === 'function') {
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
