import { handleSynthesizeSpeech, type SynthesizeSpeechRequest } from '../../src/worker/ttsHandler.js';
import { checkRateLimit, getClientIp } from '../../src/worker/rateLimiter.js';

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

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`voice:${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please wait before generating more voice synthesis.',
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

    let reqPayload: SynthesizeSpeechRequest = {
      text: '',
      language: 'en',
      mode: 'story',
    };

    if (request.method === 'POST') {
      try {
        const body = (await request.json()) as Partial<SynthesizeSpeechRequest>;
        reqPayload = {
          text: body.text || '',
          language: body.language || 'en',
          mode: body.mode || 'story',
          voiceDirection: body.voiceDirection,
          speakingRate: body.speakingRate,
          pitch: body.pitch,
        };
      } catch {
        // Fallback to default payload
      }
    } else {
      const url = new URL(request.url);
      reqPayload = {
        text: url.searchParams.get('text') || '',
        language: url.searchParams.get('language') || 'en',
        mode: (url.searchParams.get('mode') as any) || 'story',
      };
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const result = await handleSynthesizeSpeech(reqPayload, apiKey);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 200, // Return 200 even on fallback so client reads provider: 'fallback'
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
  const rateCheck = checkRateLimit(`voice:${clientIp}`, 60, 60000);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSec || 1));
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please wait before generating more voice synthesis.',
      retryAfterSec: rateCheck.retryAfterSec,
    });
  }

  let reqPayload: SynthesizeSpeechRequest = {
    text: '',
    language: 'en',
    mode: 'story',
  };

  if (req.method === 'POST') {
    let bodyObj: any = req.body;
    if (typeof bodyObj === 'string') {
      try {
        bodyObj = JSON.parse(bodyObj);
      } catch {
        bodyObj = {};
      }
    }
    reqPayload = {
      text: bodyObj?.text || '',
      language: bodyObj?.language || 'en',
      mode: bodyObj?.mode || 'story',
      voiceDirection: bodyObj?.voiceDirection,
      speakingRate: bodyObj?.speakingRate,
      pitch: bodyObj?.pitch,
    };
  } else if (req.query) {
    reqPayload = {
      text: (req.query.text as string) || '',
      language: (req.query.language as string) || 'en',
      mode: (req.query.mode as any) || 'story',
    };
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const result = await handleSynthesizeSpeech(reqPayload, apiKey);

  return res.status(200).json(result);
}
