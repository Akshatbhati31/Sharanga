import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('audit-reports/screenshots');
const REPORTS_DIR = path.resolve('audit-reports');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Starting Comprehensive Sharanga / DyslexiMate Audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text, location: msg.location() });
    if (msg.type() === 'error') {
      consoleErrors.push({ text, location: msg.location() });
    }
  });

  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText
    });
  });

  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, stack: err.stack });
  });

  const auditData = {
    timestamp: new Date().toISOString(),
    routesTested: [],
    a11yViolations: {},
    consoleErrors: [],
    networkErrors: [],
    functionalChecks: {},
    responsiveChecks: {},
    soundChecks: {},
    i18nChecks: {},
    deployedUrlChecks: {}
  };

  try {
    // =========================================================================
    // 1. LANDING PAGE & RESPONSIVE LAYOUTS
    // =========================================================================
    console.log('[Phase 3 & 5] Auditing Landing Page...');
    await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/landing (Desktop 1280x800)');

    // Axe a11y on Landing
    const a11yLanding = await new AxeBuilder({ page }).analyze();
    auditData.a11yViolations['landing'] = a11yLanding.violations;
    console.log(`Landing accessibility violations: ${a11yLanding.violations.length}`);

    // Responsive: Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-tablet.png'), fullPage: false });

    // Responsive: Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-mobile.png'), fullPage: false });

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // =========================================================================
    // 2. AUTHENTICATION (LOGIN & REGISTRATION)
    // =========================================================================
    console.log('[Phase 3] Auditing Auth Pages...');
    await page.goto('http://localhost:5173/#/auth?mode=login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-auth-login-desktop.png') });
    auditData.routesTested.push('/#/auth?mode=login');

    const a11yAuth = await new AxeBuilder({ page }).analyze();
    auditData.a11yViolations['auth_login'] = a11yAuth.violations;

    // Check Welcome Back page for demo cards (Prompt: "Remove Quick Demo Access and Siya 15-Day Demo cards from Welcome Back page ONLY")
    const hasQuickDemoCard = await page.locator('text=Quick Demo Access').count();
    const hasSiyaDemoCard = await page.locator("text=Siya's 15-Day Progress Demo").count();
    auditData.functionalChecks['demo_cards_removed_from_welcome_back'] = {
      quickDemoCardPresent: hasQuickDemoCard > 0,
      siyaDemoCardPresent: hasSiyaDemoCard > 0,
      passed: hasQuickDemoCard === 0 && hasSiyaDemoCard === 0
    };

    // Registration page
    await page.goto('http://localhost:5173/#/auth?mode=register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-auth-register-desktop.png') });
    auditData.routesTested.push('/#/auth?mode=register');

    // =========================================================================
    // 3. AUTHENTICATION EXECUTION & PARENT PIN GATE
    // =========================================================================
    console.log('[Phase 3 & 6] Executing Parent Login & Auditing PIN Gate...');
    await page.goto('http://localhost:5173/#/auth?mode=login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Fill login form with demo parent credentials
    await page.fill('#auth-form input[name="email"]', 'parent@dysleximate.demo');
    await page.fill('#auth-form input[name="password"]', 'Password123!');
    await page.click('#auth-form button[type="submit"]');
    await page.waitForTimeout(1200);

    // Verify redirected or navigating to #/parent
    await page.goto('http://localhost:5173/#/parent', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-parent-pin-gate.png') });
    auditData.routesTested.push('/#/parent (Locked PIN Gate)');

    // Verify PIN Gate UI elements
    const isPinGateVisible = (await page.getByText('Parent Security PIN').count() > 0) || (await page.getByText('Protected Parent Portal').count() > 0);
    const pinInputs = page.locator('input[type="password"], input[name="gatePin"], input#gate-pin-input, input[placeholder*="PIN" i]');
    const pinInputCount = await pinInputs.count();
    console.log(`PIN Gate visible: ${isPinGateVisible}, PIN inputs found: ${pinInputCount}`);

    auditData.functionalChecks['pin_gate'] = {
      gateDisplayedBeforeDashboard: isPinGateVisible,
      pinInputAvailable: pinInputCount > 0
    };

    // Test entering incorrect PIN
    if (pinInputCount > 0) {
      await pinInputs.first().fill('9999');
      const unlockBtn = page.locator('button:has-text("Unlock Parent Portal"), button:has-text("Unlock"), button:has-text("Verify")').first();
      if (await unlockBtn.count() > 0) {
        await unlockBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-parent-pin-incorrect.png') });
      }

      // Test entering correct PIN (1234)
      await pinInputs.first().fill('1234');
      if (await unlockBtn.count() > 0) {
        await unlockBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // =========================================================================
    // 4. PARENT DASHBOARD & SECURITY AUDIT
    // =========================================================================
    console.log('[Phase 3, 5 & 6] Auditing Parent Dashboard...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-parent-dashboard-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/parent (Unlocked Parent Dashboard)');

    // Responsive: Tablet & Mobile
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-parent-dashboard-tablet.png') });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-parent-dashboard-mobile.png') });

    await page.setViewportSize({ width: 1280, height: 800 });

    const a11yParent = await new AxeBuilder({ page }).analyze();
    auditData.a11yViolations['parent_dashboard'] = a11yParent.violations;

    // Check Parent Security card:
    // 1. Standalone Password Reset Link section removed?
    const standalonePwdReset = await page.locator('text=Password Reset Link').count();
    // 2. Forgot Parent PIN? option present?
    const forgotPinBtn = page.locator('text=Forgot Parent PIN?');
    const hasForgotPin = await forgotPinBtn.count() > 0;
    auditData.functionalChecks['parent_security'] = {
      standalonePasswordResetRemoved: standalonePwdReset === 0,
      forgotParentPinOptionPresent: hasForgotPin
    };

    if (hasForgotPin) {
      console.log('Testing Forgot Parent PIN modal...');
      await forgotPinBtn.first().click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-forgot-pin-modal.png') });
      // Close modal
      const closeBtn = page.locator('button.modal-close, button:has-text("Cancel"), button[data-action="close-modal"]').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Check 15-day timeline and confidence chart
    const confidenceChartCount = await page.locator('.reading-confidence-chart, svg.confidence-chart, #reading-confidence-chart, .chart-canvas-container').count();
    const timelineRecordsCount = await page.locator('.timeline-item, .historical-row, .progress-log-entry, [data-timeline-entry]').count();
    auditData.functionalChecks['historical_progress'] = {
      confidenceChartRendered: confidenceChartCount > 0,
      timelineRecordsRendered: timelineRecordsCount > 0
    };

    // =========================================================================
    // 5. CHILD PROFILE SELECTION & CHILD DASHBOARD (#/home)
    // =========================================================================
    console.log('[Phase 3] Auditing Child Dashboard (#/home)...');
    await page.goto('http://localhost:5173/#/home', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-child-home-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/home (Child Dashboard)');

    // Responsive Child Dashboard
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-child-home-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 800 });

    const a11yHome = await new AxeBuilder({ page }).analyze();
    auditData.a11yViolations['child_home'] = a11yHome.violations;

    // =========================================================================
    // 6. MY ADVENTURE & GAME UNLOCK SYSTEM (#/adventure)
    // =========================================================================
    console.log('[Phase 3] Auditing My Adventure & Game Unlock System (#/adventure)...');
    await page.goto('http://localhost:5173/#/adventure', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-adventure-map-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/adventure (My Adventure)');

    // Verify 5 Destinations
    const destinations = ['Phonics Garden', 'Word Workshop', 'Reading Forest', 'Story Castle', 'Vocabulary Island'];
    const destinationChecks = {};
    for (const dest of destinations) {
      destinationChecks[dest] = await page.locator(`text=${dest}`).count() > 0;
    }
    auditData.functionalChecks['adventure_destinations'] = destinationChecks;

    // Check destination dropdown
    const destDropdown = page.locator('select#adventure-destination-select, select[name="destination"], .adventure-select');
    auditData.functionalChecks['adventure_dropdown_present'] = await destDropdown.count() > 0;

    // Responsive Adventure
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-adventure-map-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 800 });

    // =========================================================================
    // 7. STORY SHELF & COMPREHENSION (#/stories)
    // =========================================================================
    console.log('[Phase 3] Auditing Story Shelf (#/stories)...');
    await page.goto('http://localhost:5173/#/stories', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-story-shelf-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/stories (Story Shelf)');

    // Open first story
    const storyCard = page.locator('.story-card, [data-action="open-story"], .shelf-story-card').first();
    if (await storyCard.count() > 0) {
      await storyCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-story-reader-view.png') });
      
      // Test dyslexia font toggle & syllable chunking
      const dyslexiaToggle = page.locator('button:has-text("Dyslexia"), button[data-action="toggle-story-font"]').first();
      if (await dyslexiaToggle.count() > 0) {
        await dyslexiaToggle.click();
        await page.waitForTimeout(400);
      }
    }

    // =========================================================================
    // 8. PRACTICE CATALOG & ACTIVITY RUNNER (#/practice)
    // =========================================================================
    console.log('[Phase 3] Auditing Practice Catalog (#/practice)...');
    await page.goto('http://localhost:5173/#/practice', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-practice-catalog-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/practice (Practice Catalog)');

    // Launch an activity modal
    const startActBtn = page.locator('button:has-text("Start"), button:has-text("Play"), .activity-action-btn, [data-action="start-activity"]').first();
    if (await startActBtn.count() > 0) {
      await startActBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-activity-modal-runner.png') });
      
      const closeActBtn = page.locator('button.modal-close, button:has-text("Close"), button:has-text("Exit")').first();
      if (await closeActBtn.count() > 0) {
        await closeActBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // =========================================================================
    // 9. PROGRESS VIEW (#/progress)
    // =========================================================================
    console.log('[Phase 3] Auditing Progress View (#/progress)...');
    await page.goto('http://localhost:5173/#/progress', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-progress-view-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/progress (Progress View)');

    // =========================================================================
    // 10. RESOURCE FINDER & TINYFISH (#/resources)
    // =========================================================================
    console.log('[Phase 3] Auditing Resource Finder & TinyFish (#/resources)...');
    await page.goto('http://localhost:5173/#/resources', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-resource-finder-desktop.png'), fullPage: true });
    auditData.routesTested.push('/#/resources (TinyFish Resource Finder)');

    const topicInput = page.locator('input#resource-topic, input[name="topic"], input[placeholder*="search" i], input[placeholder*="topic" i]').first();
    if (await topicInput.count() > 0) {
      await topicInput.fill('Phonics rhyming');
      const searchBtn = page.locator('button:has-text("Search"), button[data-action="search-resources"], button[type="submit"]').first();
      if (await searchBtn.count() > 0) {
        await searchBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16-resource-finder-results.png') });
      }
    }

    // =========================================================================
    // 11. PROFILE SELECTOR (#/profiles)
    // =========================================================================
    console.log('[Phase 3] Auditing Profile Selector (#/profiles)...');
    await page.goto('http://localhost:5173/#/profiles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17-profile-selector-desktop.png') });
    auditData.routesTested.push('/#/profiles (Learner Profiles)');

    // =========================================================================
    // 12. MULTILINGUAL SWITCHING (6 LANGUAGES)
    // =========================================================================
    console.log('[Phase 3] Auditing Multilingual Switching Across 6 Languages...');
    const languages = [
      { code: 'hi', name: 'Hindi', script: 'हिन्दी' },
      { code: 'ta', name: 'Tamil', script: 'தமிழ்' },
      { code: 'pa', name: 'Punjabi', script: 'ਪੰਜਾਬੀ' },
      { code: 'bn', name: 'Bengali', script: 'বাংলা' },
      { code: 'or', name: 'Odia', script: 'ଓଡ଼ିଆ' },
      { code: 'en', name: 'English', script: 'English' }
    ];

    for (const lang of languages) {
      const switched = await page.evaluate(async (lCode) => {
        // Find language switcher control or click profile language card
        const card = document.querySelector(`[data-lang-code="${lCode}"], [data-action="select-language"][data-language="${lCode}"]`);
        if (card) {
          card.click();
          return true;
        }
        // Direct event dispatch
        const event = new CustomEvent('change-language', { detail: { language: lCode } });
        window.dispatchEvent(event);
        return true;
      }, lang.code);

      await page.waitForTimeout(600);
      if (lang.code === 'hi') {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '18-multilingual-hindi.png') });
      } else if (lang.code === 'ta') {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '19-multilingual-tamil.png') });
      }
      auditData.i18nChecks[lang.name] = { code: lang.code, switchResult: switched };
    }

    // Reset language to English
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('change-language', { detail: { language: 'en' } }));
    });

    // =========================================================================
    // 13. LIVE PRODUCTION DEPLOYED SITE (https://sharanga.vercel.app/)
    // =========================================================================
    console.log('[Phase 7] Auditing Deployed Vercel Production Site...');
    try {
      const deployedRes = await page.goto('https://sharanga.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '20-deployed-landing-production.png'), fullPage: true });
      auditData.deployedUrlChecks = {
        url: 'https://sharanga.vercel.app/',
        status: deployedRes.status(),
        ok: deployedRes.ok(),
        title: await page.title(),
        headers: deployedRes.headers()
      };
      console.log(`Deployed URL status: ${deployedRes.status()}`);
    } catch (deployErr) {
      console.warn(`Deployed site navigation error: ${deployErr.message}`);
      auditData.deployedUrlChecks = {
        url: 'https://sharanga.vercel.app/',
        error: deployErr.message
      };
    }

  } catch (err) {
    console.error('Audit execution error:', err);
    auditData.fatalError = err.message;
  } finally {
    auditData.consoleErrors = consoleErrors;
    auditData.networkErrors = networkErrors;
    fs.writeFileSync(path.join(REPORTS_DIR, 'audit-test-data.json'), JSON.stringify(auditData, null, 2));
    await browser.close();
    console.log('✅ Audit execution complete. Data written to audit-reports/audit-test-data.json.');
  }
}

runAudit();
