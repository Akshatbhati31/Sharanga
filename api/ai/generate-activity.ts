import { handleGenerateActivity, type GenerateActivityRequest } from '../../src/worker/aiHandler.js';

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

    let reqPayload: GenerateActivityRequest = {
      skillId: 'skill_letter_sounds_basic',
      difficulty: 'beginner',
      language: 'English',
    };

    if (request.method === 'POST') {
      try {
        const body = (await request.json()) as Partial<GenerateActivityRequest>;
        reqPayload = {
          skillId: body.skillId || 'skill_letter_sounds_basic',
          difficulty: body.difficulty || 'beginner',
          language: body.language || 'English',
          childName: body.childName,
          interest: body.interest,
          targetPattern: body.targetPattern,
          variant: typeof body.variant === 'number' ? body.variant : undefined,
        };
      } catch {
        // Graceful fallback to default payload
      }
    }

    const activity = await handleGenerateActivity(
      reqPayload,
      process.env.GEMINI_API_KEY || process.env.AI_API_KEY
    );
    return new Response(JSON.stringify({ success: true, activity }), {
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

  let reqPayload: GenerateActivityRequest = {
    skillId: 'skill_letter_sounds_basic',
    difficulty: 'beginner',
    language: 'English',
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
    if (bodyObj && typeof bodyObj === 'object') {
      reqPayload = {
        skillId: bodyObj.skillId || 'skill_letter_sounds_basic',
        difficulty: bodyObj.difficulty || 'beginner',
        language: bodyObj.language || 'English',
        childName: bodyObj.childName,
        interest: bodyObj.interest,
        targetPattern: bodyObj.targetPattern,
        variant: typeof bodyObj.variant === 'number' ? bodyObj.variant : undefined,
      };
    }
  }

  const activity = await handleGenerateActivity(
    reqPayload,
    process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  );
  return res.status(200).json({ success: true, activity });
}
