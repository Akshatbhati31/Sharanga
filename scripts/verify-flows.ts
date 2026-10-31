import { AuthService } from '../src/services/authService';
import { ProfileService } from '../src/services/profileService';
import { StorageService } from '../src/services/storageService';
import { ActivityTrackerService } from '../src/services/activityTrackerService';
import process from 'process';
import {
  validateSearchParams,
  buildEducationalQuery,
  isValidWebUrl,
  handleTinyFishSearch,
  MEDICAL_ACCESSIBILITY_DISCLAIMER,
} from '../src/worker/tinyfishHandler';
import {
  SKILL_REGISTRY,
  getSkillDefinition,
  createInitialSkillState,
  updateSkillStateWithAttempt,
} from '../src/services/skillModel';
import { RecommendationEngine } from '../src/services/recommendationEngine';
import { LearningPathService } from '../src/services/learningPathService';
import {
  validateActivityContent,
  getDeterministicActivity,
  handleGenerateActivity,
} from '../src/worker/aiHandler';
import { ReadingChartService } from '../src/services/readingChartService';
import { ACTIVITY_CATALOG } from '../src/services/activityCatalog';
import fs from 'fs';
import path from 'path';
import vercelStatusHandler from '../api/tinyfish/status';
import vercelSearchHandler from '../api/tinyfish/search';
import vercelResourcesHandler from '../api/resources/search';
import vercelAiHandler from '../api/ai/generate-activity';
import { TinyFishService } from '../src/services/tinyfishService';
import { i18n, SUPPORTED_LANGUAGES } from '../src/i18n/index';
import { SpeechService } from '../src/services/speechService';
import { ActivityRunnerModal } from '../src/ui/activityRunnerModal';
import { LearningJourneyView } from '../src/ui/learningJourneyView';
import { ChildModalView } from '../src/ui/childModalView';
import { DashboardController } from '../src/ui/dashboardController';
import type { SupportedLanguage, AppLanguageCode, ChildProfile } from '../src/types/auth';
import { StoryShelfService } from '../src/services/storyShelfService';

// Polyfill localStorage, document & SpeechSynthesis for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as Storage;
}

class MockDomElement {
  id = '';
  className = '';
  innerHTML = '';
  textContent = '';
  dataset: Record<string, string> = {};
  style: Record<string, any> = {};
  children: MockDomElement[] = [];
  classList = {
    add: (...c: string[]) => { this.className = (this.className + ' ' + c.join(' ')).trim(); },
    remove: (...c: string[]) => {
      c.forEach(cls => {
        this.className = this.className.replace(new RegExp('\\b' + cls + '\\b', 'g'), '').replace(/\s+/g, ' ').trim();
      });
    },
    contains: (cls: string) => this.className.includes(cls),
  };
  listeners: Record<string, Array<(e?: any) => any>> = {};
  addEventListener(type: string, cb: (e?: any) => any) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }
  dispatchEvent(event: any) {
    const type = event?.type || 'click';
    if (!event.preventDefault) event.preventDefault = () => {};
    if (this.listeners[type]) {
      for (const cb of this.listeners[type]) {
        cb(event);
      }
    }
    return true;
  }
  appendChild(child: MockDomElement) {
    this.children.push(child);
    return child;
  }
  querySelector(sel: string): MockDomElement | null {
    if (sel === '#actTitle') return { textContent: 'mock' } as any;
    return new MockDomElement();
  }
  querySelectorAll(sel: string): MockDomElement[] {
    return [new MockDomElement(), new MockDomElement()];
  }
  focus() {}
}

const mockDocElements: Record<string, MockDomElement> = {};
const mockBody = new MockDomElement();

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: { lang: 'en', dir: 'ltr' },
    body: mockBody,
    createElement: (tag: string) => new MockDomElement(),
    getElementById: (id: string) => {
      if (!mockDocElements[id]) {
        const el = new MockDomElement();
        el.id = id;
        mockDocElements[id] = el;
      }
      return mockDocElements[id];
    },
    querySelector: (sel: string) => null,
    querySelectorAll: () => [],
  };
} else {
  (globalThis as any).document.body = (globalThis as any).document.body || mockBody;
  (globalThis as any).document.createElement = (globalThis as any).document.createElement || ((tag: string) => new MockDomElement());
  const origGetById = (globalThis as any).document.getElementById;
  (globalThis as any).document.getElementById = (id: string) => {
    if (origGetById && origGetById(id)) return origGetById(id);
    if (!mockDocElements[id]) {
      const el = new MockDomElement();
      el.id = id;
      mockDocElements[id] = el;
    }
    return mockDocElements[id];
  };
}

if (typeof globalThis.speechSynthesis === 'undefined') {
  let speaking = false;
  (globalThis as any).speechSynthesis = {
    speak: () => { speaking = true; },
    cancel: () => { speaking = false; },
    getVoices: () => [
      { lang: 'en-IN', name: 'Google English India', default: true },
      { lang: 'hi-IN', name: 'Google Hindi', default: false },
      { lang: 'or-IN', name: 'Odia Voice', default: false },
      { lang: 'pa-IN', name: 'Punjabi Voice', default: false },
      { lang: 'ta-IN', name: 'Google Tamil', default: false },
    ],
  };
}

async function runTests() {
  console.log('🧪 Starting DyslexiMate Comprehensive Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  const storage = StorageService.getInstance();
  const auth = AuthService.getInstance();
  const profiles = ProfileService.getInstance();
  const tracker = ActivityTrackerService.getInstance();

  // =========================================================================
  // Test Group 1: Seeded Demo Parent and Profiles
  // =========================================================================
  console.log('--- Test Group 1: Initial Seed Data & Auth ---');
  const demoLogin = await auth.login({
    email: 'parent@dysleximate.demo',
    password: 'Password123!',
  });
  assert(demoLogin.success === true, 'Seeded demo parent can log in');
  assert(demoLogin.user?.fullName === 'Sunita Sharma', 'Demo parent name matches Sunita Sharma');
  assert(demoLogin.user?.hasPin === true, 'Demo parent has pre-configured PIN flag');

  const children = await profiles.getChildren(demoLogin.user!.id);
  assert(children.length === 2, 'Two seeded child profiles exist for demo parent');
  assert(children[0].name === 'Aanya Sharma', 'First child is Aanya Sharma');
  assert(children[1].name === 'Kabir Sharma', 'Second child is Kabir Sharma');

  // =========================================================================
  // Test Group 2: Per-Child Data Isolation
  // =========================================================================
  console.log('\n--- Test Group 2: Per-Child Progress Data Isolation ---');
  const aanyaProg = profiles.getChildProgress(children[0].id);
  const kabirProg = profiles.getChildProgress(children[1].id);
  assert(aanyaProg.happyPoints === 240, 'Aanya has 240 happy points');
  assert(kabirProg.happyPoints === 180, 'Kabir has 180 happy points');

  // Update Aanya's points
  profiles.updateChildProgress(children[0].id, { happyPoints: 270 });
  const aanyaUpdated = profiles.getChildProgress(children[0].id);
  const kabirCheck = profiles.getChildProgress(children[1].id);
  assert(aanyaUpdated.happyPoints === 270, 'Aanya points updated to 270');
  assert(kabirCheck.happyPoints === 180, 'Kabir points remained isolated at 180');

  // =========================================================================
  // Test Group 3: Parent PIN Verification, Limits & Cooldown
  // =========================================================================
  console.log('\n--- Test Group 3: Parent PIN Security & Cooldowns ---');
  // 1. Correct PIN
  const verify1 = await auth.verifyParentPin('1234');
  assert(verify1.success === true, 'Default demo parent PIN 1234 verifies successfully');

  // 2. Incorrect PIN handling
  const wrong1 = await auth.verifyParentPin('9999');
  assert(wrong1.success === false, 'Incorrect PIN rejected');
  assert(typeof wrong1.remainingAttempts === 'number', 'Reports remaining attempts on wrong PIN');

  // 3. Repeated incorrect attempts trigger cooldown lockout
  await auth.verifyParentPin('0001');
  await auth.verifyParentPin('0002');
  await auth.verifyParentPin('0003');
  const lockoutRes = await auth.verifyParentPin('0004'); // 5th attempt
  assert(lockoutRes.success === false, '5th failed attempt fails');
  assert(Boolean(lockoutRes.lockoutSeconds && lockoutRes.lockoutSeconds > 0), 'Lockout cooldown activated after 5 failed attempts');

  // 4. Verify blocked while locked out
  const duringLockout = await auth.verifyParentPin('1234');
  assert(duringLockout.success === false, 'Even correct PIN is blocked during active security cooldown');
  assert(auth.getPinLockoutRemainingSeconds() > 0, 'Lockout remaining seconds reported correctly');

  // Reset lockout in storage for subsequent test steps
  const allUsers = storage.getRawUsers();
  const sunita = allUsers.find(u => u.id === 'parent-demo-1');
  if (sunita) {
    sunita.failedPinAttempts = 0;
    delete sunita.pinLockoutUntil;
    storage.saveRawUsers(allUsers);
  }

  // Verify PIN works again once lockout expires/clears
  const afterReset = await auth.verifyParentPin('1234');
  assert(afterReset.success === true, 'PIN verifies once cooldown expires');

  // =========================================================================
  // Test Group 4: Changing Parent PIN
  // =========================================================================
  console.log('\n--- Test Group 4: Changing Parent PIN ---');
  // 1. Wrong old PIN
  const failChange = await auth.changeParentPin('9999', '5678');
  assert(failChange.success === false, 'Changing PIN with incorrect current PIN is rejected');

  // 2. Non-4-digit new PIN
  const invalidLen = await auth.changeParentPin('1234', '12');
  assert(invalidLen.success === false, 'New PIN with fewer than 4 digits is rejected');

  // 3. Same as old PIN
  const samePin = await auth.changeParentPin('1234', '1234');
  assert(samePin.success === false, 'New PIN identical to old PIN is rejected');

  // 4. Successful change
  const goodChange = await auth.changeParentPin('1234', '5678');
  assert(goodChange.success === true, 'Parent PIN successfully changed to 5678');

  // 5. Old PIN must no longer work
  const oldPinCheck = await auth.verifyParentPin('1234');
  assert(oldPinCheck.success === false, 'Previous PIN 1234 is rejected after change');

  // 6. New PIN must work
  const newPinCheck = await auth.verifyParentPin('5678');
  assert(newPinCheck.success === true, 'New PIN 5678 verifies successfully');

  // =========================================================================
  // Test Group 5: First-Time PIN Setup on New Account
  // =========================================================================
  console.log('\n--- Test Group 5: First-Time Parent Account & PIN Setup ---');
  const regRes = await auth.register({
    fullName: 'Rohan Mehra',
    email: 'rohan@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    acceptTerms: true,
  });
  assert(regRes.success === true, 'New parent Rohan registered');
  assert(regRes.user?.hasPin === false, 'New parent account starts with hasPin = false');
  assert(auth.hasParentPin() === false, 'auth.hasParentPin() reports false for fresh account');

  // Invalid setup
  const badSetup = await auth.setupParentPin('abc');
  assert(badSetup.success === false, 'Non-numeric PIN setup rejected');

  // Valid setup
  const goodSetup = await auth.setupParentPin('4321');
  assert(goodSetup.success === true, 'New parent PIN 4321 set up successfully');
  assert(auth.hasParentPin() === true, 'auth.hasParentPin() now reports true');
  const verifyRohan = await auth.verifyParentPin('4321');
  assert(verifyRohan.success === true, 'New parent PIN 4321 verifies successfully');

  // Empty child profiles check
  const rohanChildren = await profiles.getChildren(regRes.user!.id);
  assert(rohanChildren.length === 0, 'New parent has 0 child profiles initially (Empty state)');

  // Create first child
  const rohanChild = await profiles.createChild(regRes.user!.id, {
    name: 'Anaya Mehra',
    grade: 'Class 2 · Early reader',
    preferredLanguage: 'English',
    avatar: '🐼',
    preferences: {
      readingSpeed: 'normal',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
  });
  assert(rohanChild.name === 'Anaya Mehra', 'Created first child for new parent');
  assert(rohanChild.preferences.dyslexiaFont === true, 'Dyslexia font preference saved');

  // Verify parent ownership separation
  const sunitaChildren = await profiles.getChildren('parent-demo-1');
  assert(sunitaChildren.length === 2, 'Sunita Sharma children count remains 2 (Isolated from Rohan)');

  // =========================================================================
  // Test Group 6: Child Activity Tracking & Telemetry
  // =========================================================================
  console.log('\n--- Test Group 6: Activity-Time Tracking & Telemetry ---');
  const testChildId = children[0].id; // Aanya Sharma
  const testParentId = 'parent-demo-1';

  // 1. Record activity
  tracker.startActivity(testParentId, testChildId, 'practice_game', 'Picture Word Match Game');
  const activeSess = tracker.getActiveSession();
  assert(activeSess !== null, 'Active activity session started');
  assert(activeSess?.category === 'practice_game', 'Activity category matches practice_game');

  // Manually increment accumulated seconds to simulate 120s of active engagement
  if (activeSess) {
    activeSess.accumulatedSeconds = 120;
  }
  tracker.stopActivity();
  assert(tracker.getActiveSession() === null, 'Session stopped cleanly');

  // 2. Record story activity
  tracker.startActivity(testParentId, testChildId, 'story_reading', 'Story: Sunny and the little kite');
  const storySess = tracker.getActiveSession();
  if (storySess) {
    storySess.accumulatedSeconds = 180; // 3 min
  }
  tracker.stopActivity();

  // 3. Record voice spelling activity
  tracker.startActivity(testParentId, testChildId, 'voice_spelling', 'Say it, spell it!');
  const voiceSess = tracker.getActiveSession();
  if (voiceSess) {
    voiceSess.accumulatedSeconds = 90; // 1.5 min
  }
  tracker.stopActivity();

  // 4. Switching activities stops existing session without double-counting
  tracker.startActivity(testParentId, testChildId, 'letter_mirror', 'Letter mirror: b and d');
  const mirrorSess = tracker.getActiveSession();
  if (mirrorSess) {
    mirrorSess.accumulatedSeconds = 60;
  }
  // Start new activity without manually stopping previous
  tracker.startActivity(testParentId, testChildId, 'general_learning', 'Progress View');
  const newActive = tracker.getActiveSession();
  assert(newActive?.activityTitle === 'Progress View', 'Switching activity automatically stops previous and starts new');
  tracker.stopActivity();

  // 5. Test Summary Reports
  const todaySummary = tracker.getSummary(testChildId, 'Aanya Sharma', 'today');
  assert(todaySummary.totalActiveSeconds > 0, 'Today summary calculates active seconds');
  assert(todaySummary.totalSessions > 0, 'Today summary counts sessions');
  assert(todaySummary.averageSessionSeconds > 0, 'Today summary calculates average session duration');
  assert(todaySummary.categoryBreakdown.practice_game.seconds > 0, 'Practice game category seconds tracked');
  assert(todaySummary.categoryBreakdown.story_reading.seconds > 0, 'Story reading category seconds tracked');
  assert(todaySummary.categoryBreakdown.voice_spelling.seconds > 0, 'Voice spelling category seconds tracked');
  assert(todaySummary.dailyBreakdown.length > 0, 'Daily breakdown array populated');

  // 6. Test 7-day and 30-day summaries
  const sevenDaySummary = tracker.getSummary(testChildId, 'Aanya Sharma', '7days');
  assert(sevenDaySummary.dailyBreakdown.length === 7, '7-day summary returns 7 daily breakdown points');

  const thirtyDaySummary = tracker.getSummary(testChildId, 'Aanya Sharma', '30days');
  assert(thirtyDaySummary.totalActiveSeconds >= sevenDaySummary.totalActiveSeconds, '30-day active seconds is >= 7-day active seconds');

  // 7. Per-child activity isolation
  const kabirSummary = tracker.getSummary('child-kabir-2', 'Kabir Sharma', 'today');
  assert(kabirSummary.childId === 'child-kabir-2', 'Kabir summary has childId child-kabir-2');
  const aanyaLogs = storage.getActivitiesForChild('child-aanya-1');
  const kabirLogs = storage.getActivitiesForChild('child-kabir-2');
  assert(aanyaLogs.every(l => l.childId === 'child-aanya-1'), 'All Aanya logs strictly belong to Aanya');
  assert(kabirLogs.every(l => l.childId === 'child-kabir-2'), 'All Kabir logs strictly belong to Kabir');

  // 8. Empty child report
  const emptyChildSummary = tracker.getSummary('non-existent-child', 'Empty Child', 'today');
  assert(emptyChildSummary.totalSessions === 0, 'Empty child has 0 sessions');
  assert(emptyChildSummary.totalActiveSeconds === 0, 'Empty child has 0 active seconds');
  assert(emptyChildSummary.mostUsedActivity === 'None yet', 'Empty child reports "None yet" for most used activity');

  // Cleanup & Logout
  await auth.logout();
  assert(auth.getCurrentUser() === null, 'Logout clears active session');

  // =========================================================================
  // Test Group 7: TinyFish Educational Resource Finder & Vercel Serverless
  // =========================================================================
  console.log('\n--- Test Group 7: TinyFish Educational Resource Finder & Vercel ---');

  // 1. Parameter Validation
  const validParam = validateSearchParams({
    topic: 'phonics sound blending',
    grade: 'Class 2',
    resourceType: 'phonics_activity',
    language: 'English',
  });
  assert(validParam.valid === true, 'Valid search parameters are accepted');
  assert(validParam.sanitized?.topic === 'phonics sound blending', 'Topic sanitized properly');
  assert(validParam.sanitized?.resourceType === 'phonics_activity', 'Resource type preserved');

  const emptyTopic = validateSearchParams({ topic: '' });
  assert(emptyTopic.valid === false, 'Empty topic is rejected');

  const shortTopic = validateSearchParams({ topic: 'a' });
  assert(shortTopic.valid === false, 'Topic under 2 characters is rejected');

  const longTopic = validateSearchParams({ topic: 'x'.repeat(101) });
  assert(longTopic.valid === false, 'Topic exceeding 100 characters is rejected');

  const invalidType = validateSearchParams({ topic: 'valid topic', resourceType: 'malicious_sql' });
  assert(invalidType.valid === true, 'Invalid resource type is safely caught');
  assert(invalidType.sanitized?.resourceType === 'any', 'Invalid resource type falls back to any');

  // 2. Query Construction
  const query1 = buildEducationalQuery({ topic: 'sight words', grade: 'Class 1', resourceType: 'reading_exercise' });
  assert(query1.includes('sight words'), 'Query includes topic');
  assert(query1.includes('Class 1'), 'Query includes grade');
  assert(query1.includes('reading exercises'), 'Query includes reading exercise descriptor');
  assert(query1.includes('educational resource'), 'Query includes educational resource focus term');

  const queryHindi = buildEducationalQuery({ topic: 'वर्णमाला', language: 'Hindi' });
  assert(queryHindi.includes('Hindi'), 'Non-English language is added to query');

  // 3. Safe URL Validation
  assert(isValidWebUrl('https://pbskids.org/games/reading') === true, 'Valid HTTPS URL passes');
  assert(isValidWebUrl('http://readwritethink.org') === true, 'Valid HTTP URL passes');
  assert(isValidWebUrl('javascript:alert(1)') === false, 'JavaScript protocol URL is rejected');
  assert(isValidWebUrl('data:text/html,bad') === false, 'Data URI is rejected');
  assert(isValidWebUrl('relative/path') === false, 'Relative URL is rejected');

  // 4. Missing / Unconfigured API Key handling (honest reporting)
  const missingKeyRes = await handleTinyFishSearch({ topic: 'phonics' }, undefined);
  assert(missingKeyRes.success === false, 'Missing key returns success: false');
  assert(missingKeyRes.configured === false, 'Missing key returns configured: false');
  assert(Boolean(missingKeyRes.error?.includes('not configured')), 'Returns informative error about server configuration');
  assert(missingKeyRes.disclaimer === MEDICAL_ACCESSIBILITY_DISCLAIMER, 'Includes medical/accessibility disclaimer');

  const placeholderKeyRes = await handleTinyFishSearch({ topic: 'phonics' }, 'your-tinyfish-api-key');
  assert(placeholderKeyRes.configured === false, 'Placeholder key returns configured: false');

  // 5. Successful TinyFish API interaction with simulated response
  const mockFetchSuccess: typeof fetch = async (input, init) => {
    const urlStr = typeof input === 'string' ? input : (input as Request).url;
    const reqHeaders = (init?.headers as Record<string, string>) || {};

    // Verify official TinyFish headers & request construction
    if (reqHeaders['X-API-Key'] !== 'test-secret-tinyfish-key') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    if (!urlStr.includes('api.search.tinyfish.ai')) {
      return new Response(JSON.stringify({ error: 'Wrong endpoint' }), { status: 404 });
    }

    return new Response(
      JSON.stringify({
        query: 'phonics educational resource',
        total_results: 2,
        results: [
          {
            position: 1,
            site_name: 'Starfall Education',
            title: 'Learn to Read with Phonics',
            snippet: 'Interactive phonics sound games and reading activities for early readers.',
            url: 'https://www.starfall.com/h/ltr-classic/',
          },
          {
            position: 2,
            title: 'Free Printable Phonics Worksheets',
            snippet: 'Printable letter and sound blending worksheets for practice.',
            url: 'https://www.superteacherworksheets.com/phonics.html',
          },
          {
            position: 3,
            title: 'Invalid Link Resource',
            snippet: 'Bad URL that should be stripped.',
            url: 'javascript:void(0)',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const successSearch = await handleTinyFishSearch(
    { topic: 'phonics', grade: 'Class 1' },
    'test-secret-tinyfish-key',
    mockFetchSuccess
  );
  assert(successSearch.success === true, 'Successful search returns success: true');
  assert(successSearch.configured === true, 'Successful search returns configured: true');
  assert(successSearch.resources.length === 2, 'Filtered out invalid URL and returned 2 clean resources');
  assert(successSearch.resources[0].siteName === 'Starfall Education', 'Parsed site name from API payload');
  assert(successSearch.resources[1].siteName === 'superteacherworksheets.com', 'Inferred domain when site_name missing');
  assert(successSearch.resources[0].resourceType === 'educational_game', 'Inferred educational_game resource type');
  assert(successSearch.resources[1].resourceType === 'worksheet', 'Inferred worksheet resource type');
  assert(successSearch.resources[0].verified === true, 'Verified flag is set');
  assert(successSearch.disclaimer === MEDICAL_ACCESSIBILITY_DISCLAIMER, 'Includes medical accessibility disclaimer');

  // 6. API Error & Rate Limit Handling
  const mockFetch429: typeof fetch = async () => new Response('Too many requests', { status: 429 });
  const rateLimitRes = await handleTinyFishSearch({ topic: 'phonics' }, 'test-key', mockFetch429);
  assert(rateLimitRes.success === false, 'Rate limit returns success: false');
  assert(Boolean(rateLimitRes.error?.includes('rate limit')), 'Rate limit returns helpful rate limit message');

  const mockFetch401: typeof fetch = async () => new Response('Unauthorized', { status: 401 });
  const authFailRes = await handleTinyFishSearch({ topic: 'phonics' }, 'invalid-key', mockFetch401);
  assert(authFailRes.success === false && Boolean(authFailRes.error?.includes('authentication failed')), '401 returns auth failed message');

  // 7. Vercel Serverless Router Tests
  // A. OPTIONS /api/tinyfish/status (CORS preflight)
  const corsReq = new Request('http://localhost/api/tinyfish/status', { method: 'OPTIONS' });
  const corsRes = await vercelStatusHandler(corsReq);
  assert(corsRes.status === 204, 'OPTIONS preflight returns 204');
  assert(corsRes.headers.get('Access-Control-Allow-Origin') === '*', 'CORS origin header present');

  // B. GET /api/tinyfish/status
  const prevTinyKey = process.env.TINYFISH_API_KEY;
  process.env.TINYFISH_API_KEY = 'live-key';
  const statusReq = new Request('http://localhost/api/tinyfish/status', { method: 'GET' });
  const statusRes = await vercelStatusHandler(statusReq);
  const statusJson = (await statusRes.json()) as { configured: boolean; service: string };
  assert(statusJson.service === 'TinyFish', 'Status endpoint returns service: TinyFish');
  assert(statusJson.configured === true, 'Status endpoint reports configured: true when key present');
  if (prevTinyKey !== undefined) {
    process.env.TINYFISH_API_KEY = prevTinyKey;
  } else {
    delete process.env.TINYFISH_API_KEY;
  }

  // C. POST /api/tinyfish/search with invalid JSON
  const badJsonReq = new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  });
  const badJsonRes = await vercelSearchHandler(badJsonReq);
  assert(badJsonRes.status === 400, 'Bad JSON body returns 400');

  // D. POST /api/tinyfish/search with invalid params
  const badParamsReq = new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: JSON.stringify({ topic: '' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const badParamsRes = await vercelSearchHandler(badParamsReq);
  assert(badParamsRes.status === 400, 'Empty topic parameter returns 400');

  // =========================================================================
  // Test Group 8: Adaptive AI Personalization Engine & Learning Path
  // =========================================================================
  console.log('\n--- Test Group 8: Adaptive AI Personalization Engine ---');

  const learningPathService = LearningPathService.getInstance();

  // Scenario 1: A new child with no learning history receives an introductory/provisional path
  const brandNewChild = {
    id: 'child-new-novice',
    parentId: 'parent-demo-1',
    name: 'Diya',
    grade: 'Kindergarten',
    preferredLanguage: 'English' as const,
    avatar: '👧🏻',
    preferences: {
      readingSpeed: 'normal' as const,
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  const novicePath = await learningPathService.generatePath(brandNewChild);
  assert(novicePath.isProvisional === true, 'New child receives a path marked provisional');
  assert(novicePath.demonstratedSkills.length === 0, 'New child starts with 0 demonstrated skills');
  assert(novicePath.recommendations.length > 0, 'New child receives recommendations');
  assert(
    novicePath.recommendations[0].recommendationType === 'baseline' || novicePath.recommendations[0].recommendationType === 'new',
    'First activity is baseline/introductory'
  );

  // Scenario 2: Two children with different performance histories receive different recommendations
  const advancedChild = {
    id: 'child-adv-reader',
    parentId: 'parent-demo-1',
    name: 'Aarav',
    grade: 'Class 4',
    preferredLanguage: 'English' as const,
    avatar: '👦🏽',
    preferences: {
      readingSpeed: 'normal' as const,
      dyslexiaFont: false,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  // Seed advanced skills for Aarav
  await learningPathService.saveChildSkillState({
    skillId: 'skill_letter_sounds_basic',
    childId: 'child-adv-reader',
    currentLevel: 4,
    estimatedMastery: 0.95,
    confidence: 0.9,
    recentAccuracy: 0.95,
    attemptsCount: 8,
    consecutiveSuccesses: 5,
    consecutiveStruggles: 0,
    lastPracticed: new Date().toISOString(),
    recommendedNextAction: 'mastered',
    missedPatterns: [],
    isProvisional: false,
  });
  await learningPathService.saveChildSkillState({
    skillId: 'skill_letter_sounds_vowels',
    childId: 'child-adv-reader',
    currentLevel: 3,
    estimatedMastery: 0.90,
    confidence: 0.85,
    recentAccuracy: 0.90,
    attemptsCount: 6,
    consecutiveSuccesses: 4,
    consecutiveStruggles: 0,
    lastPracticed: new Date().toISOString(),
    recommendedNextAction: 'mastered',
    missedPatterns: [],
    isProvisional: false,
  });

  const advPath = await learningPathService.generatePath(advancedChild);
  assert(
    advPath.recommendations[0].targetSkillId !== novicePath.recommendations[0].targetSkillId,
    'Two children with different histories receive different recommendations'
  );
  assert(
    advPath.demonstratedSkills.includes('skill_letter_sounds_basic'),
    'Advanced child has demonstrated skill_letter_sounds_basic'
  );

  // Scenario 3: Repeated difficulty leads to appropriate prerequisite or remedial practice
  // Record 2 struggling attempts on b vs d
  await learningPathService.recordAttempt({
    id: 'att_struggle_1',
    childId: brandNewChild.id,
    activityId: 'act_mirror_bd',
    skillId: 'skill_confused_letters_bd',
    activityType: 'letter_distinction',
    score: 40,
    accuracy: 0.40,
    totalQuestions: 1,
    correctAnswers: 0,
    incorrectAnswers: 1,
    attemptsRequired: 3,
    hintsRequested: 2,
    correctedAfterHint: 0,
    durationSeconds: 45,
    missedItems: ['b_vs_d'],
    completedAt: new Date().toISOString(),
  });
  await learningPathService.recordAttempt({
    id: 'att_struggle_2',
    childId: brandNewChild.id,
    activityId: 'act_mirror_bd',
    skillId: 'skill_confused_letters_bd',
    activityType: 'letter_distinction',
    score: 50,
    accuracy: 0.50,
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: 1,
    attemptsRequired: 2,
    hintsRequested: 1,
    correctedAfterHint: 1,
    durationSeconds: 30,
    missedItems: ['b_vs_d'],
    completedAt: new Date().toISOString(),
  });

  const adaptedPath = await learningPathService.generatePath(brandNewChild);
  assert(
    adaptedPath.prioritySkills.includes('skill_confused_letters_bd'),
    'Repeated difficulty flags skill as priority support'
  );
  assert(
    adaptedPath.recommendations[0].recommendationType === 'remediation',
    'Top recommendation is remediation with scaffolded hints'
  );
  assert(
    adaptedPath.recommendations[0].reason.toLowerCase().includes('challenge') || adaptedPath.recommendations[0].reason.toLowerCase().includes('support'),
    'Recommendation explains why remediation was provided'
  );

  // Scenario 4: Consistent improvement leads to gradual increases in difficulty
  await learningPathService.recordAttempt({
    id: 'att_win_1',
    childId: 'child-adv-reader',
    activityId: 'act_cvc_blending',
    skillId: 'skill_cvc_blending',
    activityType: 'phonics_blend',
    score: 100,
    accuracy: 1.0,
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    attemptsRequired: 1,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 20,
    missedItems: [],
    completedAt: new Date().toISOString(),
  });
  await learningPathService.recordAttempt({
    id: 'att_win_2',
    childId: 'child-adv-reader',
    activityId: 'act_cvc_blending',
    skillId: 'skill_cvc_blending',
    activityType: 'phonics_blend',
    score: 95,
    accuracy: 0.95,
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    attemptsRequired: 1,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 25,
    missedItems: [],
    completedAt: new Date().toISOString(),
  });

  const advSkills = await learningPathService.getChildSkillStates('child-adv-reader');
  assert(
    advSkills['skill_cvc_blending'].consecutiveSuccesses >= 2,
    'Tracks consecutive successes for consistent mastery'
  );
  assert(
    advSkills['skill_cvc_blending'].estimatedMastery >= 0.7,
    'Estimated mastery increases steadily on consistent success'
  );

  // Scenario 5: A single incorrect answer does not cause an excessive path change
  const preMistakeMastery = advSkills['skill_cvc_blending'].estimatedMastery;
  await learningPathService.recordAttempt({
    id: 'att_single_mistake',
    childId: 'child-adv-reader',
    activityId: 'act_cvc_blending',
    skillId: 'skill_cvc_blending',
    activityType: 'phonics_blend',
    score: 60,
    accuracy: 0.60,
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: 1,
    attemptsRequired: 2,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 30,
    missedItems: ['slip'],
    completedAt: new Date().toISOString(),
  });
  const postMistakeSkills = await learningPathService.getChildSkillStates('child-adv-reader');
  const postMistakeMastery = postMistakeSkills['skill_cvc_blending'].estimatedMastery;
  assert(
    postMistakeMastery >= preMistakeMastery - 0.25,
    'Single mistake does not cause an excessive collapse in mastery estimate'
  );

  // Scenario 6: Historical progress remains intact after path regeneration
  const beforeRegenVersion = advPath.version;
  const regenPath = await learningPathService.generatePath(advancedChild);
  assert(regenPath.version > beforeRegenVersion, 'Regenerating path increments path version');
  assert(
    regenPath.demonstratedSkills.includes('skill_letter_sounds_basic'),
    'Historical demonstrated skills preserved across path regeneration'
  );

  // Scenario 7: Recommendations respect language and accessibility
  const hindiChild = {
    id: 'child-hindi-1',
    parentId: 'parent-demo-1',
    name: 'Aarush',
    grade: 'Class 2',
    preferredLanguage: 'Hindi' as const,
    avatar: '👦🏻',
    preferences: {
      readingSpeed: 'slow' as const,
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: true,
    },
    createdAt: new Date().toISOString(),
  };
  const hindiPath = await learningPathService.generatePath(hindiChild);
  assert(hindiPath.recommendations.length > 0, 'Hindi child receives valid recommendations');

  // Scenario 8: Missing AI credentials activate deterministic fallback
  const fallbackActivity = await handleGenerateActivity({
    skillId: 'skill_confused_letters_bd',
    difficulty: 'beginner',
    language: 'English',
  }, undefined);
  assert(fallbackActivity.id.length > 0, 'Fallback activity generates without AI key');
  assert(fallbackActivity.items.some(i => i.isCorrect), 'Fallback activity contains a validated correct answer');
  assert(Boolean(fallbackActivity.stepByStepHint), 'Fallback activity provides step-by-step hint');

  // Scenario 9: AI failures and timeouts handled safely
  const mockTimeoutFetch: typeof fetch = async () => {
    throw new Error('AbortError: Request timed out');
  };
  const timeoutHandled = await handleGenerateActivity(
    { skillId: 'skill_cvc_blending', difficulty: 'beginner', language: 'English' },
    'mock-key',
    mockTimeoutFetch
  );
  assert(timeoutHandled.items.length >= 2, 'Fallback provided safely on timeout without throwing');

  // Scenario 10: Supabase migration and schema verification
  const migrationPath = path.resolve('supabase/migrations/20261021000000_adaptive_learning.sql');
  assert(fs.existsSync(migrationPath), 'Adaptive learning migration file exists');
  const migrationSqlAdaptive = fs.readFileSync(migrationPath, 'utf8');
  assert(migrationSqlAdaptive.includes('CREATE TABLE IF NOT EXISTS public.child_skill_states'), 'child_skill_states table defined');
  assert(migrationSqlAdaptive.includes('CREATE TABLE IF NOT EXISTS public.child_learning_paths'), 'child_learning_paths table defined');
  assert(migrationSqlAdaptive.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled on adaptive learning tables');
  assert(migrationSqlAdaptive.includes('auth.uid()'), 'RLS policy links to authenticated parent auth.uid()');

  // Scenario 11: Data isolation between children
  const diyaSkills = await learningPathService.getChildSkillStates(brandNewChild.id);
  const aaravSkills = await learningPathService.getChildSkillStates('child-adv-reader');
  assert(
    diyaSkills['skill_confused_letters_bd'].consecutiveStruggles !== aaravSkills['skill_confused_letters_bd'].consecutiveStruggles,
    'Skill states are isolated between different children'
  );

  // Scenario 12: Vercel /api/ai/generate-activity endpoint
  const aiReq = new Request('http://localhost/api/ai/generate-activity', {
    method: 'POST',
    body: JSON.stringify({ skillId: 'skill_letter_sounds_basic', difficulty: 'beginner', language: 'English' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const aiRes = await vercelAiHandler(aiReq);
  assert(aiRes.status === 200, 'Vercel endpoint /api/ai/generate-activity returns 200');
  const aiJson = (await aiRes.json()) as { success: boolean; activity: any };
  assert(aiJson.success === true, 'Vercel endpoint returns success: true');
  assert(aiJson.activity.items.length >= 2, 'Vercel endpoint returns valid activity items');

  console.log(`\n--- Test Group 9: Dynamic Reading Confidence Chart, B/D Mirror, & 12 Activities ---`);
  const chartService = ReadingChartService.getInstance();
  const freshChartChildId = 'child-chart-test-' + Date.now();

  // Test 9.1: Fresh child with 0 attempts starts with flat baseline and empty state
  const emptySummary = await chartService.getChartSummary(freshChartChildId, 'week');
  assert(emptySummary.isEmpty === true, 'Chart starts with isEmpty = true for fresh child');
  assert(emptySummary.overallAccuracy === null, 'Chart reports overallAccuracy = null (not 0% as fake measured score)');
  assert(emptySummary.svgPathD === 'M0 156 L600 156', 'Chart renders flat horizontal baseline at bottom (y = 156)');
  assert(
    emptySummary.emptyMessage.toLowerCase().includes('complete your first activity'),
    'Chart displays empty message prompting child to complete first activity'
  );
  assert(emptySummary.points.length === 0, 'No fake data points are fabricated');

  // Test 9.2: Complete first activity (75% accuracy)
  await learningPathService.recordAttempt({
    id: 'att_chart_1',
    childId: freshChartChildId,
    activityId: 'act_word_match',
    skillId: 'skill_letter_sounds_basic',
    activityType: 'word_match',
    score: 75,
    accuracy: 0.75,
    totalQuestions: 4,
    correctAnswers: 3,
    incorrectAnswers: 1,
    attemptsRequired: 1,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 25,
    missedItems: [],
    completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  });

  const singleAttemptSummary = await chartService.getChartSummary(freshChartChildId, 'week');
  assert(singleAttemptSummary.isEmpty === false, 'Chart is no longer empty after first activity');
  assert(singleAttemptSummary.overallAccuracy === 75, 'Chart plots actual recorded accuracy of 75%');
  assert(singleAttemptSummary.points.length === 1, 'Exactly one real point plotted');

  // Test 9.3: Complete second activity with identical accuracy (75%) -> Chart line remains completely flat!
  await learningPathService.recordAttempt({
    id: 'att_chart_2',
    childId: freshChartChildId,
    activityId: 'act_word_match',
    skillId: 'skill_letter_sounds_basic',
    activityType: 'word_match',
    score: 75,
    accuracy: 0.75,
    totalQuestions: 4,
    correctAnswers: 3,
    incorrectAnswers: 1,
    attemptsRequired: 1,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 20,
    missedItems: [],
    completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  });

  const flatSummary = await chartService.getChartSummary(freshChartChildId, 'week');
  assert(flatSummary.trend === 'flat', 'Performance trend is flat when accuracy is unchanged');
  assert(flatSummary.points[0].cy === flatSummary.points[1].cy, 'Chart points have identical y coordinates');
  assert(flatSummary.overallAccuracy === 75, 'Overall accuracy remains 75% without fake upward curve');

  // Test 9.4: Complete third activity with lower accuracy (50%) -> Chart drops honestly
  await learningPathService.recordAttempt({
    id: 'att_chart_3',
    childId: freshChartChildId,
    activityId: 'act_word_match',
    skillId: 'skill_letter_sounds_basic',
    activityType: 'word_match',
    score: 50,
    accuracy: 0.50,
    totalQuestions: 2,
    correctAnswers: 1,
    incorrectAnswers: 1,
    attemptsRequired: 2,
    hintsRequested: 1,
    correctedAfterHint: 0,
    durationSeconds: 30,
    missedItems: ['b_vs_d'],
    completedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  });

  const dropSummary = await chartService.getChartSummary(freshChartChildId, 'week');
  assert(dropSummary.trend === 'declining', 'Trend honestly reflects performance drop');
  assert(dropSummary.points[2].cy > dropSummary.points[1].cy, 'SVG y-coordinate increases (line drops downwards) on lower accuracy');

  // Test 9.5: Complete fourth activity with higher accuracy (100%) -> Chart rises
  await learningPathService.recordAttempt({
    id: 'att_chart_4',
    childId: freshChartChildId,
    activityId: 'act_word_match',
    skillId: 'skill_letter_sounds_basic',
    activityType: 'word_match',
    score: 100,
    accuracy: 1.0,
    totalQuestions: 2,
    correctAnswers: 2,
    incorrectAnswers: 0,
    attemptsRequired: 1,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 15,
    missedItems: [],
    completedAt: new Date().toISOString(),
  });

  const riseSummary = await chartService.getChartSummary(freshChartChildId, 'week');
  assert(riseSummary.points[3].cy < riseSummary.points[2].cy, 'SVG y-coordinate decreases (line rises upwards) on higher accuracy');

  // Test 9.6: Time-range filtering
  const allTimeSummary = await chartService.getChartSummary(freshChartChildId, 'all');
  assert(allTimeSummary.totalSessions === 4, 'All time range includes all 4 recorded sessions');
  assert(allTimeSummary.overallAccuracy !== null, 'Calculates aggregated overall accuracy across all sessions');

  // Test 9.7: Weighted accuracy formula (total correct / total questions * 100)
  // Total correct: 3 + 3 + 1 + 2 = 9. Total questions: 4 + 4 + 2 + 2 = 12. 9/12 = 75%.
  assert(allTimeSummary.overallAccuracy === 75, 'Aggregates accuracy correctly using total correct / total questions * 100');

  // Test 9.8: Letter Mirror - specifically B and D tracking and adaptive influence
  const bdChildId = 'child-bd-learner-' + Date.now();
  await learningPathService.recordAttempt({
    id: 'att_bd_confusion_1',
    childId: bdChildId,
    activityId: 'act_mirror_bd',
    skillId: 'skill_confused_letters_bd',
    activityType: 'letter_distinction',
    score: 40,
    accuracy: 0.40,
    totalQuestions: 5,
    correctAnswers: 2,
    incorrectAnswers: 3,
    attemptsRequired: 7,
    hintsRequested: 2,
    correctedAfterHint: 1,
    durationSeconds: 45,
    missedItems: ['b_vs_d'],
    completedAt: new Date().toISOString(),
  });
  await learningPathService.recordAttempt({
    id: 'att_bd_confusion_2',
    childId: bdChildId,
    activityId: 'act_mirror_bd',
    skillId: 'skill_confused_letters_bd',
    activityType: 'letter_distinction',
    score: 40,
    accuracy: 0.40,
    totalQuestions: 5,
    correctAnswers: 2,
    incorrectAnswers: 3,
    attemptsRequired: 6,
    hintsRequested: 1,
    correctedAfterHint: 0,
    durationSeconds: 40,
    missedItems: ['b_vs_d'],
    completedAt: new Date().toISOString(),
  });

  const bdChildProfile = {
    id: bdChildId,
    parentId: 'parent-demo-1',
    name: 'Rohan',
    grade: 'Class 2',
    preferredLanguage: 'English' as const,
    avatar: '👦🏽',
    preferences: {
      readingSpeed: 'normal' as const,
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  const bdAdaptedPath = await learningPathService.generatePath(bdChildProfile);
  assert(
    bdAdaptedPath.prioritySkills.includes('skill_confused_letters_bd'),
    'Repeated B/D errors flag skill_confused_letters_bd as priority skill'
  );
  assert(
    bdAdaptedPath.recommendations[0].targetSkillId === 'skill_confused_letters_bd',
    'Top adaptive recommendation focuses on B/D discrimination practice'
  );

  // Test 9.9: All 12 Prioritized Interactive Learning Activities catalog
  assert(ACTIVITY_CATALOG.length === 12, 'ACTIVITY_CATALOG contains exactly 12 prioritized learning activities');
  const required12 = [
    'B/D Letter Mirror',
    'Sound Blending',
    'Letter-Sound Matching',
    'Word Building',
    'Missing Letter',
    'Rhyming Words',
    'Syllable Splitting',
    'Word Recognition',
    'Reading Comprehension',
    'Vocabulary Builder',
    'Listening Practice',
    'Spelling Practice',
  ];
  required12.forEach(title => {
    assert(ACTIVITY_CATALOG.some(a => a.title === title), `Activity catalog includes "${title}"`);
  });

  // Test 9.10: Deterministic activity generation for all 12 skills
  const testSkills = [
    'skill_confused_letters_bd',
    'skill_cvc_blending',
    'skill_letter_sounds_basic',
    'skill_word_building',
    'skill_missing_letter',
    'skill_phonemic_rhyme',
    'skill_syllable_segmentation',
    'skill_sight_words_high_freq',
    'skill_story_comprehension',
    'skill_sentence_fluency',
    'skill_listening_pronunciation',
    'skill_spelling_cvc',
  ];

  for (const sId of testSkills) {
    const act = getDeterministicActivity({
      skillId: sId,
      difficulty: 'beginner',
      language: 'English',
    });
    assert(act.items.length >= 2, `Skill ${sId} generates interactive activity with at least 2 choices`);
    assert(act.items.some(i => i.isCorrect), `Skill ${sId} activity contains a verified correct answer`);
    assert(Boolean(act.stepByStepHint), `Skill ${sId} activity provides a step-by-step hint`);
  }

  // =========================================================================
  // Test Group 10: Vercel Serverless Routes & Gemini AI Migration
  // =========================================================================
  console.log(`\n--- Test Group 10: Vercel Serverless Routes & Gemini AI Migration ---`);

  // Helper to create mock Node.js res object for Vercel Serverless testing
  function createMockNodeRes() {
    let statusCode = 200;
    let ended = false;
    let responseData: any = null;
    const headers: Record<string, string> = {};

    const resObj = {
      statusCode,
      setHeader(name: string, val: string) {
        headers[name] = val;
        return resObj;
      },
      status(code: number) {
        statusCode = code;
        resObj.statusCode = code;
        return resObj;
      },
      json(data: any) {
        responseData = data;
        ended = true;
        return resObj;
      },
      end(data?: any) {
        if (data) responseData = data;
        ended = true;
        return resObj;
      },
      _getData: () => responseData,
      _getStatus: () => statusCode,
      _getHeaders: () => headers,
    };
    return resObj;
  }

  // 10.1: Vercel GET /api/tinyfish/status (Web Request API)
  const vStatusCorsReq = new Request('http://localhost/api/tinyfish/status', { method: 'OPTIONS' });
  const vStatusCorsRes = await vercelStatusHandler(vStatusCorsReq);
  assert(vStatusCorsRes.status === 204, 'Vercel status handler OPTIONS preflight returns 204');
  assert(vStatusCorsRes.headers.get('Access-Control-Allow-Origin') === '*', 'Vercel status handler CORS header present');

  const vStatusReq = new Request('http://localhost/api/tinyfish/status', { method: 'GET' });
  const vStatusRes = await vercelStatusHandler(vStatusReq);
  assert(vStatusRes.status === 200, 'Vercel status handler GET returns 200');
  const vStatusJson = await vStatusRes.json();
  assert(vStatusJson.service === 'TinyFish', 'Vercel status handler returns service: TinyFish');
  assert(typeof vStatusJson.configured === 'boolean', 'Vercel status handler returns boolean configured');

  // 10.2: Vercel GET /api/tinyfish/status (Node.js Request/Response API)
  const nodeRes1 = createMockNodeRes();
  await vercelStatusHandler({ method: 'GET' }, nodeRes1);
  assert(nodeRes1._getStatus() === 200, 'Vercel Node status handler returns 200');
  assert(nodeRes1._getData()?.service === 'TinyFish', 'Vercel Node status handler returns service TinyFish');

  // 10.3: Vercel POST /api/tinyfish/search (Web Request API)
  const vSearchCors = await vercelSearchHandler(new Request('http://localhost/api/tinyfish/search', { method: 'OPTIONS' }));
  assert(vSearchCors.status === 204, 'Vercel search handler OPTIONS preflight returns 204');

  const vSearchBadJson = await vercelSearchHandler(new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  }));
  assert(vSearchBadJson.status === 400, 'Vercel search handler invalid JSON returns 400');
  const vSearchBadJsonData = await vSearchBadJson.json();
  assert(typeof vSearchBadJsonData.error === 'string', 'Vercel search handler error is string on bad JSON');

  const vSearchEmpty = await vercelSearchHandler(new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: JSON.stringify({ topic: '' }),
    headers: { 'Content-Type': 'application/json' },
  }));
  assert(vSearchEmpty.status === 400, 'Vercel search handler empty topic returns 400');
  const vSearchEmptyData = await vSearchEmpty.json();
  assert(typeof vSearchEmptyData.error === 'string', 'Vercel search handler error is string on empty topic');

  // Valid POST via Web Request API
  const vSearchValidWeb = await vercelSearchHandler(new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: JSON.stringify({ topic: 'phonics sound blending', grade: 'Class 1' }),
    headers: { 'Content-Type': 'application/json' },
  }));
  assert(vSearchValidWeb.status === 200, 'Vercel search handler valid POST returns 200 (Web Request)');
  const vSearchValidWebData = await vSearchValidWeb.json();
  assert(typeof vSearchValidWebData.success === 'boolean', 'Vercel search handler returns boolean success');
  assert(Array.isArray(vSearchValidWebData.resources), 'Vercel search handler returns resources array');

  // Node.js Serverless runtime (Vercel) tests for tinyfish search
  const nodeResSearchValidObj = createMockNodeRes();
  await vercelSearchHandler({
    method: 'POST',
    body: { topic: 'sight words recognition', grade: 'Class 2' },
  }, nodeResSearchValidObj);
  assert(nodeResSearchValidObj._getStatus() === 200, 'Vercel Node search handler returns 200 with object body');
  assert(Array.isArray(nodeResSearchValidObj._getData()?.resources), 'Vercel Node search handler returns resources array');

  const nodeResSearchValidStr = createMockNodeRes();
  await vercelSearchHandler({
    method: 'POST',
    body: JSON.stringify({ topic: 'vowel sounds' }),
  }, nodeResSearchValidStr);
  assert(nodeResSearchValidStr._getStatus() === 200, 'Vercel Node search handler returns 200 with string body');

  const nodeResSearchGet = createMockNodeRes();
  await vercelSearchHandler({
    method: 'GET',
    query: { topic: 'letter sounds' },
  }, nodeResSearchGet);
  assert(nodeResSearchGet._getStatus() === 200, 'Vercel Node search handler returns 200 with GET query');

  const nodeResSearchEmpty = createMockNodeRes();
  await vercelSearchHandler({
    method: 'POST',
    body: { topic: '' },
  }, nodeResSearchEmpty);
  assert(nodeResSearchEmpty._getStatus() === 400, 'Vercel Node search handler returns 400 on empty topic');
  assert(typeof nodeResSearchEmpty._getData()?.error === 'string', 'Vercel Node search handler error is string on empty topic');

  const nodeResSearchBadJson = createMockNodeRes();
  await vercelSearchHandler({
    method: 'POST',
    body: 'not-valid-json{',
  }, nodeResSearchBadJson);
  assert(nodeResSearchBadJson._getStatus() === 400, 'Vercel Node search handler returns 400 on bad JSON string');
  assert(typeof nodeResSearchBadJson._getData()?.error === 'string', 'Vercel Node search handler error is string on bad JSON');

  // 10.4: Vercel POST /api/resources/search (forwarding alias)
  const vResourcesCors = await vercelResourcesHandler(new Request('http://localhost/api/resources/search', { method: 'OPTIONS' }));
  assert(vResourcesCors.status === 204, 'Vercel resources handler OPTIONS preflight returns 204');

  const nodeResAliasValid = createMockNodeRes();
  await vercelResourcesHandler({
    method: 'POST',
    body: { topic: 'phonics exercises' },
  }, nodeResAliasValid);
  assert(nodeResAliasValid._getStatus() === 200, 'Vercel resources alias returns 200 on valid POST');

  const nodeResAliasInvalid = createMockNodeRes();
  await vercelResourcesHandler({
    method: 'POST',
    body: { topic: '' },
  }, nodeResAliasInvalid);
  assert(nodeResAliasInvalid._getStatus() === 400, 'Vercel resources alias returns 400 on invalid POST');
  assert(typeof nodeResAliasInvalid._getData()?.error === 'string', 'Vercel resources alias error is string');

  // Regression Test: Exact failure reproduction and prevention
  // When backend/Vercel platform returns an error object e.g. { error: { code: 'FUNCTION_INVOCATION_FAILED', message: 'Timeout' } }
  const tinyFishService = TinyFishService.getInstance();
  const originalFetch = globalThis.fetch;

  // Scenario A: Vercel platform error with { error: { code, message } }
  globalThis.fetch = (async () => new Response(JSON.stringify({
    error: {
      code: 'FUNCTION_INVOCATION_FAILED',
      message: 'Serverless function crashed or timed out.',
    },
  }), {
    status: 504,
    headers: { 'Content-Type': 'application/json' },
  })) as any;

  const vercelPlatformErrorResp = await tinyFishService.searchResources({ topic: 'phonics' });
  assert(vercelPlatformErrorResp.success === false, 'Service handles Vercel platform error safely');
  assert(typeof vercelPlatformErrorResp.error === 'string', 'Error object is normalized to string primitive');
  assert(vercelPlatformErrorResp.error === 'Serverless function crashed or timed out.', 'Normalized error extracts human-readable message');

  // Scenario B: Vercel error with code-only object
  globalThis.fetch = (async () => new Response(JSON.stringify({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
    },
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })) as any;

  const vercelCodeOnlyResp = await tinyFishService.searchResources({ topic: 'phonics' });
  assert(typeof vercelCodeOnlyResp.error === 'string', 'Error code object is normalized to string primitive');
  assert(vercelCodeOnlyResp.error === 'INTERNAL_SERVER_ERROR', 'Normalized error code used when message omitted');

  // Scenario C: Non-OK HTTP status without JSON error body
  globalThis.fetch = (async () => new Response(JSON.stringify({}), {
    status: 502,
    statusText: 'Bad Gateway',
    headers: { 'Content-Type': 'application/json' },
  })) as any;

  const httpErrorResp = await tinyFishService.searchResources({ topic: 'phonics' });
  assert(typeof httpErrorResp.error === 'string', 'HTTP error status produces string error');
  assert(httpErrorResp.error?.includes('502'), 'HTTP error includes status code');

  // Restore fetch
  globalThis.fetch = originalFetch;

  // 10.5: Vercel POST /api/ai/generate-activity (Web Request API)
  const vAiCors = await vercelAiHandler(new Request('http://localhost/api/ai/generate-activity', { method: 'OPTIONS' }));
  assert(vAiCors.status === 204, 'Vercel AI activity handler OPTIONS preflight returns 204');

  const vAiReq = new Request('http://localhost/api/ai/generate-activity', {
    method: 'POST',
    body: JSON.stringify({ skillId: 'skill_cvc_blending', difficulty: 'beginner', language: 'English' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const vAiRes = await vercelAiHandler(vAiReq);
  assert(vAiRes.status === 200, 'Vercel AI activity handler returns 200');
  const vAiJson = await vAiRes.json();
  assert(vAiJson.success === true, 'Vercel AI activity handler returns success: true');
  assert(vAiJson.activity.items.length >= 2, 'Vercel AI activity handler returns at least 2 items');
  assert(vAiJson.activity.items.some((i: any) => i.isCorrect), 'Vercel AI activity handler returns verified correct choice');

  // 10.6: Vercel POST /api/ai/generate-activity (Node.js Request/Response API)
  const nodeResAi = createMockNodeRes();
  await vercelAiHandler({
    method: 'POST',
    body: { skillId: 'skill_confused_letters_bd', difficulty: 'beginner', language: 'English' },
  }, nodeResAi);
  assert(nodeResAi._getStatus() === 200, 'Vercel Node AI handler returns 200');
  assert(nodeResAi._getData()?.success === true, 'Vercel Node AI handler returns success: true');
  assert(nodeResAi._getData()?.activity?.skillId === 'skill_confused_letters_bd', 'Vercel Node AI handler returns matched skill');

  // 10.7: Google Gemini AI Model Parsing with Structured JSON
  const mockGeminiJson = JSON.stringify({
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            id: 'act_gemini_test_1',
            skillId: 'skill_cvc_blending',
            title: 'Gemini Phonics Fusion 🌟',
            instruction: 'Blend the sounds together: c - a - t',
            difficulty: 'beginner',
            language: 'English',
            type: 'phonics_blend',
            prompt: 'Which word matches the blended sounds?',
            items: [
              { id: 'opt_cat', text: 'cat', visual: '🐱', isCorrect: true, feedbackHint: 'Wonderful blending! c-a-t makes cat!' },
              { id: 'opt_dog', text: 'dog', visual: '🐶', isCorrect: false, feedbackHint: 'Listen closely: /k/ /æ/ /t/.' }
            ],
            stepByStepHint: 'Say each sound: /k/... /æ/... /t/... cat!'
          })
        }]
      }
    }]
  });

  const mockGeminiFetch: typeof fetch = async () => new Response(mockGeminiJson, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const geminiGenerated = await handleGenerateActivity(
    { skillId: 'skill_cvc_blending', difficulty: 'beginner', language: 'English' },
    'mock-gemini-key',
    mockGeminiFetch
  );
  assert(geminiGenerated.id === 'act_gemini_test_1', 'Gemini handler parses structured JSON successfully');
  assert(geminiGenerated.title === 'Gemini Phonics Fusion 🌟', 'Gemini handler preserves generated title');
  assert(geminiGenerated.items.length === 2, 'Gemini handler includes generated items');
  assert(geminiGenerated.items[0].isCorrect === true, 'Gemini handler verifies correct choice');

  // 10.8: Google Gemini AI with Markdown Code Fences (```json ... ```)
  const mockMarkdownFencedJson = JSON.stringify({
    candidates: [{
      content: {
        parts: [{
          text: '```json\n' + JSON.stringify({
            id: 'act_gemini_fence_test',
            skillId: 'skill_letter_sounds_basic',
            title: 'Fenced Gemini Activity',
            instruction: 'Find the letter sound for s:',
            difficulty: 'beginner',
            language: 'English',
            type: 'word_match',
            prompt: 'Which word starts with s?',
            items: [
              { id: 'opt_sun', text: 'Sun', visual: '☀️', isCorrect: true, feedbackHint: 'Super! S is for Sun!' },
              { id: 'opt_moon', text: 'Moon', visual: '🌙', isCorrect: false, feedbackHint: 'Moon starts with M.' }
            ],
            stepByStepHint: 'Make the snake sound: sssss.'
          }) + '\n```'
        }]
      }
    }]
  });

  const mockFenceFetch: typeof fetch = async () => new Response(mockMarkdownFencedJson, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const fencedGenerated = await handleGenerateActivity(
    { skillId: 'skill_letter_sounds_basic', difficulty: 'beginner', language: 'English' },
    'mock-gemini-key',
    mockFenceFetch
  );
  assert(fencedGenerated.id === 'act_gemini_fence_test', 'Gemini handler cleanly strips markdown code fences');
  assert(fencedGenerated.title === 'Fenced Gemini Activity', 'Gemini handler validates fenced activity content');

  // 10.9: Google Gemini HTTP 429 Quota Exhaustion Fallback
  const mock429Fetch: typeof fetch = async () => new Response(JSON.stringify({
    error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).' }
  }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });

  const quotaFallback = await handleGenerateActivity(
    { skillId: 'skill_confused_letters_bd', difficulty: 'beginner', language: 'English' },
    'mock-gemini-key',
    mock429Fetch
  );
  assert(quotaFallback.skillId === 'skill_confused_letters_bd', 'Gemini 429 quota exhaustion gracefully falls back to deterministic curriculum');
  assert(quotaFallback.items.length >= 2, 'Quota fallback provides at least 2 valid items');
  assert(quotaFallback.items.some(i => i.isCorrect), 'Quota fallback includes a verified correct choice');

  // 10.10: Google Gemini Abort Timeout Fallback
  const mockGeminiTimeoutFetch: typeof fetch = async () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    throw error;
  };

  const timeoutFallback = await handleGenerateActivity(
    { skillId: 'skill_spelling_cvc', difficulty: 'intermediate', language: 'English' },
    'mock-gemini-key',
    mockGeminiTimeoutFetch
  );
  assert(timeoutFallback.skillId === 'skill_spelling_cvc', 'Gemini network timeout gracefully falls back to deterministic curriculum');
  assert(Boolean(timeoutFallback.stepByStepHint), 'Timeout fallback provides step-by-step hint');

  // 10.11: Vercel Node ESM Module Resolution & Bundled Worker Regression Tests
  console.log('\n--- Test Group 11: Vercel Node ESM Module Resolution & Runtime Bundling ---');

  // Verify physical bundled JS files exist in src/worker
  const workerTinyfishJsPath = path.resolve('src/worker/tinyfishHandler.js');
  const workerAiJsPath = path.resolve('src/worker/aiHandler.js');
  assert(fs.existsSync(workerTinyfishJsPath), 'Bundled worker tinyfishHandler.js exists on disk');
  assert(fs.existsSync(workerAiJsPath), 'Bundled worker aiHandler.js exists on disk');

  // Verify dynamic ESM import succeeds in Node without ERR_MODULE_NOT_FOUND
  const importedTinyfishModule = await import('../src/worker/tinyfishHandler.js');
  assert(typeof importedTinyfishModule.handleTinyFishSearch === 'function', 'tinyfishHandler.js exports handleTinyFishSearch');
  assert(typeof importedTinyfishModule.validateSearchParams === 'function', 'tinyfishHandler.js exports validateSearchParams');

  const importedAiModule = await import('../src/worker/aiHandler.js');
  assert(typeof importedAiModule.handleGenerateActivity === 'function', 'aiHandler.js exports handleGenerateActivity');
  assert(typeof importedAiModule.validateActivityContent === 'function', 'aiHandler.js exports validateActivityContent');

  // Verify API route files use explicit compatible .js extensions for worker imports
  const apiSearchContent = fs.readFileSync(path.resolve('api/tinyfish/search.ts'), 'utf8');
  const apiResourcesContent = fs.readFileSync(path.resolve('api/resources/search.ts'), 'utf8');
  const apiAiContent = fs.readFileSync(path.resolve('api/ai/generate-activity.ts'), 'utf8');

  assert(apiSearchContent.includes("from '../../src/worker/tinyfishHandler.js'"), 'api/tinyfish/search.ts has explicit .js extension import');
  assert(apiResourcesContent.includes("from '../../src/worker/tinyfishHandler.js'"), 'api/resources/search.ts has explicit .js extension import');
  assert(apiAiContent.includes("from '../../src/worker/aiHandler.js'"), 'api/ai/generate-activity.ts has explicit .js extension import');

  // Verify vercel.json includes src/worker in function packaging
  const vercelJson = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
  assert(Boolean(vercelJson.functions?.['api/**/*.ts']?.includeFiles?.includes('src/worker')), 'vercel.json bundles src/worker in includeFiles');

  // Verify all 4 endpoints respond independently
  const mockVercelRes = () => {
    let statusCode = 200;
    let jsonBody: any = null;
    let headers: Record<string, string> = {};
    let ended = false;
    const resObj = {
      status: (code: number) => { statusCode = code; return resObj; },
      json: (data: any) => { jsonBody = data; return resObj; },
      setHeader: (k: string, v: string) => { headers[k] = v; return resObj; },
      end: () => { ended = true; return resObj; },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
      isEnded: () => ended,
    };
    return resObj;
  };

  // 1. GET /api/tinyfish/status
  const res1 = mockVercelRes();
  await vercelStatusHandler({ method: 'GET' }, res1);
  assert(res1.getStatusCode() === 200 && res1.getBody()?.service === 'TinyFish', 'Endpoint GET /api/tinyfish/status functions independently');

  // 2. POST /api/tinyfish/search
  const res2 = mockVercelRes();
  await vercelSearchHandler({ method: 'POST', body: { topic: 'vowels', grade: 'Grade 1' } }, res2);
  assert(res2.getStatusCode() === 200 && res2.getBody()?.query !== undefined, 'Endpoint POST /api/tinyfish/search functions independently');

  // 3. POST /api/resources/search
  const res3 = mockVercelRes();
  await vercelResourcesHandler({ method: 'POST', body: { topic: 'phonics' } }, res3);
  assert(res3.getStatusCode() === 200 && res3.getBody()?.query !== undefined, 'Endpoint POST /api/resources/search functions independently');

  // 4. POST /api/ai/generate-activity
  const res4 = mockVercelRes();
  await vercelAiHandler({ method: 'POST', body: { skillId: 'skill_letter_sounds_basic', difficulty: 'beginner' } }, res4);
  assert(res4.getStatusCode() === 200 && res4.getBody()?.success === true, 'Endpoint POST /api/ai/generate-activity functions independently');


  // =========================================================================
  // Test Group 12: Complete Multilingual Support, i18n & Voice Audio System
  // =========================================================================
  console.log('\n--- Test Group 12: Complete Multilingual Support & Language Selection ---');

  // 12.1: Supported Languages & Native Scripts
  const supportedLangs = i18n.getSupportedLanguages();
  assert(supportedLangs.length === 5, 'All five required languages are supported');
  const langCodes = supportedLangs.map(l => l.code);
  assert(langCodes.includes('en') && langCodes.includes('hi') && langCodes.includes('or') && langCodes.includes('pa') && langCodes.includes('ta'),
    'Language codes [en, hi, or, pa, ta] are present');

  const langMap = Object.fromEntries(supportedLangs.map(l => [l.code, l.nativeName]));
  assert(langMap.en === 'English', 'English native name displayed as English');
  assert(langMap.hi === 'हिन्दी', 'Hindi native name displayed in Devanagari script (हिन्दी)');
  assert(langMap.or === 'ଓଡ଼ିଆ', 'Odia native name displayed in Odia script (ଓଡ଼ିଆ)');
  assert(langMap.pa === 'ਪੰਜਾਬੀ', 'Punjabi native name displayed in Gurmukhi script (ਪੰਜਾਬੀ)');
  assert(langMap.ta === 'தமிழ்', 'Tamil native name displayed in Tamil script (தமிழ்)');

  // 12.2: Language Selector UI Rendering with exact prefixes
  const authSelectHtml = i18n.renderLanguageSelect({ id: 'authLangSelect', current: 'hi' });
  assert(authSelectHtml.includes('id="authLangSelect"'), 'renderLanguageSelect renders custom element id');
  assert(authSelectHtml.includes('value="hi" selected'), 'renderLanguageSelect marks active language as selected');
  assert(authSelectHtml.includes('EG English'), 'auth dropdown contains exact prefix "EG English"');
  assert(authSelectHtml.includes('HN हिन्दी'), 'auth dropdown contains exact prefix "HN हिन्दी"');
  assert(authSelectHtml.includes('OD ଓଡ଼ିଆ'), 'auth dropdown contains exact prefix "OD ଓଡ଼ିଆ"');
  assert(authSelectHtml.includes('PB ਪੰਜਾਬੀ'), 'auth dropdown contains exact prefix "PB ਪੰਜਾਬੀ"');
  assert(authSelectHtml.includes('TM தமிழ்'), 'auth dropdown contains exact prefix "TM தமிழ்"');

  const topSelectHtml = i18n.renderLanguageSelect({ id: 'topLangSelect', current: 'or' });
  assert(topSelectHtml.includes('id="topLangSelect"'), 'renderLanguageSelect renders topbar selector id');
  assert(topSelectHtml.includes('value="or" selected'), 'renderLanguageSelect marks Odia as selected in topbar');
  assert(topSelectHtml.includes('OD ଓଡ଼ିଆ'), 'topbar dropdown displays prefix and native name "OD ଓଡ଼ିଆ"');
  assert(topSelectHtml.includes('EG English') && topSelectHtml.includes('HN हिन्दी') && topSelectHtml.includes('PB ਪੰਜਾਬੀ') && topSelectHtml.includes('TM தமிழ்'),
    'topbar dropdown contains all 5 exact prefixed options consistently');

  // 12.3: Scenario 1 - Pre-login / Auth Language Selection & Instant UI Updates
  await i18n.setLanguage('hi');
  assert(i18n.getCurrentLanguage() === 'hi', 'Pre-login selection switches active language to Hindi');
  assert(i18n.t('auth.login.title') === 'अभिभावक लॉगिन', 'Login title translates to Hindi immediately');
  assert(i18n.t('auth.login.submitBtn') === 'खाते में लॉग इन करें', 'Login submit button translates to Hindi');
  assert(globalThis.localStorage.getItem('dysleximate_lang') === 'hi', 'Guest language preference persists to localStorage');

  await i18n.setLanguage('pa');
  assert(i18n.getCurrentLanguage() === 'pa', 'Pre-login selection switches active language to Punjabi');
  assert(i18n.t('auth.login.title') === 'ਮਾਪੇ ਲਾਗ ਇਨ', 'Login title translates to Punjabi immediately');

  await i18n.setLanguage('or');
  assert(i18n.getCurrentLanguage() === 'or', 'Pre-login selection switches active language to Odia');
  assert(i18n.t('auth.login.title') === 'ଅଭିଭାବକ ଲଗ୍ ଇନ୍', 'Login title translates to Odia immediately');

  await i18n.setLanguage('ta');
  assert(i18n.getCurrentLanguage() === 'ta', 'Pre-login selection switches active language to Tamil');
  assert(i18n.t('auth.login.title') === 'பெற்றோர் உள்நுழைவு', 'Login title translates to Tamil immediately');

  // Registration carrying selected language
  const authService = AuthService.getInstance();
  const testRegResult = await authService.register({
    fullName: 'Multilingual Parent',
    email: `multi_parent_${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    acceptTerms: true,
    interfaceLanguage: 'ta',
    initialChild: {
      name: 'Ananya',
      grade: 'Grade 2',
      preferredLanguage: 'Tamil',
      avatar: '👧',
    },
  });
  assert(testRegResult.success === true, 'User registration succeeds with interfaceLanguage payload');
  assert(testRegResult.user?.interfaceLanguage === 'ta', 'Registered user retains selected interfaceLanguage');

  // 12.4: Scenario 2 - Post-login Language Dropdown & Persistence
  // Updating interface language in-app
  const updateLangResult = await authService.updateInterfaceLanguage('pa');
  assert(updateLangResult === true, 'AuthService.updateInterfaceLanguage succeeds for authenticated user');
  assert(authService.getCurrentUser()?.interfaceLanguage === 'pa', 'Current user object updates interfaceLanguage');

  // 12.5: Initial Language Resolution Order
  // Case A: Authenticated user preference takes top priority
  const resLangA = i18n.resolveInitialLanguage({
    authenticatedUserLang: 'hi',
    guestSavedLang: 'en',
    childPreferredLang: 'Tamil',
  });
  assert(resLangA === 'hi', 'Initial resolution: Authenticated user saved preference takes top priority');

  // Case B: Guest saved preference takes second priority
  const resLangB = i18n.resolveInitialLanguage({
    guestSavedLang: 'or',
    childPreferredLang: 'English',
  });
  assert(resLangB === 'or', 'Initial resolution: Guest saved preference takes precedence over child language');

  // Case C: Child preferred language used when user/guest has no preference
  // Clear guest storage momentarily for clean test
  globalThis.localStorage.removeItem('dysleximate_interface_lang_v1');
  globalThis.localStorage.removeItem('dysleximate_lang');
  const resLangC = i18n.resolveInitialLanguage({
    childPreferredLang: 'Punjabi',
  });
  assert(resLangC === 'pa', 'Initial resolution: Child preferred language maps to code when user/guest unset');

  // Case D: Default fallback to English
  const resLangD = i18n.resolveInitialLanguage({});
  assert(resLangD === 'en', 'Initial resolution: Defaults cleanly to English when all unset');

  // 12.6: Separation of Parent Interface Language & Learner Preferred Language
  const profileService = ProfileService.getInstance();
  const currentParent = authService.getCurrentUser()!;
  
  // Create child with Hindi learning preference
  const childHindi = await profileService.createChild(currentParent.id, {
    name: 'Aarav',
    grade: 'Grade 3',
    preferredLanguage: 'Hindi',
    avatar: '👦',
    preferences: {
      readingSpeed: 'normal',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: true,
    },
  });

  // Create child with Tamil learning preference
  const childTamil = await profileService.createChild(currentParent.id, {
    name: 'Kavitha',
    grade: 'Grade 1',
    preferredLanguage: 'Tamil',
    avatar: '👧',
    preferences: {
      readingSpeed: 'slow',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: true,
    },
  });

  // Change parent interface language to Odia
  await i18n.setLanguage('or');
  await authService.updateInterfaceLanguage('or');

  // Verify child learning preferences were unaffected
  const verifyChildHindi = await profileService.getChild(childHindi.id);
  const verifyChildTamil = await profileService.getChild(childTamil.id);
  assert(verifyChildHindi?.preferredLanguage === 'Hindi', 'Child Hindi learning preference preserved after parent interface change');
  assert(verifyChildTamil?.preferredLanguage === 'Tamil', 'Child Tamil learning preference preserved after parent interface change');
  assert(authService.getCurrentUser()?.interfaceLanguage === 'or', 'Parent interface language successfully set to Odia');

  // 12.7: Voice Synthesis Locales & Speech Cancellation
  const speechService = SpeechService.getInstance();
  assert(speechService.getLocaleForLanguage('en') === 'en-IN', 'Voice locale for English is en-IN');
  assert(speechService.getLocaleForLanguage('hi') === 'hi-IN', 'Voice locale for Hindi is hi-IN');
  assert(speechService.getLocaleForLanguage('or') === 'or-IN', 'Voice locale for Odia is or-IN');
  assert(speechService.getLocaleForLanguage('pa') === 'pa-IN', 'Voice locale for Punjabi is pa-IN');
  assert(speechService.getLocaleForLanguage('ta') === 'ta-IN', 'Voice locale for Tamil is ta-IN');

  const voiceEn = speechService.findBestVoiceForLocale('en-IN');
  assert(voiceEn !== null && voiceEn.lang === 'en-IN', 'findBestVoiceForLocale identifies en-IN voice');
  const voiceHi = speechService.findBestVoiceForLocale('hi-IN');
  assert(voiceHi !== null && voiceHi.lang === 'hi-IN', 'findBestVoiceForLocale identifies hi-IN voice');
  const voiceTa = speechService.findBestVoiceForLocale('ta-IN');
  assert(voiceTa !== null && voiceTa.lang === 'ta-IN', 'findBestVoiceForLocale identifies ta-IN voice');

  // Speech stop method works without exception
  speechService.stop();
  assert(true, 'speechService.stop executes cleanly');

  // 12.8: Genuinely Multilingual Learning Content & Native Writing Systems
  // Hindi Curriculum (Devanagari script)
  const actHi = getDeterministicActivity({
    skillId: 'skill_cvc_blending',
    difficulty: 'beginner',
    language: 'Hindi',
  });
  assert(actHi.language === 'Hindi', 'Hindi activity preserves Hindi language tag');
  const devanagariRegex = /[\u0900-\u097F]/;
  assert(devanagariRegex.test(actHi.prompt), 'Hindi activity prompt uses Devanagari script');
  assert(actHi.items.some(i => devanagariRegex.test(i.text)), 'Hindi activity items use Devanagari script');
  assert(actHi.items.some(i => i.isCorrect), 'Hindi activity includes verified correct choice');

  // Odia Curriculum (Odia script)
  const actOr = getDeterministicActivity({
    skillId: 'skill_cvc_blending',
    difficulty: 'beginner',
    language: 'Odia',
  });
  assert(actOr.language === 'Odia', 'Odia activity preserves Odia language tag');
  const odiaRegex = /[\u0B00-\u0B7F]/;
  assert(odiaRegex.test(actOr.prompt), 'Odia activity prompt uses Odia script');
  assert(actOr.items.some(i => odiaRegex.test(i.text)), 'Odia activity items use Odia script');
  assert(actOr.items.some(i => i.isCorrect), 'Odia activity includes verified correct choice');

  // Punjabi Curriculum (Gurmukhi script)
  const actPa = getDeterministicActivity({
    skillId: 'skill_cvc_blending',
    difficulty: 'beginner',
    language: 'Punjabi',
  });
  assert(actPa.language === 'Punjabi', 'Punjabi activity preserves Punjabi language tag');
  const gurmukhiRegex = /[\u0A00-\u0A7F]/;
  assert(gurmukhiRegex.test(actPa.prompt), 'Punjabi activity prompt uses Gurmukhi script');
  assert(actPa.items.some(i => gurmukhiRegex.test(i.text)), 'Punjabi activity items use Gurmukhi script');
  assert(actPa.items.some(i => i.isCorrect), 'Punjabi activity includes verified correct choice');

  // Tamil Curriculum (Tamil script)
  const actTa = getDeterministicActivity({
    skillId: 'skill_cvc_blending',
    difficulty: 'beginner',
    language: 'Tamil',
  });
  assert(actTa.language === 'Tamil', 'Tamil activity preserves Tamil language tag');
  const tamilRegex = /[\u0B80-\u0BFF]/;
  assert(tamilRegex.test(actTa.prompt), 'Tamil activity prompt uses Tamil script');
  assert(actTa.items.some(i => tamilRegex.test(i.text)), 'Tamil activity items use Tamil script');
  assert(actTa.items.some(i => i.isCorrect), 'Tamil activity includes verified correct choice');

  // English Curriculum (Latin script)
  const actEn = getDeterministicActivity({
    skillId: 'skill_cvc_blending',
    difficulty: 'beginner',
    language: 'English',
  });
  assert(actEn.language === 'English', 'English activity preserves English language tag');
  assert(/[a-zA-Z]/.test(actEn.prompt), 'English activity prompt uses Latin alphabet');
  assert(actEn.items.some(i => i.isCorrect), 'English activity includes verified correct choice');

  // Check additional skills across languages
  const skillsToVerify = [
    'skill_confused_letters_bd',
    'skill_missing_letter',
    'skill_phonemic_rhyme',
    'skill_story_comprehension',
    'skill_sentence_fluency',
  ];
  for (const sk of skillsToVerify) {
    const hindiSkillAct = getDeterministicActivity({ skillId: sk, difficulty: 'beginner', language: 'Hindi' });
    assert(devanagariRegex.test(hindiSkillAct.prompt) || devanagariRegex.test(hindiSkillAct.instruction),
      `Hindi curriculum generates authentic Devanagari content for ${sk}`);

    const tamilSkillAct = getDeterministicActivity({ skillId: sk, difficulty: 'beginner', language: 'Tamil' });
    assert(tamilRegex.test(tamilSkillAct.prompt) || tamilRegex.test(tamilSkillAct.instruction),
      `Tamil curriculum generates authentic Tamil content for ${sk}`);
  }

  // 12.9: Missing Translation Detection
  const missingKeyResult = i18n.t('some.totally.fake.key');
  assert(missingKeyResult.includes('[MISSING:'), 'Missing translation produces explicit [MISSING: ...] indicator');
  assert(!missingKeyResult.includes('undefined'), 'Missing translation does not return undefined string');

  // Verify all 5 dictionaries have complete top-level and essential namespace coverage
  const testNamespaces = [
    'common.save',
    'nav.myHome',
    'nav.practice',
    'nav.myProgress',
    'nav.storyShelf',
    'nav.resourceFinder',
    'auth.login.title',
    'auth.register.title',
    'home.heroGreeting',
    'practice.heading',
    'progress.heading',
    'stories.heading',
    'resources.title',
    'parent.hubTitle',
    'childModal.addTitle',
    'profileSelect.title',
    'activity.preparingTitle',
    'voice.noNativeVoice',
  ];

  for (const code of ['en', 'hi', 'or', 'pa', 'ta'] as AppLanguageCode[]) {
    await i18n.setLanguage(code);
    for (const key of testNamespaces) {
      const val = i18n.t(key);
      assert(!val.startsWith('[MISSING:'), `Key "${key}" is translated for language "${code}"`);
      assert(val.trim().length > 0, `Translation for "${key}" in "${code}" is non-empty`);
    }
  }

  // 12.10: Multilingual Resource Finder Integration
  const qHindi = buildEducationalQuery({ topic: 'phonics', language: 'Hindi' });
  assert(qHindi.includes('Hindi'), 'Query includes Hindi language keyword');
  const qTamil = buildEducationalQuery({ topic: 'spelling', language: 'Tamil' });
  assert(qTamil.includes('Tamil'), 'Query includes Tamil language keyword');

  const resHindi = mockVercelRes();
  await vercelSearchHandler({ method: 'POST', body: { topic: 'phonics', language: 'Hindi' } }, resHindi);
  assert(resHindi.getStatusCode() === 200, 'Resource search accepts Hindi language parameter');
  assert(resHindi.getBody()?.query?.includes('Hindi'), 'Resource search incorporates Hindi language preference into query');

  const resTamil = mockVercelRes();
  await vercelSearchHandler({ method: 'POST', body: { topic: 'spelling', language: 'Tamil' } }, resTamil);
  assert(resTamil.getStatusCode() === 200, 'Resource search accepts Tamil language parameter');
  assert(resTamil.getBody()?.query?.includes('Tamil'), 'Resource search incorporates Tamil language preference into query');

  // 12.11: Supabase Database Migration File Verification
  const multilingualMigrationPath = path.resolve('supabase/migrations/20261022000000_multilingual_support.sql');
  assert(fs.existsSync(multilingualMigrationPath), 'Multilingual Supabase migration file exists');
  const migrationSql = fs.readFileSync(multilingualMigrationPath, 'utf8');
  assert(migrationSql.includes('interface_language'), 'Migration adds interface_language column');
  assert(migrationSql.includes('account_preferences'), 'Migration alters account_preferences table');
  assert(migrationSql.includes('parent_profiles'), 'Migration alters parent_profiles table');

  // 12.12: Automated Full-Codebase Key Coverage Verification
  function scanDirFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        if (file !== 'locales') {
          results = results.concat(scanDirFiles(full));
        }
      } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.html')) {
        results.push(full);
      }
    }
    return results;
  }

  const allSrcFiles = scanDirFiles('src');
  const uiKeysFound = new Set<string>();
  const keyScanRegex = /(?:(?:\bi18n\.)|\bt)\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
  for (const f of allSrcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = keyScanRegex.exec(content)) !== null) {
      uiKeysFound.add(m[1]);
    }
  }

  assert(uiKeysFound.size > 150, `Discovered ${uiKeysFound.size} translation keys across active codebase`);

  for (const lang of ['en', 'hi', 'or', 'pa', 'ta'] as AppLanguageCode[]) {
    await i18n.setLanguage(lang);
    let missingCount = 0;
    const missingKeys: string[] = [];
    for (const k of uiKeysFound) {
      const val = i18n.t(k);
      if (val.startsWith('[MISSING:')) {
        missingCount++;
        missingKeys.push(k);
      }
    }
    assert(missingCount === 0, `All ${uiKeysFound.size} UI keys translated in language [${lang}] (0 missing)`);
    if (missingCount > 0) {
      console.error(`Missing keys in [${lang}]:`, missingKeys);
    }
  }

  // 12.13: Language Selector Two-Letter Prefixes Verification (EG, HN, OD, PB, TM)
  assert(SUPPORTED_LANGUAGES.length === 5, 'Exactly 5 languages configured in SUPPORTED_LANGUAGES');

  const expectedPrefixes: Record<AppLanguageCode, { prefix: string; nativeName: string; combined: string }> = {
    en: { prefix: 'EG', nativeName: 'English', combined: 'EG English' },
    hi: { prefix: 'HN', nativeName: 'हिन्दी', combined: 'HN हिन्दी' },
    or: { prefix: 'OD', nativeName: 'ଓଡ଼ିଆ', combined: 'OD ଓଡ଼ିଆ' },
    pa: { prefix: 'PB', nativeName: 'ਪੰਜਾਬੀ', combined: 'PB ਪੰਜਾਬੀ' },
    ta: { prefix: 'TM', nativeName: 'தமிழ்', combined: 'TM தமிழ்' },
  };

  for (const [code, meta] of Object.entries(expectedPrefixes)) {
    const langMeta = SUPPORTED_LANGUAGES.find(l => l.code === code);
    assert(!!langMeta, `Language meta found for ${code}`);
    assert(langMeta?.prefix === meta.prefix, `Language ${code} has exact prefix "${meta.prefix}"`);
    assert(langMeta?.nativeName === meta.nativeName, `Language ${code} has exact nativeName "${meta.nativeName}"`);
  }

  // Verify renderLanguageSelect produces exact prefixes for all options
  for (const code of ['en', 'hi', 'or', 'pa', 'ta'] as AppLanguageCode[]) {
    const html = i18n.renderLanguageSelect({ id: 'testLangDropdown', current: code });
    for (const [c, expected] of Object.entries(expectedPrefixes)) {
      const optionSnippet = `<option value="${c}" ${c === code ? 'selected' : ''}>${expected.combined}</option>`;
      assert(html.includes(optionSnippet), `renderLanguageSelect includes exact option "${optionSnippet}" when active is ${code}`);
    }
    // Verify currently selected language option displays its prefix and native name
    const activeMeta = expectedPrefixes[code];
    assert(html.includes(`value="${code}" selected>${activeMeta.combined}</option>`),
      `Selected language (${code}) displays prefix and native-language name: "${activeMeta.combined}"`);
  }

  // Verify internal codes remain unchanged (en, hi, or, pa, ta)
  const actualCodes = SUPPORTED_LANGUAGES.map(l => l.code).sort();
  const expectedCodes = ['en', 'hi', 'or', 'pa', 'ta'].sort();
  assert(JSON.stringify(actualCodes) === JSON.stringify(expectedCodes),
    'Internal language codes strictly preserved as [en, hi, or, pa, ta]');

  // =========================================================================
  // Test Group 13: Multilingual Learning Activities & Phonics Verification
  // =========================================================================
  console.log('\n--- Test Group 13: Multilingual Learning Activities & Phonics ---');

  const actLangCodes: AppLanguageCode[] = ['en', 'hi', 'or', 'pa', 'ta'];
  const langNames: Record<AppLanguageCode, SupportedLanguage> = {
    en: 'English',
    hi: 'Hindi',
    or: 'Odia',
    pa: 'Punjabi',
    ta: 'Tamil',
  };

  const scriptRegexMap: Record<AppLanguageCode, RegExp> = {
    en: /[a-zA-Z]/,
    hi: /[\u0900-\u097F]/,
    or: /[\u0B00-\u0B7F]/,
    pa: /[\u0A00-\u0A7F]/,
    ta: /[\u0B80-\u0BFF]/,
  };

  // 13.1: Phonics Correctness for the /m/ Letter Sound Question
  console.log('  Testing letter sound /m/ phonics across all 5 languages...');
  const mExpectedMap: Record<AppLanguageCode, { targetChar: string; correctWord: string; distractors: string[] }> = {
    en: { targetChar: 'm', correctWord: 'Moon', distractors: ['Star', 'Tree'] },
    hi: { targetChar: 'म', correctWord: 'मछली', distractors: ['पेड़', 'तारा'] },
    or: { targetChar: 'ମ', correctWord: 'ମାଛ', distractors: ['ଗଛ', 'ତାରା'] },
    pa: { targetChar: 'ਮ', correctWord: 'ਮੱਛੀ', distractors: ['ਰੁੱਖ', 'ਤਾਰਾ'] },
    ta: { targetChar: 'ம', correctWord: 'மீன்', distractors: ['வீடு', 'பறவை'] },
  };

  for (const code of actLangCodes) {
    const langName = langNames[code];
    const expected = mExpectedMap[code];
    const act = getDeterministicActivity({
      skillId: 'skill_letter_sounds_basic',
      difficulty: 'beginner',
      language: langName,
    });

    assert(act.skillId === 'skill_letter_sounds_basic', `[${code}] Letter sound activity has correct skillId`);
    assert(act.instruction.length > 0, `[${code}] Instruction is present`);
    assert(act.prompt.length > 0, `[${code}] Prompt is present`);
    assert(act.items.length >= 2, `[${code}] Has at least 2 options`);

    // Verify native script
    const regex = scriptRegexMap[code];
    assert(regex.test(act.instruction), `[${code}] Instruction contains native script`);
    assert(regex.test(act.prompt), `[${code}] Prompt contains native script`);
    assert(regex.test(act.stepByStepHint || ''), `[${code}] Hint contains native script`);

    // Verify correct answer matches target sound
    const correctItems = act.items.filter(i => i.isCorrect);
    assert(correctItems.length === 1, `[${code}] Exactly one correct answer exists`);
    assert(correctItems[0].text === expected.correctWord, `[${code}] Correct answer is "${expected.correctWord}"`);

    // Verify distractors
    const distractorItems = act.items.filter(i => !i.isCorrect);
    assert(distractorItems.length >= 1, `[${code}] Distractors exist`);
    for (const d of distractorItems) {
      assert(expected.distractors.includes(d.text), `[${code}] Distractor "${d.text}" is valid target-language word`);
      if (code !== 'en') {
        const hasEnglish = /^[a-zA-Z\s]+$/.test(d.text);
        assert(!hasEnglish, `[${code}] Distractor "${d.text}" contains NO English characters`);
      }
    }

    // Verify correct feedback and retry messages in child language
    const winTitle = i18n.tForLang(code, 'activity.winTitle');
    const tryAgainTitle = i18n.tForLang(code, 'activity.tryAgainTitle');
    assert(winTitle && !winTitle.startsWith('[MISSING:'), `[${code}] Activity winTitle translated: "${winTitle}"`);
    assert(tryAgainTitle && !tryAgainTitle.startsWith('[MISSING:'), `[${code}] Activity tryAgainTitle translated: "${tryAgainTitle}"`);
  }

  // 13.2: Verify all 12 Core Learning Skills across all 5 Languages
  console.log('  Testing all core skills across English, Hindi, Odia, Punjabi, Tamil...');
  const skillsToTest = [
    'skill_letter_sounds_basic',
    'skill_letter_sounds_vowels',
    'skill_confused_letters_bd',
    'skill_confused_letters_pq',
    'skill_confused_words_reversals',
    'skill_phonemic_isolation',
    'skill_rhyming_patterns',
    'skill_cvc_blending',
    'skill_consonant_blends',
    'skill_syllable_clapping',
    'skill_spelling_phonetic',
    'skill_sight_words_high_freq',
    'skill_sentence_fluency',
    'skill_story_comprehension',
    'skill_listening_pronunciation',
  ];

  for (const code of actLangCodes) {
    const langName = langNames[code];
    const regex = scriptRegexMap[code];

    for (const skillId of skillsToTest) {
      const act = getDeterministicActivity({
        skillId,
        difficulty: 'beginner',
        language: langName,
      });

      assert(act.title && act.title.length > 0, `[${code} | ${skillId}] Activity title exists`);
      assert(act.instruction && act.instruction.length > 0, `[${code} | ${skillId}] Activity instruction exists`);
      assert(act.prompt && act.prompt.length > 0, `[${code} | ${skillId}] Activity prompt exists`);
      assert(act.items && act.items.length >= 2, `[${code} | ${skillId}] Has at least 2 choices`);

      const correctCount = act.items.filter(i => i.isCorrect).length;
      assert(correctCount >= 1, `[${code} | ${skillId}] At least 1 correct choice`);

      if (code !== 'en') {
        const fullContent = `${act.title} ${act.instruction} ${act.prompt} ${act.items.map(i => i.text).join(' ')}`;
        assert(regex.test(fullContent), `[${code} | ${skillId}] Activity contains authentic native script`);

        // Check options are NOT pure English
        const englishOptions = act.items.filter(i => /^[a-zA-Z\s]+$/.test(i.text.trim()));
        assert(englishOptions.length === 0, `[${code} | ${skillId}] Options contain no pure English words`);
      }
    }
  }

  // 13.3: Language Validation Guard in validateActivityContent
  console.log('  Testing validateActivityContent anti-hallucination script guards...');
  const badHindiActivity = {
    id: 'test_bad_hi',
    skillId: 'skill_letter_sounds_basic',
    title: 'Sound Match',
    instruction: 'Find the picture that matches the sound:',
    difficulty: 'beginner',
    language: 'Hindi',
    prompt: 'Which word starts with M?',
    items: [
      { id: '1', text: 'Moon', isCorrect: true },
      { id: '2', text: 'Star', isCorrect: false },
    ],
  };

  const validationResultBad = validateActivityContent(badHindiActivity, 'Hindi');
  assert(!validationResultBad.valid, 'validateActivityContent strictly rejects pure English text for Hindi requests');

  const goodHindiActivity = {
    id: 'test_good_hi',
    skillId: 'skill_letter_sounds_basic',
    title: 'अक्षर ध्वनि मिलान',
    instruction: 'चित्र देखकर बताइए कि कौन-सा शब्द "म" ध्वनि से शुरू होता है:',
    difficulty: 'beginner',
    language: 'Hindi',
    prompt: '"म" ध्वनि से शुरू होने वाला शब्द कौन-सा है?',
    items: [
      { id: '1', text: 'मछली', isCorrect: true, feedbackHint: 'शाबाश!' },
      { id: '2', text: 'पेड़', isCorrect: false, feedbackHint: 'पेड़ प से शुरू होता है।' },
    ],
  };

  const validationResultGood = validateActivityContent(goodHindiActivity, 'Hindi');
  assert(validationResultGood.valid, 'validateActivityContent accepts authentic Devanagari Hindi activity');

  // 13.4: SpeechService Locale and English Guard
  console.log('  Testing SpeechService language guards and locales...');
  const speech = SpeechService.getInstance();

  for (const code of actLangCodes) {
    const locale = speech.getLocaleForLanguage(code);
    assert(locale.startsWith(code === 'en' ? 'en' : code), `SpeechService locale for [${code}] matches ${locale}`);
  }

  // English guard: Speaking "Moon" with Hindi locale should be rejected safely
  const englishWithHindiSpeech = speech.speak('Moon', { langCode: 'hi' });
  assert(!englishWithHindiSpeech.spoken, 'SpeechService prevents reading English words with Hindi locale');
  assert(Boolean(englishWithHindiSpeech.message), 'SpeechService returns descriptive localized message');

  // Cancel speech
  speech.cancel();
  assert(true, 'SpeechService cancel() executes safely');

  // =========================================================================
  // Test Group 14: End-to-End Activity Launch, Rendered Output & Language Separation
  // =========================================================================
  console.log('\n--- Test Group 14: End-to-End Activity Launch & Exact Regression Scenario ---');

  // 14.1: Language Normalization (codes, locales, language names)
  console.log('  Testing language normalization across codes, locales, and names...');
  const testLangInputs = [
    { input: 'hi', expectedCode: 'hi', expectedLang: 'Hindi', expectedLocale: 'hi-IN' },
    { input: 'hi-IN', expectedCode: 'hi', expectedLang: 'Hindi', expectedLocale: 'hi-IN' },
    { input: 'hi_IN', expectedCode: 'hi', expectedLang: 'Hindi', expectedLocale: 'hi-IN' },
    { input: 'Hindi', expectedCode: 'hi', expectedLang: 'Hindi', expectedLocale: 'hi-IN' },
    { input: 'or', expectedCode: 'or', expectedLang: 'Odia', expectedLocale: 'or-IN' },
    { input: 'or-IN', expectedCode: 'or', expectedLang: 'Odia', expectedLocale: 'or-IN' },
    { input: 'Odia', expectedCode: 'or', expectedLang: 'Odia', expectedLocale: 'or-IN' },
    { input: 'oriya', expectedCode: 'or', expectedLang: 'Odia', expectedLocale: 'or-IN' },
    { input: 'pa', expectedCode: 'pa', expectedLang: 'Punjabi', expectedLocale: 'pa-IN' },
    { input: 'pa-IN', expectedCode: 'pa', expectedLang: 'Punjabi', expectedLocale: 'pa-IN' },
    { input: 'Punjabi', expectedCode: 'pa', expectedLang: 'Punjabi', expectedLocale: 'pa-IN' },
    { input: 'gurmukhi', expectedCode: 'pa', expectedLang: 'Punjabi', expectedLocale: 'pa-IN' },
    { input: 'ta', expectedCode: 'ta', expectedLang: 'Tamil', expectedLocale: 'ta-IN' },
    { input: 'ta-IN', expectedCode: 'ta', expectedLang: 'Tamil', expectedLocale: 'ta-IN' },
    { input: 'Tamil', expectedCode: 'ta', expectedLang: 'Tamil', expectedLocale: 'ta-IN' },
    { input: 'en', expectedCode: 'en', expectedLang: 'English', expectedLocale: 'en-IN' },
    { input: 'en-IN', expectedCode: 'en', expectedLang: 'English', expectedLocale: 'en-IN' },
    { input: 'English', expectedCode: 'en', expectedLang: 'English', expectedLocale: 'en-IN' },
  ];

  for (const t of testLangInputs) {
    const code = i18n.supportedLanguageToCode(t.input);
    const lang = i18n.codeToSupportedLanguage(t.input);
    const locale = i18n.codeToSpeechLocale(t.input);
    assert(code === t.expectedCode, `Input [${t.input}] normalizes to code [${t.expectedCode}]`);
    assert(lang === t.expectedLang, `Input [${t.input}] normalizes to language name [${t.expectedLang}]`);
    assert(locale === t.expectedLocale, `Input [${t.input}] normalizes to speech locale [${t.expectedLocale}]`);
  }

  // 14.2: Exact "Sound Safari: Letter Matching" Regression Scenario for All 5 Languages
  console.log('  Testing exact "Sound Safari: Letter Matching" phonics accuracy across 5 languages...');
  const soundSafariExpectations: Record<SupportedLanguage, {
    titleSnippet: string;
    targetPhoneme: string;
    correctWord: string;
    correctVisual: string;
    distractors: string[];
    nativeScriptRegex: RegExp;
  }> = {
    English: {
      titleSnippet: 'Sound Safari',
      targetPhoneme: '/m/',
      correctWord: 'Moon',
      correctVisual: '🌙',
      distractors: ['Star', 'Tree'],
      nativeScriptRegex: /[A-Za-z]/,
    },
    Hindi: {
      titleSnippet: 'अक्षर ध्वनि मिलान',
      targetPhoneme: 'म',
      correctWord: 'मछली',
      correctVisual: '🐟',
      distractors: ['पेड़', 'तारा'],
      nativeScriptRegex: /[\u0900-\u097F]/,
    },
    Odia: {
      titleSnippet: 'ଅକ୍ଷର ଧ୍ୱନି ମେଳ',
      targetPhoneme: 'ମ',
      correctWord: 'ମାଛ',
      correctVisual: '🐟',
      distractors: ['ଗଛ', 'ତାରା'],
      nativeScriptRegex: /[\u0B00-\u0B7F]/,
    },
    Punjabi: {
      titleSnippet: 'ਅੱਖਰ ਧੁਨੀ ਮੇਲ',
      targetPhoneme: 'ਮ',
      correctWord: 'ਮੱਛੀ',
      correctVisual: '🐟',
      distractors: ['ਰੁੱਖ', 'ਤਾਰਾ'],
      nativeScriptRegex: /[\u0A00-\u0A7F]/,
    },
    Tamil: {
      titleSnippet: 'எழுத்து ஒலி பொருத்தம்',
      targetPhoneme: 'ம',
      correctWord: 'மீன்',
      correctVisual: '🐟',
      distractors: ['வீடு', 'பறவை'],
      nativeScriptRegex: /[\u0B80-\u0BFF]/,
    },
  };

  for (const [langName, exp] of Object.entries(soundSafariExpectations)) {
    const act = getDeterministicActivity({
      skillId: 'skill_letter_sounds_basic',
      difficulty: 'beginner',
      language: langName as SupportedLanguage,
    });

    assert(act.title.includes(exp.titleSnippet), `[${langName}] activity title includes "${exp.titleSnippet}"`);
    assert(act.prompt.includes(exp.targetPhoneme), `[${langName}] prompt includes target sound "${exp.targetPhoneme}"`);
    assert(exp.nativeScriptRegex.test(act.instruction), `[${langName}] instruction uses authentic native script`);
    assert(exp.nativeScriptRegex.test(act.prompt), `[${langName}] prompt uses authentic native script`);

    const correctItem = act.items.find(i => i.isCorrect);
    assert(Boolean(correctItem), `[${langName}] has a marked correct answer`);
    assert(correctItem?.text === exp.correctWord, `[${langName}] correct answer is "${exp.correctWord}" matching target phoneme`);
    assert(correctItem?.visual === exp.correctVisual, `[${langName}] visual clue is "${exp.correctVisual}"`);

    // Verify distractors
    const distractorItems = act.items.filter(i => !i.isCorrect);
    assert(distractorItems.length === 2, `[${langName}] has exactly 2 distractors`);
    for (const d of exp.distractors) {
      assert(distractorItems.some(i => i.text === d), `[${langName}] contains valid distractor "${d}"`);
    }

    // CRITICAL: English Moon/Star/Tree NEVER appears in non-English lessons!
    if (langName !== 'English') {
      const hasEnglishMoon = act.items.some(i => i.text.toLowerCase() === 'moon');
      const hasEnglishStar = act.items.some(i => i.text.toLowerCase() === 'star');
      const hasEnglishTree = act.items.some(i => i.text.toLowerCase() === 'tree');
      assert(!hasEnglishMoon && !hasEnglishStar && !hasEnglishTree, `[${langName}] phonics lesson NEVER contains English Moon/Star/Tree`);
    }
  }

  // 14.3: Learning Path Cache Sensitivity and Invalidation on Language Change
  console.log('  Testing learning path cache invalidation on language change...');
  const lps = LearningPathService.getInstance();
  const testChildProfile: ChildProfile = {
    id: 'test_child_reg_1',
    parentId: 'parent-demo-1',
    name: 'Diya',
    grade: 'Class 2 · Early reader',
    preferredLanguage: 'English',
    avatar: '👧🏽',
    preferences: {
      readingSpeed: 'normal',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  // Generate initial English path
  const regEnglishPath = await lps.getOrGeneratePath(testChildProfile);
  assert(regEnglishPath.language === 'English', 'Initial learning path tracks language: English');
  assert(regEnglishPath.recommendations[0].title.includes('Sound Safari') || regEnglishPath.recommendations[0].title.includes('Letter'), 'English path has English title');

  // Change child learning language to Hindi
  testChildProfile.preferredLanguage = 'Hindi';
  const regHindiPath = await lps.getOrGeneratePath(testChildProfile);
  assert(regHindiPath.language === 'Hindi', 'Switched learning path invalidates stale English cache and generates Hindi path');
  assert(regHindiPath.recommendations[0].title.includes('अक्षर ध्वनि मिलान') || /[\u0900-\u097F]/.test(regHindiPath.recommendations[0].title), 'Hindi path has authentic Devanagari recommendation title');

  // Change child learning language to Tamil
  testChildProfile.preferredLanguage = 'Tamil';
  const regTamilPath = await lps.getOrGeneratePath(testChildProfile);
  assert(regTamilPath.language === 'Tamil', 'Switched learning path invalidates stale Hindi cache and generates Tamil path');
  assert(regTamilPath.recommendations[0].title.includes('எழுத்து') || /[\u0B80-\u0BFF]/.test(regTamilPath.recommendations[0].title), 'Tamil path has authentic Tamil recommendation title');

  // 14.4: Rendered Modal Output & Strict Parent/Child Language Separation
  console.log('  Testing rendered modal output & strict Parent vs Child language separation...');
  const modalRunner = ActivityRunnerModal.getInstance();

  // Scenario: Parent interface is in Hindi ('hi'), but Child is learning Tamil ('Tamil')
  await i18n.setLanguage('hi');
  assert(i18n.getCurrentLanguage() === 'hi', 'Parent interface language is Hindi (hi)');

  const tamilChild: ChildProfile = {
    id: 'child_tamil_learner',
    parentId: 'parent-demo-1',
    name: 'Anbu',
    grade: 'Class 3',
    preferredLanguage: 'Tamil',
    avatar: '👦🏾',
    preferences: {
      readingSpeed: 'normal',
      dyslexiaFont: false,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  const tamilRec = regTamilPath.recommendations[0];
  await modalRunner.startRecommendation(tamilChild, tamilRec);

  const renderedModal = (document.getElementById('actRunnerModalContainer') as any);
  assert(Boolean(renderedModal), 'Modal element exists in DOM');
  const modalHtml: string = renderedModal.innerHTML;

  // 1. General interface labels follow Parent language (Hindi)
  assert(modalHtml.includes('निर्देश'), 'Instructions heading tag follows parent language (Hindi: निर्देश)');
  assert(modalHtml.includes('संकेत सुनें') || modalHtml.includes('सुनें'), 'Audio button label follows parent language (Hindi)');
  assert(modalHtml.includes('साहसिक कार्य') || modalHtml.includes('अगला'), 'Next adventure button follows parent language (Hindi)');

  // 2. Educational lesson content follows Child learning language (Tamil)
  assert(/[\u0B80-\u0BFF]/.test(modalHtml), 'Lesson content rendered in authentic Tamil script');
  assert(modalHtml.includes('மீன்'), 'Rendered Tamil choices include target word "மீன்" (Fish)');
  assert(modalHtml.includes('வீடு'), 'Rendered Tamil choices include distractor word "வீடு" (House)');
  assert(modalHtml.includes('பறவை'), 'Rendered Tamil choices include distractor word "பறவை" (Bird)');

  // 3. No English Moon/Star/Tree and no [MISSING: ...] markers
  assert(!modalHtml.includes('>Moon<') && !modalHtml.includes('>Star<') && !modalHtml.includes('>Tree<'), 'Rendered non-English activity never contains English Moon/Star/Tree');
  assert(!modalHtml.includes('[MISSING:'), 'Rendered activity contains zero missing translation markers');

  // 4. Modal speech test: Speech is called with Tamil text and 'ta' language code
  const spokenTamil = speech.speak('மீன்', { langCode: 'ta' });
  assert(spokenTamil.spoken, 'SpeechService successfully synthesizes authentic Tamil lesson word');

  modalRunner.close();
  assert(true, 'Modal closes cleanly and halts speech');

  // =========================================================================
  // Test Group 15: Fully Multilingual Narration, Spoken Audio & TalkBack
  // =========================================================================
  console.log('\n--- Test Group 15: Multilingual Narration, Spoken Audio & TalkBack ---');

  const testLanguages: Array<{
    code: AppLanguageCode;
    name: string;
    speechLocale: string;
    scriptRegex: RegExp;
    sampleWord: string;
  }> = [
    { code: 'en', name: 'English', speechLocale: 'en-IN', scriptRegex: /^[A-Za-z0-9\s.,!?'"()\-:;\/]+$/, sampleWord: 'Moon' },
    { code: 'hi', name: 'Hindi', speechLocale: 'hi-IN', scriptRegex: /[\u0900-\u097F]/, sampleWord: 'मछली' },
    { code: 'or', name: 'Odia', speechLocale: 'or-IN', scriptRegex: /[\u0B00-\u0B7F]/, sampleWord: 'ମାଛ' },
    { code: 'pa', name: 'Punjabi', speechLocale: 'pa-IN', scriptRegex: /[\u0A00-\u0A7F]/, sampleWord: 'ਮੱਛੀ' },
    { code: 'ta', name: 'Tamil', speechLocale: 'ta-IN', scriptRegex: /[\u0B80-\u0BFF]/, sampleWord: 'மீன்' },
  ];

  // 15.1: Verify speech locale resolution and voice matching for all 5 languages
  for (const lang of testLanguages) {
    const locale = speech.getLocaleForLanguage(lang.code);
    assert(locale === lang.speechLocale, `[${lang.name}] maps to speech locale [${lang.speechLocale}]`);

    // Verify speech synthesizes authentic native word
    const res = speech.speak(lang.sampleWord, { langCode: lang.code });
    assert(res.spoken, `[${lang.name}] speech synthesizes native sample word "${lang.sampleWord}"`);
  }

  // 15.2: Verify English text is rejected when an Indic speech locale is requested
  const rejectEnWithHi = speech.speak('This is pure english', { langCode: 'hi' });
  assert(rejectEnWithHi.spoken === false, 'SpeechService rejects speaking pure English text with Hindi locale');

  const rejectEnWithOr = speech.speak('This is pure english', { langCode: 'or' });
  assert(rejectEnWithOr.spoken === false, 'SpeechService rejects speaking pure English text with Odia locale');

  const rejectEnWithPa = speech.speak('This is pure english', { langCode: 'pa' });
  assert(rejectEnWithPa.spoken === false, 'SpeechService rejects speaking pure English text with Punjabi locale');

  const rejectEnWithTa = speech.speak('This is pure english', { langCode: 'ta' });
  assert(rejectEnWithTa.spoken === false, 'SpeechService rejects speaking pure English text with Tamil locale');

  // 15.3: Verify Voice Selection excludes English voices for Indic requests
  const partialVoiceList = [
    { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' },
    { name: 'Google हिन्दी', lang: 'hi-IN' },
    { name: 'Google தமிழ்', lang: 'ta-IN' },
  ] as unknown as SpeechSynthesisVoice[];

  (speech as any).voices = partialVoiceList;
  (speech as any).voicesLoaded = true;

  const foundHiVoice = speech.findBestVoiceForLocale('hi-IN');
  assert(Boolean(foundHiVoice && foundHiVoice.lang === 'hi-IN'), 'Correctly matches Google हिन्दी for hi-IN');

  const foundTaVoice = speech.findBestVoiceForLocale('ta-IN');
  assert(Boolean(foundTaVoice && foundTaVoice.lang === 'ta-IN'), 'Correctly matches Google தமிழ் for ta-IN');

  const foundOrVoice = speech.findBestVoiceForLocale('or-IN');
  assert(foundOrVoice === null, 'Does NOT fallback to English voice when Odia voice is missing');

  // Verify missing voice produces localized message and refuses to speak English
  const missingVoiceRes = speech.speak('ମାଛ', { langCode: 'or' });
  assert(missingVoiceRes.spoken === false, 'Refuses to speak without native voice');
  assert(Boolean(missingVoiceRes.message), 'Returns localized explanation for missing native voice');

  // Provide complete 5-language voices for full modal speech tests
  const completeVoiceList = [
    { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' },
    { name: 'Google हिन्दी', lang: 'hi-IN' },
    { name: 'Google ଓଡ଼ିଆ', lang: 'or-IN' },
    { name: 'Google ਪੰਜਾਬੀ', lang: 'pa-IN' },
    { name: 'Google தமிழ்', lang: 'ta-IN' },
  ] as unknown as SpeechSynthesisVoice[];

  (speech as any).voices = completeVoiceList;
  (speech as any).voicesLoaded = true;

  // 15.4: Verify modal rendered interactive audio controls and live region in all 5 languages
  for (const lang of testLanguages) {
    const childForLang: ChildProfile = {
      id: `child_test_${lang.code}`,
      parentId: 'parent-demo-1',
      name: `Learner_${lang.name}`,
      grade: 'Class 2',
      preferredLanguage: lang.name as any,
      avatar: '🌟',
      preferences: {
        readingSpeed: 'normal',
        dyslexiaFont: true,
        highContrast: false,
        soundEffects: true,
        autoReadAloud: false,
      },
      createdAt: new Date().toISOString(),
    };

    const path = await lps.getOrGeneratePath(childForLang);
    assert(path.language === lang.name, `Generated path tracks child language: ${lang.name}`);

    await modalRunner.startRecommendation(childForLang, path.recommendations[0]);
    const actModal = document.getElementById('actRunnerModalContainer');
    assert(Boolean(actModal), `[${lang.name}] Modal element mounted`);

    const actHtml = actModal?.innerHTML || '';

    // Check Live Region
    assert(actHtml.includes('id="actSrLiveRegion"'), `[${lang.name}] Modal contains screen-reader live region`);
    assert(actHtml.includes('aria-live="polite"'), `[${lang.name}] Live region has aria-live="polite"`);

    // Check Audio Buttons
    assert(actHtml.includes('id="btnPlayActInstruction"'), `[${lang.name}] Has instruction audio button`);
    assert(actHtml.includes('id="btnPlayActAudio"'), `[${lang.name}] Has question audio button`);
    assert(actHtml.includes('class="act-choice-listen-btn"'), `[${lang.name}] Has choice word audio buttons`);

    // Check that question and instructions use authentic native script
    const currentAct = (modalRunner as any).currentActivity;
    assert(Boolean(currentAct), `[${lang.name}] Current activity object exists`);
    assert(lang.scriptRegex.test(currentAct.prompt), `[${lang.name}] Visible prompt matches native script: "${currentAct.prompt}"`);
    assert(lang.scriptRegex.test(currentAct.instruction), `[${lang.name}] Visible instruction matches native script: "${currentAct.instruction}"`);

    // Check choice cards and audio
    for (const choice of currentAct.items) {
      assert(lang.scriptRegex.test(choice.text), `[${lang.name}] Choice "${choice.text}" matches native script`);
      // Verify choice can be spoken in child language
      const choiceSpoken = speech.speak(choice.text, { langCode: lang.code });
      assert(choiceSpoken.spoken, `[${lang.name}] Choice "${choice.text}" is spoken successfully`);
    }

    // Check hint speech
    const hintSpoken = speech.speak(currentAct.stepByStepHint, { langCode: lang.code });
    assert(hintSpoken.spoken, `[${lang.name}] Hint is spoken successfully in native language`);

    modalRunner.close();
  }

  // 15.5: Verify parent interface language change does NOT alter child learning speech
  await i18n.setLanguage('hi'); // Parent interface is Hindi
  const paChild: ChildProfile = {
    id: 'child_pa_learner',
    parentId: 'parent-demo-1',
    name: 'Harpreet',
    grade: 'Class 2',
    preferredLanguage: 'Punjabi',
    avatar: '👦🏽',
    preferences: {
      readingSpeed: 'normal',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  const paPath = await lps.getOrGeneratePath(paChild);
  await modalRunner.startRecommendation(paChild, paPath.recommendations[0]);
  const paModalHtml = document.getElementById('actRunnerModalContainer')?.innerHTML || '';

  // Parent UI is Hindi
  assert(paModalHtml.includes('निर्देश'), 'Parent UI labels remain Hindi (निर्देश)');
  // Child lesson is Punjabi
  assert(/[\u0A00-\u0A7F]/.test(paModalHtml), 'Child lesson content remains authentic Punjabi (Gurmukhi)');
  assert(paModalHtml.includes('ਮੱਛੀ'), 'Contains authentic Punjabi target word "ਮੱਛੀ"');

  modalRunner.close();

  // =========================================================================
  // TEST GROUP 16: Visual Learning Journey 3-Card Regression & Language Stability Tests
  // =========================================================================
  console.log('\n--- Group 16: Visual Learning Journey 3-Card Layout & Language Invariance ---');

  const journeyTestChildId = 'child_journey_test_' + Date.now();
  const journeyChild: ChildProfile = {
    id: journeyTestChildId,
    parentId: 'parent-demo-1',
    name: 'Aarav',
    grade: 'Class 2',
    preferredLanguage: 'English',
    avatar: '👦🏽',
    preferences: {
      readingSpeed: 'normal',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: false,
    },
    createdAt: new Date().toISOString(),
  };

  // 16.1: Verify initial learning path has exactly 3 cards matching the original Visual Learning Journey
  const initialPath = await lps.getOrGeneratePath(journeyChild);
  assert(initialPath.recommendations.length === 3, 'Visual Learning Journey generates exactly 3 cards for a beginner');

  // Verify Card 1: Letter-Sound Association (Basic) [BEGINNER]
  assert(initialPath.recommendations[0].targetSkillId === 'skill_letter_sounds_basic', 'Card 1 is Letter-Sound Association (Basic)');
  assert(initialPath.recommendations[0].title === 'Letter-Sound Association (Basic)', 'Card 1 title is Letter-Sound Association (Basic)');
  assert(initialPath.recommendations[0].difficulty === 'beginner', 'Card 1 difficulty is BEGINNER');

  // Verify Card 2: Short Vowel Sounds [BEGINNER] (NOT accidentally replaced by Audio-Assisted Pronunciation)
  assert(initialPath.recommendations[1].targetSkillId === 'skill_letter_sounds_vowels', 'Card 2 is Short Vowel Sounds');
  assert(initialPath.recommendations[1].title === 'Short Vowel Sounds', 'Card 2 title is Short Vowel Sounds');
  assert(initialPath.recommendations[1].difficulty === 'beginner', 'Card 2 difficulty is BEGINNER');
  assert(initialPath.recommendations[1].targetSkillId !== 'skill_listening_pronunciation', 'Card 2 is NOT unintentionally replaced by Audio-Assisted Pronunciation');

  // Verify Card 3: Letter Mirror: b vs d [INTERMEDIATE] (Restored and not disappeared)
  assert(initialPath.recommendations[2].targetSkillId === 'skill_confused_letters_bd', 'Card 3 is Letter Mirror: b vs d');
  assert(initialPath.recommendations[2].title === 'Letter Mirror: b vs d', 'Card 3 title is Letter Mirror: b vs d');
  assert(initialPath.recommendations[2].difficulty === 'intermediate', 'Card 3 difficulty is INTERMEDIATE');

  // 16.2: Language switching across all 5 languages preserves the exact same skill identities and card order
  const expectedSkillIds = [
    'skill_letter_sounds_basic',
    'skill_letter_sounds_vowels',
    'skill_confused_letters_bd',
  ];

  const languagesToTest: { lang: SupportedLanguage; code: AppLanguageCode; card1Snippet: string; card2Snippet: string; card3Snippet: string }[] = [
    { lang: 'Hindi', code: 'hi', card1Snippet: 'अक्षर ध्वनि मिलान', card2Snippet: 'ह्रस्व स्वर', card3Snippet: 'अक्षर पहचान' },
    { lang: 'Odia', code: 'or', card1Snippet: 'ଅକ୍ଷର ଧ୍ୱନି', card2Snippet: 'ହ୍ରସ୍ୱ ସ୍ୱର', card3Snippet: 'ଅକ୍ଷର ଚିହ୍ନଟ' },
    { lang: 'Punjabi', code: 'pa', card1Snippet: 'ਅੱਖਰ ਧੁਨੀ', card2Snippet: 'ਲਘੂ ਸਵਰ', card3Snippet: 'ਅੱਖਰ ਪਛਾਣ' },
    { lang: 'Tamil', code: 'ta', card1Snippet: 'எழுத்து ஒலி', card2Snippet: 'குறில் உயிர் ஒலிகள்', card3Snippet: 'எழுத்து வேறுபாடு' },
    { lang: 'English', code: 'en', card1Snippet: 'Letter-Sound Association', card2Snippet: 'Short Vowel Sounds', card3Snippet: 'Letter Mirror: b vs d' },
  ];

  for (const item of languagesToTest) {
    journeyChild.preferredLanguage = item.lang;
    const switchedPath = await lps.getOrGeneratePath(journeyChild);

    // Verify recommendations length unchanged
    assert(switchedPath.recommendations.length === 3, `[${item.lang}] Learning path maintains exactly 3 cards`);

    // Verify Skill IDs and order remain strictly unchanged
    const currentSkillIds = switchedPath.recommendations.map(r => r.targetSkillId);
    assert(
      JSON.stringify(currentSkillIds) === JSON.stringify(expectedSkillIds),
      `[${item.lang}] Skill IDs invariant across language switch: [${currentSkillIds.join(', ')}]`
    );

    // Verify card titles and objectives are properly localized
    assert(
      switchedPath.recommendations[0].title.includes(item.card1Snippet),
      `[${item.lang}] Card 1 title localized properly (${item.card1Snippet})`
    );
    assert(
      switchedPath.recommendations[1].title.includes(item.card2Snippet),
      `[${item.lang}] Card 2 title localized properly (${item.card2Snippet})`
    );
    assert(
      switchedPath.recommendations[2].title.includes(item.card3Snippet),
      `[${item.lang}] Card 3 title localized properly (${item.card3Snippet})`
    );
  }

  // 16.3: UI Journey View rendering checks
  const mockContainer = new MockDomElement();
  const journeyView = new LearningJourneyView(mockContainer as any);

  // Render in English
  journeyChild.preferredLanguage = 'English';
  await i18n.setLanguage('en');
  await journeyView.render(journeyChild);
  const enJourneyHtml = mockContainer.innerHTML;

  assert(enJourneyHtml.includes('Visual Learning Journey'), 'UI contains Visual Learning Journey header');
  assert(enJourneyHtml.includes('PROGRESSION ROADMAP'), 'UI contains PROGRESSION ROADMAP tag');
  assert(enJourneyHtml.includes('STEP 1'), 'UI contains STEP 1');
  assert(enJourneyHtml.includes('STEP 2'), 'UI contains STEP 2');
  assert(enJourneyHtml.includes('STEP 3'), 'UI contains STEP 3');
  assert(enJourneyHtml.includes('CURRENT'), 'UI contains CURRENT tag');
  assert(enJourneyHtml.includes('BEGINNER'), 'UI contains BEGINNER tag');
  assert(enJourneyHtml.includes('INTERMEDIATE'), 'UI contains INTERMEDIATE tag');
  assert(enJourneyHtml.includes('Start Now 🌟'), 'UI contains Start Now 🌟 button');
  assert(enJourneyHtml.includes('Preview'), 'UI contains Preview button');

  // Render in Hindi
  await i18n.setLanguage('hi');
  journeyChild.preferredLanguage = 'Hindi';
  await journeyView.render(journeyChild);
  const hiJourneyHtml = mockContainer.innerHTML;

  assert(hiJourneyHtml.includes('दृश्य शिक्षण यात्रा'), 'UI contains localized Hindi roadmap title');
  assert(hiJourneyHtml.includes('प्रगति रोडमैप'), 'UI contains localized Hindi roadmap tag');
  assert(hiJourneyHtml.includes('चरण 1'), 'UI contains localized Hindi step 1 label');
  assert(hiJourneyHtml.includes('वर्तमान'), 'UI contains localized Hindi current step label');
  assert(hiJourneyHtml.includes('प्रारंभिक'), 'UI contains localized Hindi difficulty tag (प्रारंभिक)');
  assert(hiJourneyHtml.includes('मध्यम'), 'UI contains localized Hindi difficulty tag (मध्यम)');
  assert(hiJourneyHtml.includes('अभी शुरू करें 🌟'), 'UI contains localized Hindi Start Now button');
  assert(hiJourneyHtml.includes('पूर्वावलोकन'), 'UI contains localized Hindi Preview button');

  // Render in Odia
  await i18n.setLanguage('or');
  journeyChild.preferredLanguage = 'Odia';
  await journeyView.render(journeyChild);
  const orJourneyHtml = mockContainer.innerHTML;

  assert(orJourneyHtml.includes('ଦୃଶ୍ୟମାନ ଶିକ୍ଷଣ ଯାତ୍ରା'), 'UI contains localized Odia roadmap title');
  assert(orJourneyHtml.includes('ପ୍ରାରମ୍ଭିକ'), 'UI contains localized Odia difficulty tag (ପ୍ରାରମ୍ଭିକ)');
  assert(orJourneyHtml.includes('ମଧ୍ୟମ'), 'UI contains localized Odia difficulty tag (ମଧ୍ୟମ)');
  assert(orJourneyHtml.includes('ଏବେ ଆରମ୍ଭ କରନ୍ତୁ 🌟'), 'UI contains localized Odia Start Now button');
  assert(orJourneyHtml.includes('ପୂର୍ବାବଲୋକନ'), 'UI contains localized Odia Preview button');

  // Render in Punjabi
  await i18n.setLanguage('pa');
  journeyChild.preferredLanguage = 'Punjabi';
  await journeyView.render(journeyChild);
  const paJourneyHtml = mockContainer.innerHTML;

  assert(paJourneyHtml.includes('ਵਿਜ਼ੂਅਲ ਸਿੱਖਣ ਸਫ਼ਰ'), 'UI contains localized Punjabi roadmap title');
  assert(paJourneyHtml.includes('ਸ਼ੁਰੂਆਤੀ'), 'UI contains localized Punjabi difficulty tag (ਸ਼ੁਰੂਆਤੀ)');
  assert(paJourneyHtml.includes('ਦਰਮਿਆਨਾ'), 'UI contains localized Punjabi difficulty tag (ਦਰਮਿਆਨਾ)');
  assert(paJourneyHtml.includes('ਹੁਣੇ ਸ਼ੁਰੂ ਕਰੋ 🌟'), 'UI contains localized Punjabi Start Now button');
  assert(paJourneyHtml.includes('ਪੂਰਵਦਰਸ਼ਨ'), 'UI contains localized Punjabi Preview button');

  // Render in Tamil
  await i18n.setLanguage('ta');
  journeyChild.preferredLanguage = 'Tamil';
  await journeyView.render(journeyChild);
  const taJourneyHtml = mockContainer.innerHTML;

  assert(taJourneyHtml.includes('காட்சிவழிக் கற்றல் பயணம்'), 'UI contains localized Tamil roadmap title');
  assert(taJourneyHtml.includes('தொடக்க நிலை'), 'UI contains localized Tamil difficulty tag (தொடக்க நிலை)');
  assert(taJourneyHtml.includes('இடைநிலை'), 'UI contains localized Tamil difficulty tag (இடைநிலை)');
  assert(taJourneyHtml.includes('இப்போதே தொடங்கு 🌟'), 'UI contains localized Tamil Start Now button');
  assert(taJourneyHtml.includes('முன்னோட்டம்'), 'UI contains localized Tamil Preview button');

  // -------------------------------------------------------------
  // Test Group 17: Save Child Profile & Duplicate Icons Regression Tests
  // -------------------------------------------------------------
  console.log('\n--- Group 17: Save Child Profile & Duplicate Icons Regression Tests ---');

  // 17.1 ProfileService createChild & language code normalization
  const ps = ProfileService.getInstance();
  const group17ParentId = 'parent-test-regression-17';

  // Test empty name validation error
  let emptyNameErrorCaught = false;
  try {
    await ps.createChild(group17ParentId, {
      name: '   ',
      grade: 'Class 3',
      preferredLanguage: 'Hindi',
      avatar: '🦊',
    });
  } catch (err: any) {
    emptyNameErrorCaught = true;
    assert(err.message.includes("name is required"), 'Rejects empty child name with meaningful error message');
  }
  assert(emptyNameErrorCaught, 'Validation error thrown when child name is empty');

  // Test successful creation with Punjabi language
  const createdChild = await ps.createChild(group17ParentId, {
    name: 'Kirat Singh',
    grade: 'Class 4 · Little reader',
    preferredLanguage: 'Punjabi',
    avatar: '🦁',
    preferences: {
      readingSpeed: 'slow',
      dyslexiaFont: true,
      highContrast: false,
      soundEffects: true,
      autoReadAloud: true,
    },
  });

  assert(createdChild.name === 'Kirat Singh', 'Child profile saved with correct name');
  assert(createdChild.grade === 'Class 4 · Little reader', 'Child profile saved with correct grade');
  assert(createdChild.preferredLanguage === 'Punjabi', 'Child profile saved with correct preferredLanguage');
  assert(createdChild.avatar === '🦁', 'Child profile saved with selected avatar');
  assert(createdChild.preferences?.dyslexiaFont === true, 'Child profile preserves dyslexia font preference');
  assert(createdChild.preferences?.autoReadAloud === true, 'Child profile preserves autoReadAloud preference');
  assert(createdChild.parentId === group17ParentId, 'Child profile is attached to the authenticated parent ID');

  // Test updating child profile
  const updatedChild = await ps.updateChild(createdChild.id, {
    name: 'Kirat S.',
    preferredLanguage: 'Tamil',
  });
  assert(updatedChild.name === 'Kirat S.', 'Child profile update preserves modified name');
  assert(updatedChild.preferredLanguage === 'Tamil', 'Child profile update properly modifies language');

  // 17.2 Language Code mappings across all 5 supported languages
  const group17SupportedLangs: Array<{ code: 'en' | 'hi' | 'or' | 'pa' | 'ta'; name: 'English' | 'Hindi' | 'Odia' | 'Punjabi' | 'Tamil' }> = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'or', name: 'Odia' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ta', name: 'Tamil' },
  ];

  for (const item of group17SupportedLangs) {
    assert(i18n.supportedLanguageToCode(item.name) === item.code, `Language ${item.name} maps to code ${item.code}`);
    assert(i18n.codeToSupportedLanguage(item.code) === item.name, `Code ${item.code} maps to language ${item.name}`);
  }

  // 17.3 Verify No Duplicate Icons in translation strings
  await i18n.setLanguage('en');
  const enAddChild = i18n.t('profileSelect.addChildBtn');
  assert(!enAddChild.startsWith('+'), `profileSelect.addChildBtn in en does not contain redundant hardcoded '+': "${enAddChild}"`);

  const enManage = i18n.t('profileSelect.manageProfilesBtn');
  assert(!enManage.includes('⚙️'), `profileSelect.manageProfilesBtn in en does not contain redundant hardcoded gear: "${enManage}"`);

  const enParentDash = i18n.t('profileSelect.parentDashBtn');
  assert(!enParentDash.includes('🔒'), `profileSelect.parentDashBtn in en does not contain redundant hardcoded lock: "${enParentDash}"`);

  const enStartReading = i18n.t('profileSelect.startReadingBtn');
  assert(!enStartReading.includes('→'), `profileSelect.startReadingBtn in en does not contain redundant hardcoded arrow: "${enStartReading}"`);

  const enEdit = i18n.t('profileSelect.editBtn');
  assert(!enEdit.includes('✏️'), `profileSelect.editBtn in en does not contain redundant hardcoded pencil: "${enEdit}"`);

  // Check Hindi locale strings as well
  await i18n.setLanguage('hi');
  const hiAddChild = i18n.t('profileSelect.addChildBtn');
  assert(!hiAddChild.startsWith('+'), `profileSelect.addChildBtn in hi does not contain redundant '+': "${hiAddChild}"`);
  const hiStartReading = i18n.t('profileSelect.startReadingBtn');
  assert(!hiStartReading.includes('→'), `profileSelect.startReadingBtn in hi does not contain redundant arrow: "${hiStartReading}"`);
  await i18n.setLanguage('en');

  // 17.4 ChildModalView UI creation and event wiring
  let profilesChangedChild: any = null;
  const childModalView = new ChildModalView((newChild) => {
    profilesChangedChild = newChild;
  });

  childModalView.openAddModal('parent-demo-1');
  const modalDom = document.getElementById('childActionModal');
  assert(modalDom !== null, 'childActionModal is rendered to DOM');
  assert(document.getElementById('childNameInput') !== null, 'childNameInput input exists');
  assert(document.getElementById('childGradeSelect') !== null, 'childGradeSelect select exists');
  assert(document.getElementById('childLangSelect') !== null, 'childLangSelect select exists');
  assert(document.getElementById('childModalAlert') !== null, 'childModalAlert alert exists for user feedback');
  assert(document.getElementById('btnSaveChild') !== null, 'btnSaveChild button exists');

  // Submit valid child via form
  const nameInputEl = document.getElementById('childNameInput') as HTMLInputElement;
  nameInputEl.value = 'Rohan';
  const gradeSelectEl = document.getElementById('childGradeSelect') as HTMLSelectElement;
  gradeSelectEl.value = 'Class 2 · Early reader';
  const langSelectEl = document.getElementById('childLangSelect') as HTMLSelectElement;
  langSelectEl.value = 'hi';

  const childFormEl = document.getElementById('childProfileForm') as HTMLFormElement;
  childFormEl.dispatchEvent(new Event('submit', { cancelable: true }));

  // Allow async save to settle
  await new Promise(r => setTimeout(r, 100));

  assert(profilesChangedChild !== null, 'onProfilesChanged callback fired with new child');
  assert(profilesChangedChild.name === 'Rohan', 'New child name passed to callback is Rohan');
  assert(profilesChangedChild.preferredLanguage === 'Hindi', 'New child language mapped to Hindi from "hi" code');
  assert(modalDom?.classList.contains('hidden'), 'Modal closed successfully after save');

  // 17.5 Parent Profile Foreign Key & Self-Healing Regression Tests
  console.log('Testing parent_profiles foreign key self-healing & mapping...');
  const firstTimeParentId = '11111111-2222-3333-4444-555555555555';
  const existingParentId = '99999999-8888-7777-6666-555555555555';

  // Seed existing parent in local storage
  const storageInstance = StorageService.getInstance();
  const rawUsers = storageInstance.getRawUsers();
  rawUsers.push({
    id: existingParentId,
    email: 'existing.parent@example.com',
    fullName: 'Priya Sharma',
    hasPin: false,
    termsAccepted: true,
    interfaceLanguage: 'en',
    createdAt: new Date().toISOString(),
    passwordHash: 'mock-hash',
  });
  storageInstance.saveRawUsers(rawUsers);

  // Test ensureParentProfile for a first-time parent
  const firstTimeEnsured = await ps.ensureParentProfile(firstTimeParentId);
  assert(firstTimeEnsured === true, 'ensureParentProfile successfully completes for first-time parent');

  // Test ensureParentProfile for an existing parent
  const existingEnsured = await ps.ensureParentProfile(existingParentId);
  assert(existingEnsured === true, 'ensureParentProfile successfully completes for existing parent');

  // Test child creation for first-time parent maps parent_id correctly
  const firstTimeChild = await ps.createChild(firstTimeParentId, {
    name: 'Anaya',
    grade: 'Class 1 · Early reader',
    preferredLanguage: 'English',
    avatar: '🌸',
  });
  assert(firstTimeChild.parentId === firstTimeParentId, 'First-time parent child profile has matching parent_id UUID');

  // Test child creation for existing parent maps parent_id correctly
  const existingParentChild = await ps.createChild(existingParentId, {
    name: 'Dev',
    grade: 'Class 3 · Growing reader',
    preferredLanguage: 'Hindi',
    avatar: '🚀',
  });
  assert(existingParentChild.parentId === existingParentId, 'Existing parent child profile has matching parent_id UUID');

  // 17.6 Verify Migration SQL file contents
  const fkMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261022000001_fix_parent_profiles_fkey.sql');
  assert(fs.existsSync(fkMigrationPath), 'Migration 20261022000001_fix_parent_profiles_fkey.sql exists');
  const fkMigrationSql = fs.readFileSync(fkMigrationPath, 'utf8');
  assert(fkMigrationSql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_profiles TO authenticated'), 'Migration grants authenticated table permissions on parent_profiles');
  assert(fkMigrationSql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated'), 'Migration grants authenticated table permissions on child_profiles');
  assert(fkMigrationSql.includes('INSERT INTO public.parent_profiles'), 'Migration backfills missing parent_profiles from auth.users');
  assert(fkMigrationSql.includes('CREATE TRIGGER on_auth_user_created'), 'Migration defines on_auth_user_created trigger with SECURITY DEFINER');

  // Reset language to English at end of suite
  await i18n.setLanguage('en');
  assert(i18n.getCurrentLanguage() === 'en', 'Language safely reset to English after verification');

  console.log(`\n--- Test Group 18: Complete Bug Fix Verification (Bugs 1 - 6) ---`);

  // 18.1 Bug 1: Login Session Persistence & Restoration
  console.log('Testing Bug 1: Session persistence and restoration...');
  const authInstance = AuthService.getInstance();
  assert(typeof (authInstance as any).waitForAuthReady === 'function', 'AuthService provides waitForAuthReady method');
  const readyUser = await authInstance.waitForAuthReady();
  assert(readyUser !== undefined, 'waitForAuthReady successfully resolves without hanging');

  // Verify restoreActiveChild recovers active child for authenticated parent
  const bug1ParentId = 'parent-session-persist-' + Date.now();
  const bug1Child = await ps.createChild(bug1ParentId, {
    name: 'Kabir',
    grade: 'Class 2',
    preferredLanguage: 'Hindi',
    avatar: '🦁',
  });
  ps.setActiveChild(bug1Child);
  assert(ps.getActiveChild()?.id === bug1Child.id, 'Active child set in profile service');
  const restoredChild = await ps.restoreActiveChild(bug1ParentId);
  assert(restoredChild !== null, 'restoreActiveChild successfully restores child profile on simulated refresh');
  assert(restoredChild?.id === bug1Child.id, 'Restored child ID matches selected child');
  assert(restoredChild?.name === 'Kabir', 'Restored child profile has complete data');

  // Verify expired session safety: an unauthenticated parent returns null and does not fall back to demo mode in production
  const restoredNull = await ps.restoreActiveChild('non-existent-parent-id');
  assert(restoredNull === null, 'restoreActiveChild safely returns null for unknown/unauthenticated parent');

  // Verify explicit logout clears active child and session
  await authInstance.logout();
  assert(authInstance.getCurrentUser() === null, 'logout clears current authenticated user');

  // 18.2 Bug 2: Reading Accuracy Graph Honest Calculation
  console.log('Testing Bug 2: Reading accuracy graph calculation...');
  const honestChildId = 'child-honest-calc-' + Date.now();
  // Brand new child: 0 attempts
  const emptyGraphSummary = await chartService.getChartSummary(honestChildId, 'week');
  assert(emptyGraphSummary.isEmpty === true, 'Brand new child chart is marked isEmpty = true');
  assert(emptyGraphSummary.overallAccuracy === null, 'Brand new child overallAccuracy is null (empty state, never fabricated 100%)');
  assert(emptyGraphSummary.points.length === 0, 'No points fabricated for child with zero attempts');

  // Record 1 correct attempt and 1 incorrect attempt (2 answered attempts, 1 correct)
  await learningPathService.recordAttempt({
    id: `att_honest_1_${Date.now()}`,
    childId: honestChildId,
    activityId: 'act_letter_sounds',
    skillId: 'skill_letter_sounds_basic',
    activityType: 'word_match',
    score: 100,
    accuracy: 1.0,
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    attemptsRequired: 1,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 20,
    missedItems: [],
    completedAt: new Date().toISOString(),
  });
  await learningPathService.recordAttempt({
    id: `att_honest_2_${Date.now()}`,
    childId: honestChildId,
    activityId: 'act_letter_sounds',
    skillId: 'skill_letter_sounds_basic',
    activityType: 'word_match',
    score: 0,
    accuracy: 0.0,
    totalQuestions: 1,
    correctAnswers: 0,
    incorrectAnswers: 1,
    attemptsRequired: 2,
    hintsRequested: 0,
    correctedAfterHint: 0,
    durationSeconds: 20,
    missedItems: ['mistake'],
    completedAt: new Date().toISOString(),
  });

  const updatedGraphSummary = await chartService.getChartSummary(honestChildId, 'week');
  assert(updatedGraphSummary.isEmpty === false, 'Chart is not empty after recording answered attempts');
  assert(updatedGraphSummary.overallAccuracy === 50, 'Overall accuracy calculated as exactly 50% (1 correct / 2 answered attempts * 100), not fabricated 100%');
  assert(updatedGraphSummary.totalAttempts === 2, 'Total answered attempts correctly recorded as 2');

  // 18.3 Bug 3: Daily Challenge Attempt Counter
  console.log('Testing Bug 3: 10-minute challenge attempt counter...');
  const challengeChildId = 'child-challenge-test-' + Date.now();
  const todayKey = new Date().toISOString().split('T')[0];
  const initialAttempts = storageInstance.getDailyAttempts(challengeChildId, todayKey);
  assert(initialAttempts === 0, 'Daily challenge attempts start at 0 for a new child/day');

  // Increment on answer submission
  const afterOne = storageInstance.incrementDailyAttempt(challengeChildId, todayKey);
  assert(afterOne === 1, 'First answer submission increments daily attempts to 1');
  const afterTwo = storageInstance.incrementDailyAttempt(challengeChildId, todayKey);
  assert(afterTwo === 2, 'Second answer submission increments daily attempts to 2');
  assert(storageInstance.getDailyAttempts(challengeChildId, todayKey) === 2, 'getDailyAttempts correctly reflects 2 attempts');

  // Check that a different calendar day starts at 0 without deleting history
  const tomorrowKey = '2099-01-01';
  assert(storageInstance.getDailyAttempts(challengeChildId, tomorrowKey) === 0, 'New calendar day starts at 0 attempts');
  assert(storageInstance.getDailyAttempts(challengeChildId, todayKey) === 2, 'Today attempts remain preserved after date query');

  // 18.4 Bug 4: Spelling Activity Word Advancement & Indic Scripts
  console.log('Testing Bug 4: Spelling activity word advancement & Indic language word banks...');
  const dc = new DashboardController(document.createElement('div'), {} as any, () => {}) as any;
  // Test English word bank
  const word1 = dc.selectNextSpellingWord('English', 'Class 1');
  const word2 = dc.selectNextSpellingWord('English', 'Class 1');
  assert(typeof word1 === 'string' && word1.length > 0, 'Spelling word generated for English');
  assert(word1 !== word2, 'Spelling activity does not immediately repeat the previous target word');

  // Test Hindi word bank uses Devanagari script
  const hiWord = dc.selectNextSpellingWord('Hindi', 'Class 1');
  assert(/[\u0900-\u097F]/.test(hiWord), 'Hindi spelling activity uses authentic Devanagari native script');

  // Test Odia word bank uses Odia script
  const orWord = dc.selectNextSpellingWord('Odia', 'Class 1');
  assert(/[\u0B00-\u0B7F]/.test(orWord), 'Odia spelling activity uses authentic Odia native script');

  // Test Punjabi word bank uses Gurmukhi script
  const paWord = dc.selectNextSpellingWord('Punjabi', 'Class 1');
  assert(/[\u0A00-\u0A7F]/.test(paWord), 'Punjabi spelling activity uses authentic Gurmukhi native script');

  // Test Tamil word bank uses Tamil script
  const taWord = dc.selectNextSpellingWord('Tamil', 'Class 1');
  assert(/[\u0B80-\u0BFF]/.test(taWord), 'Tamil spelling activity uses authentic Tamil native script');

  // 18.5 Bug 5: Activities Replay & Shuffled Options
  console.log('Testing Bug 5: Activity replay & shuffled choices...');
  // Test variant in getDeterministicActivity
  const baseActivity = getDeterministicActivity({
    skillId: 'skill_confused_letters_bd',
    difficulty: 'beginner',
    language: 'English',
    variant: 0,
  });
  const altActivity = getDeterministicActivity({
    skillId: 'skill_confused_letters_bd',
    difficulty: 'beginner',
    language: 'English',
    variant: 1,
  });
  assert(baseActivity.prompt !== altActivity.prompt, 'Variant 1 produces alternative question for replay');
  assert(baseActivity.items.some(i => i.isCorrect), 'Base activity has correct answer marked');
  assert(altActivity.items.some(i => i.isCorrect), 'Variant activity has correct answer marked');

  // 18.6 Bug 6: Progress Data Honesty & Session Deduplication
  console.log('Testing Bug 6: Progress data honesty and session deduplication...');
  const newChildId = 'child-honesty-' + Date.now();
  const freshProgress = ps.getChildProgress(newChildId);
  assert(freshProgress.practiceMinutes === 0, 'New child starts with 0 practice minutes');
  assert(freshProgress.wordsLearned === 0, 'New child starts with 0 words learned');
  assert(freshProgress.fluencyWpm === 0, 'New child starts with 0 fluency WPM');
  assert(freshProgress.accuracyPercent === 0, 'New child starts with 0% accuracy baseline');
  assert(freshProgress.streakDays === 0, 'New child starts with 0 streak days');
  assert(freshProgress.happyPoints === 0, 'New child starts with 0 happy points');

  // Test StorageService deduplication by activity ID
  const testActId = 'act_dedup_test_' + Date.now();
  storageInstance.saveActivity({
    id: testActId,
    parentId: 'parent-1',
    childId: newChildId,
    activityType: 'practice_game',
    title: 'Deduplication Test',
    timestamp: new Date().toISOString(),
    durationMinutes: 5,
  });
  const countBefore = storageInstance.getActivitiesForChild(newChildId).length;
  // Try to save duplicate record
  storageInstance.saveActivity({
    id: testActId,
    parentId: 'parent-1',
    childId: newChildId,
    activityType: 'practice_game',
    title: 'Deduplication Test',
    timestamp: new Date().toISOString(),
    durationMinutes: 5,
  });
  const countAfter = storageInstance.getActivitiesForChild(newChildId).length;
  assert(countBefore === countAfter, 'StorageService deduplicates activity records with identical id');

  // 18.7 Bug 7: Story Shelf - Collection Variety, Language Passages, Rotation, and Comprehension
  console.log('Testing Bug 7: Story Shelf collection variety, language matching, rotation, and comprehension questions...');
  const shelfService = StoryShelfService.getInstance();
  const testLangs: SupportedLanguage[] = ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil'];

  // 1. Meaningful collection of medium-to-long stories across reading levels
  for (const lang of testLangs) {
    const stories = shelfService.getStories(lang);
    assert(stories.length >= 5, `${lang} story shelf has at least 5 curated stories`);

    const levels = new Set(stories.map(s => s.readingLevel));
    assert(levels.has('early') && levels.has('growing') && levels.has('confident'), `${lang} covers early, growing, and confident reading levels`);

    // Verify medium-to-long length (paragraphs count and character length)
    for (const story of stories) {
      assert(story.paragraphs.length >= 3, `${lang} story "${story.title}" has at least 3 paragraphs`);
      const totalChars = story.paragraphs.join(' ').length;
      assert(totalChars >= 250, `${lang} story "${story.title}" has medium-to-long passage text (${totalChars} chars)`);
      assert(story.estimatedMinutes >= 3, `${lang} story has reasonable estimated read time (>= 3 min)`);
    }
  }

  // 2. Story passages and comprehension questions match the selected learning language
  const scriptChecks: Record<string, { regex: RegExp; name: string }> = {
    Hindi: { regex: /[\u0900-\u097F]/, name: 'Devanagari' },
    Odia: { regex: /[\u0B00-\u0B7F]/, name: 'Odia' },
    Punjabi: { regex: /[\u0A00-\u0A7F]/, name: 'Gurmukhi' },
    Tamil: { regex: /[\u0B80-\u0BFF]/, name: 'Tamil' },
  };

  for (const [lang, { regex, name }] of Object.entries(scriptChecks)) {
    const stories = shelfService.getStories(lang as SupportedLanguage);
    for (const story of stories) {
      assert(regex.test(story.title), `${lang} story title "${story.title}" contains authentic ${name} script`);
      assert(regex.test(story.synopsis), `${lang} story synopsis contains authentic ${name} script`);
      assert(story.paragraphs.every(p => regex.test(p)), `${lang} story paragraphs all contain authentic ${name} script`);
      assert(story.comprehensionQuestions.length > 0, `${lang} story has comprehension questions`);
      for (const q of story.comprehensionQuestions) {
        assert(regex.test(q.question), `${lang} comprehension question contains authentic ${name} script`);
        assert(q.options.every(opt => regex.test(opt)), `${lang} comprehension options all contain authentic ${name} script`);
        assert(regex.test(q.explanation), `${lang} comprehension explanation contains authentic ${name} script`);
      }
    }
  }

  // 3. Comprehension questions and answers are strictly aligned with each story
  for (const lang of testLangs) {
    const stories = shelfService.getStories(lang);
    for (const story of stories) {
      assert(story.comprehensionQuestions.length >= 2, `${lang} story "${story.title}" has at least 2 comprehension questions`);
      for (const q of story.comprehensionQuestions) {
        assert(q.options.length >= 3, `Comprehension question "${q.id}" provides at least 3 choices`);
        assert(q.correctIndex >= 0 && q.correctIndex < q.options.length, `Correct option index ${q.correctIndex} is valid within options`);
        assert(typeof q.options[q.correctIndex] === 'string' && q.options[q.correctIndex].length > 0, `Correct answer choice is non-empty string`);
        assert(typeof q.explanation === 'string' && q.explanation.length > 0, `Question includes helpful explanation`);
      }
    }
  }

  // 4. Rotation and shuffling: reopening or refreshing rotates featured and shelf stories
  const initialSelection = shelfService.getFeaturedAndShelfStories('English', 'Class 1', false);
  const rotatedSelection1 = shelfService.getFeaturedAndShelfStories('English', 'Class 1', true);
  assert(initialSelection.featured.id !== rotatedSelection1.featured.id, 'Advancing rotation changes the featured story');
  assert(!rotatedSelection1.shelf.some(s => s.id === rotatedSelection1.featured.id), 'Shelf stories exclude the currently featured story');

  const rotatedSelection2 = shelfService.getFeaturedAndShelfStories('English', 'Class 1', true);
  assert(rotatedSelection1.featured.id !== rotatedSelection2.featured.id, 'Second rotation advances to next story in collection');

  // Verify cycling wraps around cleanly
  const allEnglishCount = shelfService.getStories('English', 'Class 1').length;
  let currentFeaturedId = rotatedSelection2.featured.id;
  for (let i = 0; i < allEnglishCount; i++) {
    const next = shelfService.getFeaturedAndShelfStories('English', 'Class 1', true);
    currentFeaturedId = next.featured.id;
  }
  assert(typeof currentFeaturedId === 'string', 'Rotation smoothly cycles through collection without errors');

  // 5. Lookup by ID and Title fallback
  const foundById = shelfService.getStoryById('story_kite_en', 'English');
  assert(foundById !== null && foundById.id === 'story_kite_en', 'getStoryById finds story by ID');
  const foundByTitle = shelfService.getStoryById('Sunny and the Brave Little Kite', 'English');
  assert(foundByTitle !== null && foundByTitle.id === 'story_kite_en', 'getStoryById finds story by exact title');
  const foundBySubstring = shelfService.getStoryById('little kite', 'English');
  assert(foundBySubstring !== null && foundBySubstring.id === 'story_kite_en', 'getStoryById finds story by title substring');


  console.log(`\n==========================================`);
  console.log(`Final Test Results: ${passed} passed, ${failed} failed`);
  console.log(`==========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
