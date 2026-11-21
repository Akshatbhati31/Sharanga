import { chromium } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('audit-reports/screenshots');

async function captureParentTabs() {
  console.log('Capturing detailed Parent Portal tabs for Suresh & Siya...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Go to auth and sign in as Suresh Kumar
  await page.goto('http://localhost:5173/#/auth?mode=login', { waitUntil: 'networkidle' });
  await page.fill('#auth-form input[name="email"]', 'suresh_44@gmail.com');
  await page.fill('#auth-form input[name="password"]', 'Password123!');
  await page.click('#auth-form button[type="submit"]');
  await page.waitForTimeout(1200);

  // 2. Navigate to parent portal
  await page.goto('http://localhost:5173/#/parent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Check if PIN gate is active
  const pinInput = page.locator('input[type="password"], input[name="gatePin"]').first();
  if (await pinInput.count() > 0) {
    await pinInput.fill('1234');
    const unlockBtn = page.locator('button:has-text("Unlock")').first();
    if (await unlockBtn.count() > 0) {
      await unlockBtn.click();
      await page.waitForTimeout(1200);
    }
  }

  // 3. Tab 1: Family Overview & Children
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '21-parent-siya-overview.png'), fullPage: true });
  console.log('Captured Tab 1: Overview');

  // 4. Tab 2: Detailed Learning Records (15-day timeline & chart)
  const recordsTab = page.locator('button[data-action="parent-tab"][data-tab="child_records"]');
  if (await recordsTab.count() > 0) {
    await recordsTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '22-parent-siya-15day-timeline.png'), fullPage: true });
    console.log('Captured Tab 2: Detailed Records & 15-Day Progress');
  }

  // 5. Tab 3: Account & Security Settings
  const settingsTab = page.locator('button[data-action="parent-tab"][data-tab="settings"]');
  if (await settingsTab.count() > 0) {
    await settingsTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '23-parent-security-settings.png'), fullPage: true });
    console.log('Captured Tab 3: Security Settings');

    // Test Forgot Parent PIN button
    const forgotPinBtn = page.locator('button[data-action="forgot-parent-pin"]');
    if (await forgotPinBtn.count() > 0) {
      await forgotPinBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '24-forgot-pin-step1-modal.png') });
      console.log('Captured Forgot PIN Modal');

      // Enter child name: Siya
      const childNameInput = page.locator('#pin-recovery-modal input[name="childName"], input[placeholder*="child" i]').first();
      if (await childNameInput.count() > 0) {
        await childNameInput.fill('Siya');
        const nextBtn = page.locator('button:has-text("Verify"), button:has-text("Continue"), button[type="submit"]').first();
        if (await nextBtn.count() > 0) {
          await nextBtn.click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '25-forgot-pin-step2-modal.png') });
        }
      }

      // Close modal
      const closeBtn = page.locator('button.modal-close, button:has-text("Cancel")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
      }
    }
  }

  // 6. Tab 4: Adventure Settings
  const advSettingsTab = page.locator('button[data-action="parent-tab"][data-tab="adventure_settings"]');
  if (await advSettingsTab.count() > 0) {
    await advSettingsTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '26-parent-adventure-settings.png'), fullPage: true });
    console.log('Captured Tab 4: Adventure Settings');
  }

  await browser.close();
  console.log('✅ Captured all detailed parent portal tabs.');
}

captureParentTabs();
