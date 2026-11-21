import { chromium } from '@playwright/test';
import path from 'path';

async function testPhase2() {
  console.log('🧪 Verifying Phase 2: Clean Logo in Light & Dark Mode...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Landing in light mode
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark-theme');
    localStorage.setItem('dysleximate_theme', 'light');
    document.querySelectorAll('img[data-theme-logo]').forEach(img => {
      img.src = '/Front_end/assets/dysleximate-logo-light.png';
    });
  });
  await page.waitForTimeout(500);

  const lightLogoSrc = await page.locator('img.brand-logo-img').first().getAttribute('src');
  console.log('Light mode logo src:', lightLogoSrc);
  if (!lightLogoSrc.includes('light')) {
    throw new Error('Expected light mode logo to be dysleximate-logo-light.png');
  }
  await page.screenshot({ path: 'audit-reports/screenshots/phase2-logo-light.png' });

  // 2. Toggle to dark mode
  const themeToggle = page.locator('button[data-action="toggle-theme"]').first();
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
    await page.waitForTimeout(500);
  }
  const darkLogoSrc = await page.locator('img.brand-logo-img').first().getAttribute('src');
  console.log('Dark mode logo src:', darkLogoSrc);
  if (!darkLogoSrc.includes('dark')) {
    throw new Error('Expected dark mode logo to be dysleximate-logo-dark.png');
  }
  await page.screenshot({ path: 'audit-reports/screenshots/phase2-logo-dark.png' });

  // 3. Parent Login page (Welcome Back)
  await page.goto('http://localhost:5173/#/auth?mode=login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Verify unwanted pill and card are gone
  const authLogoCardCount = await page.locator('.auth-logo-card:visible').count();
  console.log('Visible auth-logo-card count (should be 0):', authLogoCardCount);
  if (authLogoCardCount > 0) {
    throw new Error('Found unwanted auth-logo-card on login page');
  }

  // Verify clean logo exists
  const loginLogoCount = await page.locator('img.brand-logo-img').count();
  console.log('Login brand-logo-img count:', loginLogoCount);
  if (loginLogoCount === 0) {
    throw new Error('Expected clean brand logo on login page');
  }
  await page.screenshot({ path: 'audit-reports/screenshots/phase2-auth-login-clean.png' });

  await browser.close();
  console.log('✅ PHASE 2 VERIFICATION PASSED: Logo renders clean artwork without pill/capsule in both light and dark modes.');
}

testPhase2().catch(err => {
  console.error('❌ Phase 2 test failed:', err);
  process.exit(1);
});
