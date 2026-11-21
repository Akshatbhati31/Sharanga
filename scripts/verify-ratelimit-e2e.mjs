import { checkRateLimit, getClientIp, resetRateLimits } from '../src/worker/rateLimiter.js';
import handleAi from '../api/ai/generate-activity.ts';
import handleVoice from '../api/voice/synthesize.ts';
import handleSearch from '../api/tinyfish/search.ts';

async function runTests() {
  console.log('🧪 Starting Rate Limiter & API Integration Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // --- Group 1: Core Rate Limiter Unit Tests ---
  console.log('--- Test Group 1: Core Rate Limiter Unit Tests ---');
  resetRateLimits();

  // 1. Initial request allowed
  const r1 = checkRateLimit('test-client-1', 2, 1000);
  assert(r1.allowed === true && r1.remaining === 1, 'Initial request is allowed with remaining = 1');

  // 2. Second request allowed
  const r2 = checkRateLimit('test-client-1', 2, 1000);
  assert(r2.allowed === true && r2.remaining === 0, 'Second request is allowed with remaining = 0');

  // 3. Third request rejected (429)
  const r3 = checkRateLimit('test-client-1', 2, 1000);
  assert(r3.allowed === false && r3.remaining === 0 && r3.retryAfterSec >= 1, 'Third request is rejected with retryAfterSec >= 1');

  // 4. Key isolation
  const rIsolated = checkRateLimit('test-client-2', 2, 1000);
  assert(rIsolated.allowed === true && rIsolated.remaining === 1, 'Different client key is isolated and allowed');

  // 5. Window reset after elapsed time
  await new Promise(resolve => setTimeout(resolve, 1050));
  const rReset = checkRateLimit('test-client-1', 2, 1000);
  assert(rReset.allowed === true && rReset.remaining === 1, 'Tokens replenish after window expires');

  // --- Group 2: Client IP Extraction Edge Cases ---
  console.log('\n--- Test Group 2: Client IP Extraction ---');
  assert(getClientIp(null) === '127.0.0.1', 'null request falls back safely to 127.0.0.1');
  assert(getClientIp(undefined) === '127.0.0.1', 'undefined request falls back safely to 127.0.0.1');
  assert(getClientIp({}) === '127.0.0.1', 'Empty object request falls back safely to 127.0.0.1');

  const reqForwarded = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '198.51.100.10, 203.0.113.195' },
  });
  assert(getClientIp(reqForwarded) === '198.51.100.10', 'Extracts first IP from multi-hop x-forwarded-for');

  const reqCf = new Request('http://localhost', {
    headers: { 'cf-connecting-ip': '203.0.113.50' },
  });
  assert(getClientIp(reqCf) === '203.0.113.50', 'Extracts cf-connecting-ip header');

  const reqVercel = new Request('http://localhost', {
    headers: { 'x-vercel-forwarded-for': '198.51.100.77' },
  });
  assert(getClientIp(reqVercel) === '198.51.100.77', 'Extracts x-vercel-forwarded-for header');

  const reqIpv6Mapped = { headers: { 'x-real-ip': '::ffff:192.0.2.1' } };
  assert(getClientIp(reqIpv6Mapped) === '192.0.2.1', 'Normalizes IPv6-mapped IPv4 address');

  const reqLoopback = { headers: { 'x-real-ip': '::1' } };
  assert(getClientIp(reqLoopback) === '127.0.0.1', 'Normalizes IPv6 loopback ::1 to 127.0.0.1');

  // --- Group 3: API Endpoint Rate Limiting & 429 Responses ---
  console.log('\n--- Test Group 3: API Endpoint Rate Limiting & 429 Responses ---');
  resetRateLimits();

  // Test AI endpoint rate limit (configured for 30 req/min)
  const testIp = '192.0.2.200';
  const makeAiReq = () =>
    new Request('http://localhost/api/ai/generate-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({ skillId: 'skill_letter_sounds_basic', difficulty: 'beginner' }),
    });

  // Exhaust the 30 requests
  for (let i = 0; i < 30; i++) {
    checkRateLimit(`ai:${testIp}`, 30, 60000);
  }

  const aiBlockedRes = await handleAi(makeAiReq());
  assert(aiBlockedRes.status === 429, 'AI endpoint returns HTTP 429 when rate limit exceeded');
  assert(Boolean(aiBlockedRes.headers.get('Retry-After')), 'AI endpoint returns Retry-After header on 429');
  const aiBlockedBody = await aiBlockedRes.json();
  assert(aiBlockedBody.success === false && aiBlockedBody.error.includes('Rate limit exceeded'), 'AI endpoint returns informative error JSON payload on 429');

  // Test Voice endpoint rate limit (configured for 60 req/min)
  const voiceIp = '192.0.2.201';
  for (let i = 0; i < 60; i++) {
    checkRateLimit(`voice:${voiceIp}`, 60, 60000);
  }
  const voiceReq = new Request('http://localhost/api/voice/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': voiceIp },
    body: JSON.stringify({ text: 'Hello learner', language: 'en' }),
  });
  const voiceBlockedRes = await handleVoice(voiceReq);
  assert(voiceBlockedRes.status === 429, 'Voice endpoint returns HTTP 429 when rate limit exceeded');
  assert(Boolean(voiceBlockedRes.headers.get('Retry-After')), 'Voice endpoint returns Retry-After header on 429');

  // Test TinyFish Search endpoint rate limit (configured for 60 req/min)
  const searchIp = '192.0.2.202';
  for (let i = 0; i < 60; i++) {
    checkRateLimit(`search:${searchIp}`, 60, 60000);
  }
  const searchReq = new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': searchIp },
    body: JSON.stringify({ topic: 'Phonics' }),
  });
  const searchBlockedRes = await handleSearch(searchReq);
  assert(searchBlockedRes.status === 429, 'Search endpoint returns HTTP 429 when rate limit exceeded');
  assert(Boolean(searchBlockedRes.headers.get('Retry-After')), 'Search endpoint returns Retry-After header on 429');

  console.log(`\n==========================================`);
  console.log(`Rate Limiter Verification Results: ${passed} passed, ${failed} failed`);
  console.log(`==========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
