import { AuthService } from '../src/services/authService';
import { ProfileService } from '../src/services/profileService';
import { StorageService } from '../src/services/storageService';
import { ActivityTrackerService } from '../src/services/activityTrackerService';

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
  // Test Group 7: Supabase Schema, RLS & Configuration Verification
  // =========================================================================
  console.log('\n--- Test Group 7: Supabase Schema, RLS & Configuration Verification ---');
  const { isSupabaseConfigured } = await import('../src/lib/supabase');
  assert(typeof isSupabaseConfigured() === 'boolean', 'isSupabaseConfigured() returns boolean safely');

  const fs = await import('node:fs');
  const path = await import('node:path');

  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261020000000_initial_schema.sql');
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');

  assert(fs.existsSync(migrationPath), 'SQL migration file exists in supabase/migrations/');
  assert(fs.existsSync(schemaPath), 'Direct dashboard SQL schema file exists in supabase/schema.sql');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // 1. Table structure validation
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.parent_profiles'), 'Defines parent_profiles table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.account_preferences'), 'Defines account_preferences table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.child_profiles'), 'Defines child_profiles table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.learning_progress'), 'Defines learning_progress table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_sessions'), 'Defines practice_sessions table');

  // 2. Foreign keys and parent ownership
  assert(migrationSql.includes('REFERENCES auth.users(id) ON DELETE CASCADE'), 'parent_profiles references auth.users(id) with CASCADE');
  assert(migrationSql.includes('REFERENCES public.parent_profiles(id) ON DELETE CASCADE'), 'child_profiles and preferences reference parent_profiles(id)');
  assert(migrationSql.includes('REFERENCES public.child_profiles(id) ON DELETE CASCADE'), 'learning_progress and sessions reference child_profiles(id)');

  // 3. Mandatory Row Level Security (RLS) on all tables
  assert(migrationSql.includes('ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on parent_profiles');
  assert(migrationSql.includes('ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on account_preferences');
  assert(migrationSql.includes('ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on child_profiles');
  assert(migrationSql.includes('ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on learning_progress');
  assert(migrationSql.includes('ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on practice_sessions');

  // 4. RLS ownership policies
  assert(migrationSql.includes('auth.uid() = id'), 'parent_profiles policy enforces auth.uid() = id');
  assert(migrationSql.includes('auth.uid() = parent_id'), 'child_profiles policy enforces auth.uid() = parent_id');
  assert(migrationSql.includes('EXISTS ('), 'learning_progress policy checks parent ownership of child profile');

  // 5. Automatic auth user profile creation hook
  assert(migrationSql.includes('FUNCTION public.handle_new_user()'), 'Automatic parent profile creation trigger defined');
  assert(migrationSql.includes('CREATE TRIGGER on_auth_user_created'), 'Auth hook on_auth_user_created attached to auth.users');

  // 6. Registration validation tests
  const invalidEmailReg = await auth.register({
    fullName: 'Test Parent',
    email: 'not-an-email',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    acceptTerms: true,
  });
  assert(invalidEmailReg.success === false, 'Invalid email registration is rejected');

  const shortPassReg = await auth.register({
    fullName: 'Test Parent',
    email: 'valid@example.com',
    password: '123',
    confirmPassword: '123',
    acceptTerms: true,
  });
  assert(shortPassReg.success === false, 'Short password (< 6 chars) is rejected');

  const mismatchedPassReg = await auth.register({
    fullName: 'Test Parent',
    email: 'valid@example.com',
    password: 'Password123!',
    confirmPassword: 'DifferentPassword!',
    acceptTerms: true,
  });
  assert(mismatchedPassReg.success === false, 'Password mismatch is rejected');

  const noTermsReg = await auth.register({
    fullName: 'Test Parent',
    email: 'valid@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    acceptTerms: false,
  });
  assert(noTermsReg.success === false, 'Missing terms acceptance is rejected');

  // 7. Login validation tests
  const badLogin = await auth.login({
    email: 'nonexistent-parent@dysleximate.demo',
    password: 'WrongPassword!',
  });
  assert(badLogin.success === false, 'Non-existent account login is rejected');

  console.log(`\n==========================================`);
  console.log(`Final Test Results: ${passed} passed, ${failed} failed`);
  console.log(`==========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
