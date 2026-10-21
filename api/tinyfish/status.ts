const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
};

export default async function handler(req: any, res?: any) {
  // Support Web standard Request / Edge / local tests
  if (req instanceof Request || (!res || typeof res.status !== 'function')) {
    const request = req as Request;
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const apiKey = process.env.TINYFISH_API_KEY;
    const configured = Boolean(
      apiKey && apiKey.trim() !== '' && !apiKey.includes('placeholder') && apiKey !== 'your-tinyfish-api-key'
    );
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'TinyFish',
        configured,
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Node.js Serverless runtime (Vercel)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  const configured = Boolean(
    apiKey && apiKey.trim() !== '' && !apiKey.includes('placeholder') && apiKey !== 'your-tinyfish-api-key'
  );

  return res.status(200).json({
    status: 'ok',
    service: 'TinyFish',
    configured,
  });
}
