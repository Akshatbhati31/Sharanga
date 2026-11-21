import { chromium } from '@playwright/test';

async function testPhase1() {
  console.log('🧪 Verifying Phase 1: Launch Instant Demo -> Aanya Sharma Child Dashboard');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Load landing page
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // 2. Click "Launch Instant Demo" or "Launch Interactive Demo"
  const demoBtn = page.locator('button[data-action="launch-demo"]').first();
  console.log('Clicking Launch Instant Demo button...');
  await demoBtn.click();
  await page.waitForTimeout(1000);

  // 3. Verify URL is #/home
  const currentUrl = page.url();
  console.log('Current URL after click:', currentUrl);
  if (!currentUrl.includes('#/home')) {
    throw new Error(`Expected URL to contain '#/home' but got '${currentUrl}'`);
  }

  // 4. Verify Aanya's Dashboard rendered
  const content = await page.content();
  const hasAanya = content.includes('Aanya');
  console.log('Contains Aanya text:', hasAanya);
  if (!hasAanya) {
    throw new Error('Expected child dashboard to display Aanya Sharma');
  }

  // 5. Verify NO PIN gate or parent login rendered
  const hasPinGate = await page.locator('text=Parent Security PIN, text=Parental Control Gate').count();
  console.log('PIN gate count on child dashboard:', hasPinGate);
  if (hasPinGate > 0) {
    throw new Error('Child dashboard incorrectly rendered Parent PIN gate');
  }

  // 6. Test browser refresh
  console.log('Refreshing page to test session persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const refreshedUrl = page.url();
  const refreshedHasAanya = (await page.content()).includes('Aanya');
  console.log('Refreshed URL:', refreshedUrl, 'Has Aanya:', refreshedHasAanya);
  if (!refreshedUrl.includes('#/home') || !refreshedHasAanya) {
    throw new Error('Refreshing page failed to preserve Aanya child dashboard');
  }

  // 7. Test navigating to #/parent (PIN protection intact)
  console.log('Testing navigation to #/parent while in demo child session...');
  await page.goto('http://localhost:5173/#/parent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const pinGateActive = (await page.getByText('Parent Security PIN').count() > 0) || (await page.getByText('Protected Parent Portal').count() > 0) || (await page.getByText('Parental Control Gate').count() > 0);
  console.log('Protected Parent Portal PIN gate displayed:', pinGateActive);
  if (!pinGateActive) {
    throw new Error('Expected Parent Portal to be locked behind PIN gate');
  }

  // 8. Test sign out / return to website
  const returnLink = page.locator('a[data-action="open-website"]').first();
  if (await returnLink.count() > 0) {
    await returnLink.click();
    await page.waitForTimeout(600);
    console.log('Returned to URL:', page.url());
  }

  await browser.close();
  console.log('✅ PHASE 1 VERIFICATION PASSED: Launch Instant Demo opens Aanya Sharma directly, preserves session, and maintains PIN protection.');
}

testPhase1().catch(err => {
  console.error('❌ Phase 1 test failed:', err);
  process.exit(1);
});
