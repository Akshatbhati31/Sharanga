import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Running E2E Playwright Multilingual Switcher Verification across all 6 languages...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  try {
    // 1. Open Landing Page
    await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle' });
    console.log('✓ Landing page loaded');

    // Verify initial English landing page content
    const heroTitle = await page.locator('.hero-title').innerText();
    console.log('Initial English title:', heroTitle);
    if (!heroTitle.includes('Empowering every child')) {
      throw new Error(`Expected English hero title, got: ${heroTitle}`);
    }

    // 2. Switch landing page language to Hindi
    console.log('\n--- Switching to Hindi (hi) on Landing Page ---');
    const langTrigger = page.locator('#customLangDropdown .custom-lang-trigger').first();
    await langTrigger.click();
    await page.waitForTimeout(300);

    const hindiOpt = page.locator('#customLangDropdown button[data-lang="hi"]').first();
    await hindiOpt.click();
    await page.waitForTimeout(600);

    const hiHeroTitle = await page.locator('.hero-title').innerText();
    console.log('Hindi title in DOM:', hiHeroTitle);
    // Hindi translation check: contains Devanagari
    if (!/[\u0900-\u097F]/.test(hiHeroTitle)) {
      throw new Error(`Expected Devanagari script in Hindi hero title, got: ${hiHeroTitle}`);
    }
    console.log('✓ Successfully rendered Hindi in landing page');

    // 3. Switch to Punjabi
    console.log('\n--- Switching to Punjabi (pa) on Landing Page ---');
    await page.locator('#customLangDropdown .custom-lang-trigger').first().click();
    await page.waitForTimeout(300);
    await page.locator('#customLangDropdown button[data-lang="pa"]').first().click();
    await page.waitForTimeout(600);

    const paHeroTitle = await page.locator('.hero-title').innerText();
    console.log('Punjabi title in DOM:', paHeroTitle);
    if (!/[\u0A00-\u0A7F]/.test(paHeroTitle)) {
      throw new Error(`Expected Gurmukhi script in Punjabi hero title, got: ${paHeroTitle}`);
    }
    console.log('✓ Successfully rendered Punjabi in landing page');

    // 4. Switch to Bengali
    console.log('\n--- Switching to Bengali (bn) on Landing Page ---');
    await page.locator('#customLangDropdown .custom-lang-trigger').first().click();
    await page.waitForTimeout(300);
    await page.locator('#customLangDropdown button[data-lang="bn"]').first().click();
    await page.waitForTimeout(600);

    const bnHillTitle = await page.locator('.hero-title').innerText();
    console.log('Bengali title in DOM:', bnHillTitle);
    if (!/[\u0980-\u09FF]/.test(bnHillTitle)) {
      throw new Error(`Expected Bengali script in Bengali hero title, got: ${bnHillTitle}`);
    }
    console.log('✓ Successfully rendered Bengali in landing page');

    // 5. Switch to Tamil
    console.log('\n--- Switching to Tamil (ta) on Landing Page ---');
    await page.locator('#customLangDropdown .custom-lang-trigger').first().click();
    await page.waitForTimeout(300);
    await page.locator('#customLangDropdown button[data-lang="ta"]').first().click();
    await page.waitForTimeout(600);

    const taHeroTitle = await page.locator('.hero-title').innerText();
    console.log('Tamil title in DOM:', taHeroTitle);
    if (!/[\u0B80-\u0BFF]/.test(taHeroTitle)) {
      throw new Error(`Expected Tamil script in Tamil hero title, got: ${taHeroTitle}`);
    }
    console.log('✓ Successfully rendered Tamil in landing page');

    // 6. Switch to Odia
    console.log('\n--- Switching to Odia (or) on Landing Page ---');
    await page.locator('#customLangDropdown .custom-lang-trigger').first().click();
    await page.waitForTimeout(300);
    await page.locator('#customLangDropdown button[data-lang="or"]').first().click();
    await page.waitForTimeout(600);

    const orHeroTitle = await page.locator('.hero-title').innerText();
    console.log('Odia title in DOM:', orHeroTitle);
    if (!/[\u0B00-\u0B7F]/.test(orHeroTitle)) {
      throw new Error(`Expected Odia script in Odia hero title, got: ${orHeroTitle}`);
    }
    console.log('✓ Successfully rendered Odia in landing page');

    // 7. Launch Demo into Child Dashboard
    console.log('\n--- Launching Demo and testing Child Dashboard Language Dynamics ---');
    // Switch back to English first
    await page.locator('#customLangDropdown .custom-lang-trigger').first().click();
    await page.waitForTimeout(300);
    await page.locator('#customLangDropdown button[data-lang="en"]').first().click();
    await page.waitForTimeout(600);

    const demoBtn = page.locator('button[data-action="launch-demo"]').first();
    await demoBtn.click();
    await page.waitForTimeout(1000);

    console.log('Current URL:', page.url());
    if (!page.url().includes('#/home')) {
      throw new Error(`Expected #/home, got ${page.url()}`);
    }

    // Verify Child Dashboard loads in child learning language
    const childGreeting = await page.locator('.welcome-copy h2').innerText();
    console.log('Child Greeting:', childGreeting);
    if (!childGreeting.includes('Aanya')) {
      throw new Error(`Expected Aanya in greeting, got: ${childGreeting}`);
    }

    // Test Language switch on Child Dashboard topbar
    console.log('\nTesting topbar language switch to Hindi inside Child Dashboard...');
    const topbarLangTrigger = page.locator('.topbar .custom-lang-trigger').first();
    await topbarLangTrigger.click();
    await page.waitForTimeout(300);

    const topbarHindiOpt = page.locator('.topbar button[data-lang="hi"]').first();
    await topbarHindiOpt.click();
    await page.waitForTimeout(800);

    const hiChildGreeting = await page.locator('.welcome-copy h2').innerText();
    console.log('Hindi Child Greeting:', hiChildGreeting);
    if (!/[\u0900-\u097F]/.test(hiChildGreeting)) {
      throw new Error(`Expected Devanagari in child greeting, got: ${hiChildGreeting}`);
    }
    console.log('✓ Successfully rendered Hindi inside child dashboard');

    // 8. Test Navigation to My Progress (#/progress) in Hindi
    console.log('\nTesting My Progress in Hindi...');
    await page.locator('a[data-action="navigate"][data-page="progress"]').first().click();
    await page.waitForTimeout(800);

    const trophyTitle = await page.locator('.realm-title').innerText();
    console.log('Trophy realm title in Hindi:', trophyTitle);
    if (!/[\u0900-\u097F]/.test(trophyTitle)) {
      throw new Error(`Expected Devanagari in trophy realm title, got: ${trophyTitle}`);
    }
    console.log('✓ Successfully rendered My Progress in Hindi');

    console.log('\n🎉 ALL MULTILINGUAL E2E BROWSER CHECKS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Multilingual E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
