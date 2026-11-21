import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173/#/auth?mode=login');
  await page.fill('#auth-form input[name="email"]', 'suresh_44@gmail.com');
  await page.fill('#auth-form input[name="password"]', 'Password123!');
  await page.click('#auth-form button[type="submit"]');
  await page.waitForTimeout(1000);
  await page.goto('http://localhost:5173/#/parent');
  await page.waitForTimeout(600);
  const pin = page.locator('input[type="password"], input[name="gatePin"]').first();
  if (await pin.count() > 0) {
    await pin.fill('1234');
    await page.click('button:has-text("Unlock")');
    await page.waitForTimeout(1000);
  }
  const tab = page.locator('button[data-action="parent-tab"][data-tab="adventure_settings"]');
  if (await tab.count() > 0) {
    await tab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'audit-reports/screenshots/26-parent-adventure-settings.png', fullPage: true });
    console.log('Saved 26-parent-adventure-settings.png');
  }
  await browser.close();
}
main();
