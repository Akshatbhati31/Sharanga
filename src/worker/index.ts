import {
  handleTinyFishSearch,
  validateSearchParams,
} from './tinyfishHandler';
import {
  handleGenerateActivity,
  type GenerateActivityRequest,
} from './aiHandler';

export interface Env {
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>;
  };
  TINYFISH_API_KEY?: string;
  AI_API_KEY?: string;
}


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Endpoint: GET /api/tinyfish/status
    if (url.pathname === '/api/tinyfish/status') {
      const configured = Boolean(
        env.TINYFISH_API_KEY &&
        env.TINYFISH_API_KEY.trim() !== '' &&
        !env.TINYFISH_API_KEY.includes('placeholder')
      );
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'TinyFish',
          configured,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Endpoint: POST /api/tinyfish/search or GET /api/tinyfish/search
    if (url.pathname === '/api/tinyfish/search' || url.pathname === '/api/resources/search') {
      let rawParams: Record<string, unknown> = {};

      if (request.method === 'POST') {
        try {
          rawParams = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid JSON request payload.',
            }),
            {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json',
              },
            }
          );
        }
      } else {
        // GET with query parameters
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
          {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const result = await handleTinyFishSearch(validation.sanitized, env.TINYFISH_API_KEY);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      });
    }

    // Endpoint: POST /api/ai/generate-activity
    if (url.pathname === '/api/ai/generate-activity') {
      let reqPayload: GenerateActivityRequest = {
        skillId: 'skill_letter_sounds_basic',
        difficulty: 'beginner',
        language: 'English',
      };

      if (request.method === 'POST') {
        try {
          const body = await request.json() as Partial<GenerateActivityRequest>;
          reqPayload = {
            skillId: body.skillId || 'skill_letter_sounds_basic',
            difficulty: body.difficulty || 'beginner',
            language: body.language || 'English',
            childName: body.childName,
            interest: body.interest,
            targetPattern: body.targetPattern,
          };
        } catch {
          // Graceful fallback on body parse
        }
      }

      const generated = await handleGenerateActivity(reqPayload, env.AI_API_KEY);
      return new Response(JSON.stringify({ success: true, activity: generated }), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      });
    }

    // Pass through to Cloudflare Static Assets for all other paths
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }


    return new Response('Not found', { status: 404 });
  },
};
