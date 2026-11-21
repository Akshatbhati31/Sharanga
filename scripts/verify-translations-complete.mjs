import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Helper to extract flattened dotted keys from an object
function getDottedKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getDottedKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

// Simple parser for typescript locale export files
function loadTsLocale(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  // Strip export statements to make it evaluatable
  const clean = raw
    .replace(/^import\s+type\s+.*$/gm, '')
    .replace(/^export\s+const\s+(\w+)\s*:\s*TranslationSchema\s*=/m, 'const $1 =')
    .replace(/^export\s+default\s+\w+;/gm, '');
  
  const varMatch = clean.match(/const\s+(\w+)\s*=/);
  const varName = varMatch ? varMatch[1] : 'en';
  const fn = new Function(`${clean}; return ${varName};`);
  return fn();
}

console.log('🧪 Starting DyslexiMate Multilingual Completeness & Parity Audit...\n');

const locales = ['en', 'hi', 'pa', 'bn', 'ta', 'or'];
const localeData = {};
const dottedKeyMap = {};

for (const lang of locales) {
  const filePath = path.resolve(`src/i18n/locales/${lang}.ts`);
  assert(fs.existsSync(filePath), `Locale file must exist: ${filePath}`);
  const data = loadTsLocale(filePath);
  localeData[lang] = data;
  dottedKeyMap[lang] = getDottedKeys(data);
  console.log(`✓ Loaded locale [${lang}]: ${dottedKeyMap[lang].length} keys`);
}

// 1. Assert exact key parity across all 6 locales
console.log('\n--- Section 1: Exact Key Parity & Completeness ---');
const enKeys = dottedKeyMap['en'];
const totalExpectedKeys = enKeys.length;
console.log(`Base reference language (English): ${totalExpectedKeys} total keys`);

for (const lang of locales) {
  const currentKeys = dottedKeyMap[lang];
  assert.strictEqual(
    currentKeys.length,
    totalExpectedKeys,
    `Locale [${lang}] key count (${currentKeys.length}) must equal English key count (${totalExpectedKeys})`
  );

  const missingFromCurrent = enKeys.filter(k => !currentKeys.includes(k));
  const extraInCurrent = currentKeys.filter(k => !enKeys.includes(k));

  assert.strictEqual(missingFromCurrent.length, 0, `Locale [${lang}] has missing keys: ${missingFromCurrent.join(', ')}`);
  assert.strictEqual(extraInCurrent.length, 0, `Locale [${lang}] has extra unexpected keys: ${extraInCurrent.join(', ')}`);

  console.log(`  ✓ PASS: Locale [${lang}] has 100% parity (${currentKeys.length}/${totalExpectedKeys} keys, 0 missing, 0 extra)`);
}

// 2. Non-empty string assertion
console.log('\n--- Section 2: Non-Empty Value Verification ---');
for (const lang of locales) {
  let emptyCount = 0;
  for (const k of dottedKeyMap[lang]) {
    const parts = k.split('.');
    let cur = localeData[lang];
    for (const p of parts) cur = cur?.[p];
    if (typeof cur !== 'string' || cur.trim() === '') {
      emptyCount++;
      console.error(`Empty string at ${lang}.${k}`);
    }
  }
  assert.strictEqual(emptyCount, 0, `Locale [${lang}] must have 0 empty translation strings`);
  console.log(`  ✓ PASS: Locale [${lang}] has 0 empty strings across all ${totalExpectedKeys} keys`);
}

// 3. Native Script Coverage
console.log('\n--- Section 3: Native Script Verification ---');
const scriptRegexes = {
  hi: /[\u0900-\u097F]/, // Devanagari
  pa: /[\u0A00-\u0A7F]/, // Gurmukhi
  bn: /[\u0980-\u09FF]/, // Bengali
  ta: /[\u0B80-\u0BFF]/, // Tamil
  or: /[\u0B00-\u0B7F]/, // Odia
};

for (const [lang, regex] of Object.entries(scriptRegexes)) {
  let nativeCount = 0;
  for (const k of dottedKeyMap[lang]) {
    const parts = k.split('.');
    let cur = localeData[lang];
    for (const p of parts) cur = cur?.[p];
    if (typeof cur === 'string' && regex.test(cur)) {
      nativeCount++;
    }
  }
  const percentage = Math.round((nativeCount / totalExpectedKeys) * 100);
  console.log(`  ✓ PASS: Locale [${lang}] native script density: ${nativeCount}/${totalExpectedKeys} (${percentage}%)`);
  assert(percentage >= 85, `Locale [${lang}] must have at least 85% native script keys (got ${percentage}%)`);
}

// 4. Parameter Interpolation Verification
console.log('\n--- Section 4: Parameter Interpolation Integrity ---');
function resolve(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(template, params) {
  if (!template) return '';
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}

for (const lang of locales) {
  const greeting = resolve(localeData[lang], 'home.heroGreeting');
  assert(greeting && greeting.includes('{name}'), `Locale [${lang}] home.heroGreeting must contain {name}`);
  const formatted = interpolate(greeting, { name: 'Aanya' });
  assert(formatted.includes('Aanya'), `Locale [${lang}] interpolated greeting must contain Aanya`);
  assert(!formatted.includes('{name}'), `Locale [${lang}] interpolated greeting must not retain unreplaced placeholder`);

  const streak = resolve(localeData[lang], 'progress.daysStreak');
  assert(streak && streak.includes('{days}'), `Locale [${lang}] progress.daysStreak must contain {days}`);
  const formattedStreak = interpolate(streak, { days: '5' });
  assert(formattedStreak.includes('5'), `Locale [${lang}] interpolated streak must contain 5`);
  assert(!formattedStreak.includes('{days}'), `Locale [${lang}] interpolated streak must not retain placeholder`);
}
console.log('  ✓ PASS: Parameter placeholders ({name}, {days}) correctly preserved and interpolated across all 6 languages');

// 5. Section Coverage Verification
console.log('\n--- Section 5: Key Area Coverage Verification ---');
const criticalSections = [
  'landing.navWhy', 'landing.heroTitle', 'landing.btnTryDemo',
  'auth.login.title', 'auth.register.title', 'auth.pin.enterPinLabel',
  'parent.hubTitle', 'parent.securityPinTitle', 'parent.dyslexicFontToggle',
  'home.heroGreeting', 'home.statHappyPoints', 'home.startChallengeBtn',
  'practice.heading', 'practice.pictureWordMatch', 'practice.playBtn',
  'stories.heading', 'stories.listenBtn', 'stories.finishReadingBtn',
  'progress.trophyRoomTitle', 'progress.superpowerTrophies', 'progress.recentActivity',
  'adventure.mapTitle', 'adventure.heroTitle', 'adventure.playActivity',
  'resources.title', 'resources.disclaimerNotice'
];

for (const key of criticalSections) {
  for (const lang of locales) {
    const val = resolve(localeData[lang], key);
    assert(val !== undefined && typeof val === 'string' && val.length > 0, `Missing critical key: ${lang}.${key}`);
  }
}
console.log(`  ✓ PASS: All ${criticalSections.length} critical application pathways covered across all 6 languages`);

console.log('\n==========================================');
console.log('🎉 ALL TRANSLATION AUDIT CHECKS PASSED (100% Coverage, 0 Missing Keys)!');
console.log('==========================================\n');
