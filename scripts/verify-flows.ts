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
import workerHandler from '../src/worker/index';
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



// Polyfill localStorage & Web Crypto for Node test environment
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
  // Test Group 7: TinyFish Educational Resource Finder & Cloudflare Worker
  // =========================================================================
  console.log('\n--- Test Group 7: TinyFish Educational Resource Finder & Worker ---');

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

  // 7. Cloudflare Worker Router Tests
  // A. OPTIONS /api/tinyfish/status (CORS preflight)
  const corsReq = new Request('http://localhost/api/tinyfish/status', { method: 'OPTIONS' });
  const corsRes = await workerHandler.fetch(corsReq, {});
  assert(corsRes.status === 204, 'OPTIONS preflight returns 204');
  assert(corsRes.headers.get('Access-Control-Allow-Origin') === '*', 'CORS origin header present');

  // B. GET /api/tinyfish/status
  const statusReq = new Request('http://localhost/api/tinyfish/status', { method: 'GET' });
  const statusRes = await workerHandler.fetch(statusReq, { TINYFISH_API_KEY: 'live-key' });
  const statusJson = (await statusRes.json()) as { configured: boolean; service: string };
  assert(statusJson.service === 'TinyFish', 'Status endpoint returns service: TinyFish');
  assert(statusJson.configured === true, 'Status endpoint reports configured: true when key present');

  // C. POST /api/tinyfish/search with invalid JSON
  const badJsonReq = new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  });
  const badJsonRes = await workerHandler.fetch(badJsonReq, {});
  assert(badJsonRes.status === 400, 'Bad JSON body returns 400');

  // D. POST /api/tinyfish/search with invalid params
  const badParamsReq = new Request('http://localhost/api/tinyfish/search', {
    method: 'POST',
    body: JSON.stringify({ topic: '' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const badParamsRes = await workerHandler.fetch(badParamsReq, {});
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

  // Scenario 12: Worker /api/ai/generate-activity endpoint
  const aiReq = new Request('http://localhost/api/ai/generate-activity', {
    method: 'POST',
    body: JSON.stringify({ skillId: 'skill_letter_sounds_basic', difficulty: 'beginner', language: 'English' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const aiRes = await workerHandler.fetch(aiReq, {});
  assert(aiRes.status === 200, 'Worker endpoint /api/ai/generate-activity returns 200');
  const aiJson = (await aiRes.json()) as { success: boolean; activity: any };
  assert(aiJson.success === true, 'Worker endpoint returns success: true');
  assert(aiJson.activity.items.length >= 2, 'Worker endpoint returns valid activity items');

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

  console.log(`\n==========================================`);
  console.log(`Final Test Results: ${passed} passed, ${failed} failed`);
  console.log(`==========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
