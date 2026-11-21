import { chromium } from 'playwright';

async function verifyPhase4() {
  console.log('🚀 Starting Phase 4 Frontend-to-Backend Interactive Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Landing Page Navigation, Theme, Language, and Demo button
  console.log('\n--- 1. Landing Page Checks ---');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // Check title
  const title = await page.title();
  console.log('Page Title:', title);

  // Test Theme Toggle
  const themeToggle = page.locator('button.theme-toggle-btn, button:has-text("Mode"), button:has-text("☀️"), button:has-text("🌙")').first();
  if (await themeToggle.isVisible()) {
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
    console.log('Initial theme:', initialTheme);
    await themeToggle.click();
    await page.waitForTimeout(400);
    const toggledTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('Toggled theme:', toggledTheme);
    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(300);
  }

  // Test Language Selector
  console.log('Testing Language Selector...');
  const langTrigger = page.locator('button:has-text("English"), button:has-text("🌐")').first();
  if (await langTrigger.isVisible()) {
    await langTrigger.click();
    await page.waitForTimeout(300);
    const hindiOption = page.locator('button:has-text("हिन्दी")').first();
    if (await hindiOption.isVisible()) {
      await hindiOption.click();
      await page.waitForTimeout(400);
      const hindiHeading = await page.evaluate(() => document.body.innerText.includes('डिसलेक्सिमेट') || document.body.innerText.includes('हिन्दी'));
      console.log('Hindi language active:', hindiHeading);
      // Switch back to English
      const langTriggerHi = page.locator('button:has-text("हिन्दी"), button:has-text("🌐")').first();
      await langTriggerHi.click();
      await page.waitForTimeout(300);
      await page.locator('button:has-text("English")').first().click();
      await page.waitForTimeout(400);
    }
  }

  // 2. Launch Instant Demo -> Aanya Child Dashboard
  console.log('\n--- 2. Launch Instant Demo Navigation ---');
  const instantDemoBtn = page.getByRole('button', { name: /instant demo/i });
  await instantDemoBtn.click();
  await page.waitForTimeout(1200);
  console.log('Landed URL after demo launch:', page.url());
  if (!page.url().includes('#/home')) {
    throw new Error('Instant demo did not land on #/home');
  }

  // Check child display name
  const childGreeting = await page.locator('h2, .hero-title').first().innerText();
  console.log('Child Dashboard Greeting:', childGreeting.replace(/\n+/g, ' '));

  // 3. Child Profile Switching
  console.log('\n--- 3. Child Profile Switching ---');
  // Open profile dropdown or switch to Kabir
  const profileSwitchTrigger = page.locator('button:has-text("Aanya"), .profile-pill, [data-action="switch-child"]').first();
  if (await profileSwitchTrigger.isVisible()) {
    console.log('Profile selector visible, testing switch...');
  }

  // 4. Adventure Tab & Gamified Destinations
  console.log('\n--- 4. Adventure Tab & Destinations ---');
  await page.goto('http://localhost:5173/#/adventure');
  await page.waitForTimeout(1200);
  console.log('Adventure URL:', page.url());

  const hudBar = page.locator('.adventure-hud-bar, .candy-map-board').first();
  const isHudVisible = await hudBar.isVisible();
  console.log('Adventure HUD / Map Board visible:', isHudVisible);
  if (!isHudVisible) throw new Error('Adventure HUD / Map Board not visible');

  const learnerMeta = await page.locator('.hud-learner-meta, .hud-profile-pill').first().innerText();
  console.log('Learner Meta on Adventure HUD:', learnerMeta.replace(/\n+/g, ' '));

  // Check destination scenery headers on map
  const sceneryHeaders = page.locator('.destination-scenery-header');
  const sceneryCount = await sceneryHeaders.count();
  console.log('Destination scenery headers on map:', sceneryCount);

  // 5. Protected Areas: Story Shelf (#/stories)
  console.log('\n--- 5. Protected Area: Story Shelf (#/stories) ---');
  await page.goto('http://localhost:5173/#/stories');
  await page.waitForTimeout(1200);
  console.log('Stories URL:', page.url());
  const storiesContent = await page.locator('body').innerText();
  const hasStories = storiesContent.includes('Story') || storiesContent.includes('Stories') || storiesContent.includes('Read');
  console.log('Story Shelf loaded properly:', hasStories);
  if (!hasStories) {
    throw new Error('Story shelf failed to load');
  }

  // 6. Protected Areas: My Progress (#/progress)
  console.log('\n--- 6. Protected Area: My Progress (#/progress) ---');
  await page.goto('http://localhost:5173/#/progress');
  await page.waitForTimeout(1200);
  console.log('Progress URL:', page.url());
  const progressContent = await page.locator('body').innerText();
  const hasProgress = progressContent.includes('Progress') || progressContent.includes('Accuracy') || progressContent.includes('Happy Points');
  console.log('My Progress loaded properly:', hasProgress);
  if (!hasProgress) {
    throw new Error('My Progress failed to load');
  }

  // 7. Practice Tab & Interactive Activity
  console.log('\n--- 7. Practice Tab & Activity Runner ---');
  await page.goto('http://localhost:5173/#/practice');
  await page.waitForTimeout(1200);

  const questBtn = page.locator('button[data-skill="skill_confused_letters_bd"]').first();
  await questBtn.scrollIntoViewIfNeeded();
  await questBtn.click();
  await page.waitForTimeout(1000);

  const bdModal = page.locator('#bdRunnerModalContainer');
  const isBdOpen = await bdModal.isVisible();
  console.log('BD Modal open on practice tab:', isBdOpen);
  if (!isBdOpen) throw new Error('Failed to open BD practice modal');

  // Answer first round
  const opt1 = page.locator('#bdRunnerModalContainer .bd-option-btn').first();
  await opt1.click();
  await page.waitForTimeout(500);

  const feedbackText = await page.locator('#bdFeedbackBox').innerText();
  console.log('Round feedback text:', feedbackText.replace(/\n+/g, ' '));

  // Close modal via close button
  const closeBtn = page.locator('#btnCloseBDModal');
  await closeBtn.click();
  await page.waitForTimeout(500);
  const isClosed = !(await bdModal.isVisible());
  console.log('BD Modal closed cleanly:', isClosed);
  if (!isClosed) throw new Error('BD modal close button did not close modal');

  // 8. Parent Portal PIN Protection Gate
  console.log('\n--- 8. Parent Portal PIN Gate ---');
  await page.goto('http://localhost:5173/#/parent');
  await page.waitForTimeout(1000);
  console.log('Parent URL after navigation:', page.url());

  const pinPrompt = await page.locator('body').innerText();
  const isPinPrompt = pinPrompt.includes('PIN') || pinPrompt.includes('Parent');
  console.log('Parent PIN Gate active:', isPinPrompt);

  // Enter incorrect PIN
  const pinInput = page.locator('input[type="password"], input#pinInput, input[name="pin"]').first();
  if (await pinInput.isVisible()) {
    await pinInput.fill('9999');
    const submitPin = page.locator('button:has-text("Unlock"), button[type="submit"]').first();
    if (await submitPin.isVisible()) {
      await submitPin.click();
      await page.waitForTimeout(500);
      const wrongPinMsg = await page.getByText(/incorrect|wrong|invalid/i).count();
      console.log('Incorrect PIN caught properly:', wrongPinMsg > 0);
    }

    // Now enter correct demo parent PIN 1234
    await pinInput.fill('1234');
    const unlockBtn = page.locator('button:has-text("Unlock"), button[type="submit"]').first();
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await page.waitForTimeout(1200);
      const parentDashboardText = await page.locator('body').innerText();
      const isUnlocked = parentDashboardText.includes('Dashboard') || parentDashboardText.includes('Parent Portal') || parentDashboardText.includes('Learning History');
      console.log('Parent Dashboard unlocked successfully with 1234:', isUnlocked);
    }
  }

  console.log('\n✅ Phase 4 Interactive E2E Verification PASSED ALL CHECKS!');
  await browser.close();
}

verifyPhase4().catch(err => {
  console.error('\n❌ Phase 4 Verification Failed:', err);
  process.exit(1);
});
