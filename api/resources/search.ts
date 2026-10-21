import { handleTinyFishSearch, validateSearchParams } from '../../src/worker/tinyfishHandler';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
};

export default async function handler(req: any, res?: any) {
  // Support Web standard Request / Edge / local tests
  if (req instanceof Request || (!res || typeof res.status !== 'function')) {
    const request = req as Request;
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
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
}
