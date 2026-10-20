import { defineConfig } from 'vite';
import { handleTinyFishSearch, validateSearchParams } from './src/worker/tinyfishHandler';
import { handleGenerateActivity, type GenerateActivityRequest } from './src/worker/aiHandler';


export default defineConfig({
  plugins: [
    {
      name: 'tinyfish-api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url) return next();

          const parsedUrl = new URL(req.url, 'http://localhost:5173');

          if (parsedUrl.pathname === '/api/tinyfish/status') {
            const apiKey = process.env.TINYFISH_API_KEY;
            const configured = Boolean(
              apiKey && apiKey.trim() !== '' && !apiKey.includes('placeholder')
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok', service: 'TinyFish', configured }));
            return;
          }

          if (
            parsedUrl.pathname === '/api/tinyfish/search' ||
            parsedUrl.pathname === '/api/resources/search'
          ) {
            let body = '';
            if (req.method === 'POST') {
              for await (const chunk of req) {
                body += chunk;
              }
              let rawParams: unknown = {};
              try {
                rawParams = JSON.parse(body || '{}');
              } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON request payload.' }));
                return;
              }
              const validation = validateSearchParams(rawParams);
              if (!validation.valid || !validation.sanitized) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: validation.error || 'Invalid search parameters.',
                  })
                );
                return;
              }
              const result = await handleTinyFishSearch(
                validation.sanitized,
                process.env.TINYFISH_API_KEY
              );
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
              return;
            } else {
              const rawParams = {
                topic: parsedUrl.searchParams.get('topic') || '',
                grade: parsedUrl.searchParams.get('grade') || undefined,
                resourceType: parsedUrl.searchParams.get('resourceType') || 'any',
                language: parsedUrl.searchParams.get('language') || 'English',
              };
              const validation = validateSearchParams(rawParams);
              if (!validation.valid || !validation.sanitized) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: validation.error || 'Invalid search parameters.',
                  })
                );
                return;
              }
              const result = await handleTinyFishSearch(
                validation.sanitized,
                process.env.TINYFISH_API_KEY
              );
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
              return;
            }
          }

          if (parsedUrl.pathname === '/api/ai/generate-activity') {
            let reqPayload: GenerateActivityRequest = {
              skillId: 'skill_letter_sounds_basic',
              difficulty: 'beginner',
              language: 'English',
            };

            if (req.method === 'POST') {
              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }
              try {
                const parsed = JSON.parse(body || '{}') as Partial<GenerateActivityRequest>;
                reqPayload = {
                  skillId: parsed.skillId || 'skill_letter_sounds_basic',
                  difficulty: parsed.difficulty || 'beginner',
                  language: parsed.language || 'English',
                  childName: parsed.childName,
                  interest: parsed.interest,
                  targetPattern: parsed.targetPattern,
                };
              } catch {
                // Ignore parse error and use default
              }
            }

            const activity = await handleGenerateActivity(
              reqPayload,
              process.env.AI_API_KEY
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, activity }));
            return;
          }

          next();
        });
      },
    },
  ],
});

